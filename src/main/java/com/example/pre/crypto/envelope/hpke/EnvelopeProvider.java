package com.example.pre.crypto.envelope.hpke;

public interface EnvelopeProvider {
	HpkeStyleSealedContentKey seal(HpkeStyleEnvelopeSealRequest request);

	byte[] open(HpkeStyleEnvelopeOpenRequest request);

	boolean verifyHeader(HpkeStyleSealedContentKey sealedKey, HpkeStyleEnvelopeOpenRequest expectedContext);
}
