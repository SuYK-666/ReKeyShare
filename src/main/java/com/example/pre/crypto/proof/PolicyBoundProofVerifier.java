package com.example.pre.crypto.proof;

import com.example.pre.storage.ProofReplayRepository;

import java.security.GeneralSecurityException;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;

public final class PolicyBoundProofVerifier {
    public enum Decision {
        ACCEPT, PROOF_CONTEXT_MISMATCH, PROOF_EXPIRED, PROOF_SIGNER_UNKNOWN,
        PROOF_SIGNER_REVOKED, PROOF_SIGNATURE_INVALID, PROOF_REPLAY_DETECTED
    }

    private final ProxySigningKeyRegistry keys;
    private final ProofReplayRepository replayRepository;
    private final ProofPayloadCanonicalizer canonicalizer = new ProofPayloadCanonicalizer();

    public PolicyBoundProofVerifier(ProxySigningKeyRegistry keys, ProofReplayRepository replayRepository) {
        this.keys = keys;
        this.replayRepository = replayRepository;
    }

    public Decision verify(PolicyBoundConversionProof proof, Instant now, boolean consumeNonce) {
        if (proof == null || proof.expiresAt().isBefore(now) || proof.issuedAt().isAfter(now.plusSeconds(30))) {
            return Decision.PROOF_EXPIRED;
        }
        String expectedHash;
        try {
            expectedHash = canonicalizer.digest(proof);
        } catch (IllegalArgumentException e) {
            return Decision.PROOF_CONTEXT_MISMATCH;
        }
        if (!expectedHash.equals(proof.canonicalPayloadHash())) {
            return Decision.PROOF_CONTEXT_MISMATCH;
        }
        ProxySigningKeyRecord key = keys.findForVerification(proof.proxyId(), proof.keyId());
        if (key == null || key.keyEpoch() != proof.keyEpoch()) {
            return Decision.PROOF_SIGNER_UNKNOWN;
        }
        if (key.status() == ProxySigningKeyRecord.Status.REVOKED) {
            return Decision.PROOF_SIGNER_REVOKED;
        }
        if (!key.usableForNewProof(proof.issuedAt())) {
            return Decision.PROOF_EXPIRED;
        }
        try {
            Signature verifier = Signature.getInstance("Ed25519");
            verifier.initVerify(key.publicKey());
            verifier.update(canonicalizer.canonicalBytes(proof));
            if (!verifier.verify(Base64.getDecoder().decode(proof.signature()))) {
                return Decision.PROOF_SIGNATURE_INVALID;
            }
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return Decision.PROOF_SIGNATURE_INVALID;
        }
        if (consumeNonce && !replayRepository.consume(proof.tenantId(), proof.proxyId(), proof.keyId(),
                proof.keyEpoch(), proof.proofNonce(), proof.canonicalPayloadHash(), proof.expiresAt())) {
            return Decision.PROOF_REPLAY_DETECTED;
        }
        return Decision.ACCEPT;
    }
}
