package com.example.pre.storage.objectstore;

import com.example.pre.crypto.hash.Hash;

import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemoryObjectStore implements ObjectStore {
    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();

    @Override
    public StoredCiphertext putCiphertext(String tenantId, String dataId, byte[] ciphertext) {
        String uri = "memory://" + tenantId + "/" + dataId;
        objects.put(uri, Arrays.copyOf(ciphertext, ciphertext.length));
        return new StoredCiphertext(uri, Hash.sha256Hex(ciphertext), ciphertext.length);
    }

    @Override
    public byte[] getCiphertext(String tenantId, String uri) {
        requireTenant(tenantId, uri);
        byte[] value = objects.get(uri);
        if (value == null) {
            throw new IllegalArgumentException("object not accessible");
        }
        return Arrays.copyOf(value, value.length);
    }

    @Override
    public boolean verifyDigest(String tenantId, String uri, String expectedDigest) {
        return Hash.sha256Hex(getCiphertext(tenantId, uri)).equals(expectedDigest);
    }

    @Override
    public void deleteMarker(String tenantId, String uri) {
        requireTenant(tenantId, uri);
        objects.remove(uri);
    }

    private static void requireTenant(String tenantId, String uri) {
        if (!uri.startsWith("memory://" + tenantId + "/")) {
            throw new IllegalArgumentException("object not accessible");
        }
    }
}
