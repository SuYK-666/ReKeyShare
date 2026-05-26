package com.example.pre.crypto.envelope.hpke;

import java.security.PublicKey;
import java.time.Instant;

public record HpkeStyleEnvelopeSealRequest(
        byte[] contentKey,
        PublicKey recipientPublicKey,
        String recipientKeyId,
        String tenantId,
        String dataId,
        String recipientId,
        String policyHash,
        int contentKeyVersion,
        Instant createdAt
) {
}
