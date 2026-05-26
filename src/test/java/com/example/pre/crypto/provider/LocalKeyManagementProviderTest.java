package com.example.pre.crypto.provider;

import com.example.pre.util.Bytes;
import com.example.pre.util.SecureRandomUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalKeyManagementProviderTest {
    @Test
    void signsWrapsRestartsAndRevokesLocalKey(@TempDir Path directory) {
        Path store = directory.resolve("keys.properties");
        LocalKeyManagementProvider first = new LocalKeyManagementProvider(store);
        String keyId = first.rotateKey("proof-signing");
        byte[] payload = Bytes.utf8("bound-payload");
        byte[] signature = first.sign(keyId, payload);
        byte[] dek = SecureRandomUtil.randomBytes(32);
        byte[] wrapped = first.wrapKey(keyId, dek, Bytes.utf8("tenant-a"));

        LocalKeyManagementProvider restarted = new LocalKeyManagementProvider(store);
        assertTrue(restarted.verify(keyId, payload, signature));
        assertArrayEquals(dek, restarted.unwrapKey(keyId, wrapped, Bytes.utf8("tenant-a")));
        assertThrows(IllegalArgumentException.class,
                () -> restarted.unwrapKey(keyId, wrapped, Bytes.utf8("tenant-b")));
        restarted.revokeKey(keyId);
        assertThrows(IllegalStateException.class, () -> restarted.sign(keyId, payload));
    }
}
