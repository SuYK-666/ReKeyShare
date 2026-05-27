package com.example.pre.storage.objectstore;

public interface ObjectStore {
	StoredCiphertext putCiphertext(String tenantId, String dataId, byte[] ciphertext);

	byte[] getCiphertext(String tenantId, String uri);

	boolean verifyDigest(String tenantId, String uri, String expectedDigest);

	void deleteMarker(String tenantId, String uri);

	record StoredCiphertext(String uri, String digest, long length) {
	}
}
