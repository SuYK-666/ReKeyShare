package com.example.pre.crypto.envelope.hpke;

import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EnvelopeProviderNegativeTest {
	private final HpkeStyleEnvelopeProvider provider = new HpkeStyleEnvelopeProvider();

	@Test
	void validRecipientOpensButWrongRecipientAndContextAreRejected() {
		var bob = HpkeStyleEnvelopeProvider.recipientKeyPair();
		var mallory = HpkeStyleEnvelopeProvider.recipientKeyPair();
		byte[] dek = Bytes.utf8("content-key-fixture-32-bytes-long");
		var sealed = provider.seal(new HpkeStyleEnvelopeSealRequest(dek, bob.getPublic(), "bob-key-7", "tenant-a",
				"data-a", "bob", "policy-a", 7, Instant.parse("2026-05-26T10:00:00Z")));
		assertArrayEquals(dek, provider.open(open(sealed, bob.getPrivate(), "tenant-a", "policy-a", 7)));
		assertThrows(IllegalArgumentException.class,
				() -> provider.open(open(sealed, mallory.getPrivate(), "tenant-a", "policy-a", 7)));
		assertThrows(IllegalArgumentException.class,
				() -> provider.open(open(sealed, bob.getPrivate(), "tenant-b", "policy-a", 7)));
		assertThrows(IllegalArgumentException.class,
				() -> provider.open(open(sealed, bob.getPrivate(), "tenant-a", "policy-b", 7)));
		assertThrows(IllegalArgumentException.class,
				() -> provider.open(open(sealed, bob.getPrivate(), "tenant-a", "policy-a", 6)));
	}

	@Test
	void tamperedHeaderAndSuiteConfusionAreRejected() {
		var bob = HpkeStyleEnvelopeProvider.recipientKeyPair();
		var sealed = provider.seal(new HpkeStyleEnvelopeSealRequest(Bytes.utf8("dek"), bob.getPublic(), "bob-key",
				"tenant-a", "data-a", "bob", "policy-a", 1, Instant.parse("2026-05-26T10:00:00Z")));
		var h = sealed.header();
		var wrongSuite = new HpkeStyleEnvelopeHeader(h.envelopeVersion(), "POLICY_BOUND_PRE_V1", h.kemId(), h.kdfId(),
				h.aeadId(), h.recipientKeyId(), h.tenantId(), h.dataId(), h.recipientId(), h.policyHash(),
				h.contentKeyVersion(), h.createdAt(), h.aadHash());
		var tampered = new HpkeStyleSealedContentKey(wrongSuite, sealed.encapsulatedPublicKey(), sealed.ciphertext(),
				sealed.nonce(), sealed.headerHash());
		assertThrows(IllegalArgumentException.class,
				() -> provider.open(open(tampered, bob.getPrivate(), "tenant-a", "policy-a", 1)));
	}

	private static HpkeStyleEnvelopeOpenRequest open(HpkeStyleSealedContentKey sealed, java.security.PrivateKey key,
			String tenant, String policy, int version) {
		return new HpkeStyleEnvelopeOpenRequest(sealed, key, tenant, "data-a", "bob", policy, version);
	}
}
