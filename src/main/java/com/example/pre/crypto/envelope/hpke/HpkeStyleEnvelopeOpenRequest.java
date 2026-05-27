package com.example.pre.crypto.envelope.hpke;

import java.security.PrivateKey;

public record HpkeStyleEnvelopeOpenRequest(HpkeStyleSealedContentKey sealedKey, PrivateKey recipientPrivateKey,
		String tenantId, String dataId, String recipientId, String policyHash, int contentKeyVersion) {
}
