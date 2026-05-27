package com.example.pre.storage;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

public final class InMemoryThresholdSessionConsumptionRepository implements ThresholdSessionConsumptionRepository {
	private final Set<String> consumed = new HashSet<>();

	@Override
	public synchronized boolean isConsumed(String tenantId, String sessionId) {
		return consumed.contains(tenantId + "|" + sessionId);
	}

	@Override
	public synchronized boolean consume(String tenantId, String sessionId, String contextHash, Instant consumedAt) {
		return consumed.add(tenantId + "|" + sessionId);
	}
}
