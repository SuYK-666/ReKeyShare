package com.example.pre.storage;

import com.example.pre.service.IdempotencyService;
import com.example.pre.service.ReKeyShareException;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JdbcIdempotencyRepositoryTest {
	@Test
	void preservesResponseAfterRestartAndPreventsConcurrentDuplicateEffects() throws Exception {
		Path database = Path.of("target", "jdbc-test", "idempotency-" + java.util.UUID.randomUUID());
		Files.createDirectories(database.getParent());
		String url = "jdbc:h2:file:" + database.toAbsolutePath() + ";DB_CLOSE_DELAY=0";
		AtomicInteger mutations = new AtomicInteger();
		IdempotencyService first = new IdempotencyService(Duration.ofHours(1),
				new JdbcIdempotencyRepository(url, "sa", ""));
		assertEquals("package-1", first.execute("key-1", "alice", "REENCRYPT", "grant-1", "same",
				() -> "package-" + mutations.incrementAndGet()));

		IdempotencyService restarted = new IdempotencyService(Duration.ofHours(1),
				new JdbcIdempotencyRepository(url, "sa", ""));
		assertEquals("package-1", restarted.execute("key-1", "alice", "REENCRYPT", "grant-1", "same",
				() -> "package-" + mutations.incrementAndGet()));
		assertEquals(1, mutations.get());
		assertThrows(ReKeyShareException.class,
				() -> restarted.execute("key-1", "alice", "REENCRYPT", "grant-1", "different", () -> "bad"));

		var executor = Executors.newFixedThreadPool(20);
		try {
			var results = new ArrayList<Future<String>>();
			for (int i = 0; i < 20; i++) {
				results.add(executor.submit(() -> {
					try {
						return restarted.execute("key-2", "alice", "REENCRYPT", "grant-2", "same",
								() -> "package-" + mutations.incrementAndGet());
					} catch (ReKeyShareException inProgress) {
						return "in-progress";
					}
				}));
			}
			long successfulResult = 0;
			for (Future<String> result : results) {
				if (!"in-progress".equals(result.get())) {
					successfulResult++;
				}
			}
			assertEquals(20, successfulResult);
			assertEquals(2, mutations.get());
		} finally {
			executor.shutdownNow();
		}
	}
}
