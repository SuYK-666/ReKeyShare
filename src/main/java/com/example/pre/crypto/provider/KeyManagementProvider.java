package com.example.pre.crypto.provider;

import java.security.PublicKey;

public interface KeyManagementProvider {
	byte[] sign(String keyId, byte[] payload);

	boolean verify(String keyId, byte[] payload, byte[] signature);

	byte[] wrapKey(String keyId, byte[] dataKey, byte[] aad);

	byte[] unwrapKey(String keyId, byte[] wrappedKey, byte[] aad);

	PublicKey getPublicKey(String keyId);

	String rotateKey(String purpose);
}
