package com.example.pre.storage;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class JdbcProofReplayRepositoryTest {
	@Test
	void consumesProofOnceConcurrentlyAndAfterRestart() throws Exception {
		Path database = Path.of("target", "jdbc-test", "proof-replay-" + java.util.UUID.randomUUID());
		Files.createDirectories(database.getParent());
		String url = "jdbc:h2:file:" + database.toAbsolutePath() + ";DB_CLOSE_DELAY=0";
		JdbcProofReplayRepository first = new JdbcProofReplayRepository(url, "sa", "");
		Instant expiresAt = Instant.now().plusSeconds(900);
		var executor = Executors.newFixedThreadPool(20);
		try {
			var outcomes = new ArrayList<Future<Boolean>>();
			for (int index = 0; index < 100; index++) {
				outcomes.add(executor.submit(
						() -> first.consume("tenant-a", "proxy-a", "key-a", 1, "nonce-a", "hash-a", expiresAt)));
			}
			int accepted = 0;
			for (Future<Boolean> outcome : outcomes) {
				if (outcome.get()) {
					accepted++;
				}
			}
			assertEquals(1, accepted);
		} finally {
			executor.shutdownNow();
		}
		JdbcProofReplayRepository restarted = new JdbcProofReplayRepository(url, "sa", "");
		assertFalse(restarted.consume("tenant-a", "proxy-a", "key-a", 1, "nonce-a", "hash-a", expiresAt));
	}
}
