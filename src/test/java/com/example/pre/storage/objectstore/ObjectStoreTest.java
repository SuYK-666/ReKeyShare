package com.example.pre.storage.objectstore;

import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ObjectStoreTest {
    @Test
    void separatesCiphertextBlobMetadataAndRejectsCrossTenantReads() {
        InMemoryObjectStore store = new InMemoryObjectStore();
        var stored = store.putCiphertext("tenant-a", "data-a", Bytes.utf8("ciphertext"));
        assertTrue(store.verifyDigest("tenant-a", stored.uri(), stored.digest()));
        assertFalse(store.verifyDigest("tenant-a", stored.uri(), "bad-digest"));
        assertThrows(IllegalArgumentException.class, () -> store.getCiphertext("tenant-b", stored.uri()));
    }
}
