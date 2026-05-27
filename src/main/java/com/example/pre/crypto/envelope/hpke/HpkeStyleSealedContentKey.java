package com.example.pre.crypto.envelope.hpke;

public record HpkeStyleSealedContentKey(HpkeStyleEnvelopeHeader header, byte[] encapsulatedPublicKey, byte[] ciphertext,
		byte[] nonce, String headerHash) {
}
