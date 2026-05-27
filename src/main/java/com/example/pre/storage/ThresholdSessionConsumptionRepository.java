package com.example.pre.storage;

import java.time.Instant;

public interface ThresholdSessionConsumptionRepository {
	boolean isConsumed(String tenantId, String sessionId);

	boolean consume(String tenantId, String sessionId, String contextHash, Instant consumedAt);
}
