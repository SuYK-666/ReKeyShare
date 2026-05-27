package com.example.pre.service;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.crypto.threshold.SignedThresholdShareV2;
import com.example.pre.crypto.threshold.ThresholdReKeyShare;
import com.example.pre.crypto.threshold.ThresholdSecretSharing;
import com.example.pre.crypto.threshold.ThresholdSession;
import com.example.pre.crypto.threshold.ThresholdTranscript;
import com.example.pre.util.Bytes;
import com.example.pre.storage.InMemoryThresholdSessionConsumptionRepository;
import com.example.pre.storage.ThresholdSessionConsumptionRepository;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ThresholdSessionService {
	private final Map<String, KeyPair> members = new HashMap<>();
	private final ThresholdSessionConsumptionRepository consumedSessions;

	public ThresholdSessionService() {
		this(new InMemoryThresholdSessionConsumptionRepository());
	}

	public ThresholdSessionService(ThresholdSessionConsumptionRepository consumedSessions) {
		this.consumedSessions = consumedSessions;
	}

	public List<ThresholdReKeyShare> distribute(byte[] material, ThresholdSession session, List<String> proxyIds) {
		if (proxyIds.size() != session.totalN() || new HashSet<>(proxyIds).size() != proxyIds.size()) {
			throw new IllegalArgumentException("proxy assignments do not match threshold session");
		}
		proxyIds.forEach(id -> members.computeIfAbsent(id, ignored -> keyPair()));
		return ThresholdSecretSharing.split(material, session.thresholdK(), session.totalN());
	}

	public SignedThresholdShareV2 sign(ThresholdSession session, String proxyId, ThresholdReKeyShare share) {
		KeyPair key = members.get(proxyId);
		if (key == null) {
			throw new ReKeyShareException(ErrorCode.THRESHOLD_SHARE_INVALID, "proxy is not a group member");
		}
		String contextHash = contextHash(session);
		String digest = shareDigest(session, proxyId, share, contextHash);
		return new SignedThresholdShareV2(session.sessionId(), session.grantId(), session.recipientId(),
				session.policyHash(), session.contentKeyVersion(), session.capsuleHash(), session.proxyGroupId(),
				session.epoch(), proxyId, share, digest, contextHash, "Ed25519", sign(key, digest));
	}

	public ThresholdTranscript aggregate(ThresholdSession session, List<SignedThresholdShareV2> submissions,
			Instant now) {
		if (!session.activeAt(now) || consumedSessions.isConsumed(session.tenantId(), session.sessionId())) {
			throw new ReKeyShareException(ErrorCode.THRESHOLD_SHARE_INVALID, "expired or replayed threshold session");
		}
		Set<String> proxyIds = new HashSet<>();
		List<ThresholdReKeyShare> shares = new ArrayList<>();
		for (SignedThresholdShareV2 submission : submissions) {
			if (!proxyIds.add(submission.proxyId()) || !verify(session, submission)) {
				throw new ReKeyShareException(ErrorCode.THRESHOLD_SHARE_INVALID, "threshold context/signature invalid");
			}
			shares.add(submission.share());
		}
		byte[] aggregate;
		try {
			aggregate = ThresholdSecretSharing.combine(shares);
		} catch (IllegalArgumentException e) {
			throw new ReKeyShareException(ErrorCode.THRESHOLD_NOT_REACHED, "threshold has not been reached");
		}
		List<String> ids = submissions.stream().map(SignedThresholdShareV2::proxyId).sorted().toList();
		List<String> digests = submissions.stream().map(SignedThresholdShareV2::shareDigest).sorted().toList();
		String aggregateHash = Hash.sha256Hex(aggregate);
		String transcriptHash = ThresholdTranscriptVerifier.hash(session.sessionId(), contextHash(session), ids,
				digests, aggregateHash, now);
		if (!consumedSessions.consume(session.tenantId(), session.sessionId(), contextHash(session), now)) {
			throw new ReKeyShareException(ErrorCode.THRESHOLD_SHARE_INVALID, "replayed threshold session");
		}
		return new ThresholdTranscript(session.sessionId(), contextHash(session), ids, digests, aggregateHash,
				transcriptHash, now);
	}

	public boolean verify(ThresholdSession session, SignedThresholdShareV2 signed) {
		if (!signed.sessionId().equals(session.sessionId()) || !signed.grantId().equals(session.grantId())
				|| !signed.recipientId().equals(session.recipientId())
				|| !signed.policyHash().equals(session.policyHash())
				|| signed.contentKeyVersion() != session.contentKeyVersion()
				|| !signed.capsuleHash().equals(session.capsuleHash())
				|| !signed.proxyGroupId().equals(session.proxyGroupId()) || signed.epoch() != session.epoch()
				|| !signed.contextHash().equals(contextHash(session)) || !signed.shareDigest()
						.equals(shareDigest(session, signed.proxyId(), signed.share(), signed.contextHash()))) {
			return false;
		}
		KeyPair key = members.get(signed.proxyId());
		if (key == null || !"Ed25519".equals(signed.signatureAlgorithm())) {
			return false;
		}
		try {
			Signature verifier = Signature.getInstance("Ed25519");
			verifier.initVerify(key.getPublic());
			verifier.update(signed.shareDigest().getBytes(StandardCharsets.UTF_8));
			return verifier.verify(Base64.getDecoder().decode(signed.signature()));
		} catch (GeneralSecurityException | IllegalArgumentException e) {
			return false;
		}
	}

	private static String contextHash(ThresholdSession session) {
		return Hash.sha256Hex(
				String.join("|", session.sessionId(), session.tenantId(), session.dataId(), session.grantId(),
						session.recipientId(), session.policyHash(), Integer.toString(session.contentKeyVersion()),
						session.capsuleHash(), session.proxyGroupId(), Long.toString(session.epoch())));
	}

	private static String shareDigest(ThresholdSession session, String proxyId, ThresholdReKeyShare share,
			String contextHash) {
		return Hash.sha256Hex(Bytes.concat(
				Bytes.utf8(String.join("|", "threshold-share-v2", proxyId, contextHash, Integer.toString(share.index()),
						Integer.toString(share.threshold()), Integer.toString(share.totalShares()))),
				share.value()));
	}

	private static String sign(KeyPair pair, String digest) {
		try {
			Signature signer = Signature.getInstance("Ed25519");
			signer.initSign(pair.getPrivate());
			signer.update(digest.getBytes(StandardCharsets.UTF_8));
			return Base64.getEncoder().encodeToString(signer.sign());
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("cannot sign threshold share", e);
		}
	}

	private static KeyPair keyPair() {
		try {
			return KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("Ed25519 unavailable", e);
		}
	}
}
