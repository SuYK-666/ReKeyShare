package com.example.pre.storage;

import java.time.Instant;

/**
 * Consumes a verified formal proof once. Implementations must make duplicate
 * consumption atomic across concurrent verification requests.
 */
public interface ProofReplayRepository {
	boolean consume(String tenantId, String proxyId, String keyId, long keyEpoch, String proofNonce,
			String canonicalPayloadHash, Instant expiresAt);

	default void purgeExpired(Instant now) {
	}
}
