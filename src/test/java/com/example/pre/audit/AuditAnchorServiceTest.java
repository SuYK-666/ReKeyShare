package com.example.pre.audit;

import com.example.pre.model.AuditEvent;
import com.example.pre.service.AuditAnchorService;
import com.example.pre.service.AuditProofService;
import com.example.pre.storage.InMemoryAuditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuditAnchorServiceTest {
    @Test
    void appendsSignedCheckpointsAndDetectsDifferentLocalRoot(@TempDir Path directory) throws Exception {
        Path log = directory.resolve("anchor.log");
        AuditProofService proofs = new AuditProofService();
        AuditAnchorService anchor = new AuditAnchorService(proofs, log);
        InMemoryAuditRepository audit = new InMemoryAuditRepository();
        audit.record(new AuditEvent(Instant.now(), "alice", "UPLOAD", "data", true, "ok").withTenant("tenant-a"));
        var first = anchor.anchor(audit.findAll());
        assertTrue(proofs.verifyProof(first));
        audit.record(new AuditEvent(Instant.now(), "proxy", "REENCRYPT", "pkg", true, "ok").withTenant("tenant-a"));
        var second = anchor.anchor(audit.findAll());
        assertTrue(proofs.verifyProof(second));
        assertEquals(2, Files.readAllLines(log).size());
        assertTrue(!first.chainRoot().equals(second.chainRoot()));
    }
}
