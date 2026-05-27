package com.example.pre.crypto.threshold;

import java.time.Instant;

public record ThresholdSession(String sessionId, String tenantId, String dataId, String grantId, String recipientId,
		String policyHash, int contentKeyVersion, String capsuleHash, String proxyGroupId, int thresholdK, int totalN,
		long epoch, Instant createdAt, Instant expiresAt) {
	public boolean activeAt(Instant now) {
		return !now.isBefore(createdAt) && now.isBefore(expiresAt);
	}
}
