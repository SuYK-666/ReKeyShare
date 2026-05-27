package com.example.pre.crypto.threshold;

import com.example.pre.service.ErrorCode;
import com.example.pre.service.ReKeyShareException;
import com.example.pre.service.ThresholdSessionService;
import com.example.pre.service.ThresholdTranscriptVerifier;
import com.example.pre.storage.JdbcThresholdSessionConsumptionRepository;
import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ThresholdContextBindingTest {
	private final Instant created = Instant.parse("2026-05-26T10:00:00Z");

	@Test
	void quorumCreatesOfflineVerifiableTranscriptAndRejectsReplay() {
		ThresholdSessionService service = new ThresholdSessionService();
		ThresholdSession session = session("recipient-a", "policy-a", 3);
		List<ThresholdReKeyShare> split = service.distribute(Bytes.utf8("re-key-material"), session,
				List.of("p1", "p2", "p3"));
		var first = service.sign(session, "p1", split.get(0));
		var second = service.sign(session, "p2", split.get(1));
		ThresholdTranscript transcript = service.aggregate(session, List.of(first, second), created.plusSeconds(1));
		assertTrue(new ThresholdTranscriptVerifier().verify(transcript));
		assertEquals(ErrorCode.THRESHOLD_SHARE_INVALID, assertThrows(ReKeyShareException.class,
				() -> service.aggregate(session, List.of(first, second), created.plusSeconds(2))).code());
	}

	@Test
	void rejectsInsufficientDuplicateAndWrongContextShares() {
		ThresholdSessionService service = new ThresholdSessionService();
		ThresholdSession session = session("recipient-a", "policy-a", 3);
		List<ThresholdReKeyShare> split = service.distribute(Bytes.utf8("re-key-material"), session,
				List.of("p1", "p2", "p3"));
		var first = service.sign(session, "p1", split.get(0));
		assertEquals(ErrorCode.THRESHOLD_NOT_REACHED, assertThrows(ReKeyShareException.class,
				() -> service.aggregate(session, List.of(first), created.plusSeconds(1))).code());
		var second = service.sign(session, "p2", split.get(1));
		assertTrue(new ThresholdTranscriptVerifier()
				.verify(service.aggregate(session, List.of(first, second), created.plusSeconds(2))));

		ThresholdSessionService duplicateService = new ThresholdSessionService();
		var split2 = duplicateService.distribute(Bytes.utf8("re-key-material"), session, List.of("p1", "p2", "p3"));
		var duplicate = duplicateService.sign(session, "p1", split2.get(0));
		assertEquals(ErrorCode.THRESHOLD_SHARE_INVALID, assertThrows(ReKeyShareException.class,
				() -> duplicateService.aggregate(session, List.of(duplicate, duplicate), created.plusSeconds(1)))
				.code());

		assertFalse(duplicateService.verify(session("recipient-b", "policy-a", 3), duplicate));
		assertFalse(duplicateService.verify(session("recipient-a", "policy-b", 3), duplicate));
		assertFalse(duplicateService.verify(session("recipient-a", "policy-a", 4), duplicate));
	}

	@Test
	void durableConsumptionRejectsSessionReplayAfterAggregatorRestart() {
		String url = "jdbc:h2:file:"
				+ Path.of("target", "jdbc-test", "threshold-" + java.util.UUID.randomUUID()).toAbsolutePath()
				+ ";DB_CLOSE_DELAY=0";
		ThresholdSessionService first = new ThresholdSessionService(
				new JdbcThresholdSessionConsumptionRepository(url, "sa", ""));
		ThresholdSession session = session("recipient-a", "policy-a", 3);
		List<ThresholdReKeyShare> split = first.distribute(Bytes.utf8("re-key-material"), session,
				List.of("p1", "p2", "p3"));
		var one = first.sign(session, "p1", split.get(0));
		var two = first.sign(session, "p2", split.get(1));
		first.aggregate(session, List.of(one, two), created.plusSeconds(1));

		ThresholdSessionService restarted = new ThresholdSessionService(
				new JdbcThresholdSessionConsumptionRepository(url, "sa", ""));
		assertEquals(ErrorCode.THRESHOLD_SHARE_INVALID, assertThrows(ReKeyShareException.class,
				() -> restarted.aggregate(session, List.of(one, two), created.plusSeconds(2))).code());
	}

	private ThresholdSession session(String recipient, String policy, long epoch) {
		return new ThresholdSession("session-a", "tenant-a", "data-a", "grant-a", recipient, policy, 7, "capsule-a",
				"group-a", 2, 3, epoch, created, created.plusSeconds(300));
	}
}
