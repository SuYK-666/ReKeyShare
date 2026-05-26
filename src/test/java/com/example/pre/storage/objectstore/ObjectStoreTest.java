package com.example.pre.storage.objectstore;

import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

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

    @Test
    void fileStoreSurvivesRestartAndRejectsTraversal(@TempDir Path directory) {
        FileObjectStore first = new FileObjectStore(directory);
        var stored = first.putCiphertext("tenant-a", "data-a", Bytes.utf8("durable-ciphertext"));
        FileObjectStore restarted = new FileObjectStore(directory);
        assertTrue(restarted.verifyDigest("tenant-a", stored.uri(), stored.digest()));
        assertThrows(IllegalArgumentException.class,
                () -> restarted.putCiphertext("tenant-a", "../escaped", Bytes.utf8("bad")));
        assertThrows(IllegalArgumentException.class, () -> restarted.getCiphertext("tenant-b", stored.uri()));
        restarted.deleteMarker("tenant-a", stored.uri());
    }
}
