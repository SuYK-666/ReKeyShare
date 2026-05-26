package com.example.pre.crypto.envelope.hpke;

import java.time.Instant;

public record HpkeStyleEnvelopeHeader(
        String envelopeVersion,
        String algorithmSuite,
        String kemId,
        String kdfId,
        String aeadId,
        String recipientKeyId,
        String tenantId,
        String dataId,
        String recipientId,
        String policyHash,
        int contentKeyVersion,
        Instant createdAt,
        String aadHash
) {
}
