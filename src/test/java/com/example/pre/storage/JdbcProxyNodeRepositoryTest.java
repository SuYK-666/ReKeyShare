package com.example.pre.storage;

import com.example.pre.model.AlgorithmType;
import com.example.pre.model.ProxyNode;
import com.example.pre.model.ProxyNodeStatus;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JdbcProxyNodeRepositoryTest {
    @Test
    void preservesRevocationAndConsumedQuotaAcrossRepositoryRestart() {
        String url = "jdbc:h2:file:" + Path.of("target", "jdbc-test",
                "proxy-" + java.util.UUID.randomUUID()).toAbsolutePath() + ";DB_CLOSE_DELAY=0";
        JdbcProxyNodeRepository first = new JdbcProxyNodeRepository(url, "sa", "");
        first.save(ProxyNode.active("quota-node", "fingerprint", Set.of("tenant-a"),
                Set.of(AlgorithmType.SECURE_ENVELOPE), 1));
        assertTrue(first.consumeUse("quota-node"));

        JdbcProxyNodeRepository restarted = new JdbcProxyNodeRepository(url, "sa", "");
        assertFalse(restarted.consumeUse("quota-node"));
        ProxyNode current = restarted.findById("quota-node").orElseThrow();
        restarted.save(current.revoke());

        JdbcProxyNodeRepository restartedAgain = new JdbcProxyNodeRepository(url, "sa", "");
        assertEquals(ProxyNodeStatus.REVOKED, restartedAgain.findById("quota-node").orElseThrow().status());
        assertFalse(restartedAgain.consumeUse("quota-node"));
    }
}
