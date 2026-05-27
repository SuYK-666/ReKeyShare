package com.example.pre.storage;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public final class InMemoryProofReplayRepository implements ProofReplayRepository {
	private final Map<String, Instant> consumed = new HashMap<>();

	@Override
	public synchronized boolean consume(String tenantId, String proxyId, String keyId, long keyEpoch, String proofNonce,
			String canonicalPayloadHash, Instant expiresAt) {
		return consumed.putIfAbsent(key(tenantId, proxyId, keyId, keyEpoch, proofNonce, canonicalPayloadHash),
				expiresAt) == null;
	}

	@Override
	public synchronized void purgeExpired(Instant now) {
		consumed.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
	}

	private static String key(String tenantId, String proxyId, String keyId, long keyEpoch, String proofNonce,
			String canonicalPayloadHash) {
		return String.join("|", tenantId, proxyId, keyId, Long.toString(keyEpoch), proofNonce, canonicalPayloadHash);
	}
}
