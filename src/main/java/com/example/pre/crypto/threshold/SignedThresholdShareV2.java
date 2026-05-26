package com.example.pre.crypto.threshold;

public record SignedThresholdShareV2(
        String sessionId,
        String grantId,
        String recipientId,
        String policyHash,
        int contentKeyVersion,
        String capsuleHash,
        String proxyGroupId,
        long epoch,
        String proxyId,
        ThresholdReKeyShare share,
        String shareDigest,
        String contextHash,
        String signatureAlgorithm,
        String signature
) {
}
