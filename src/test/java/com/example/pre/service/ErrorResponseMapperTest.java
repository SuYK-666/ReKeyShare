package com.example.pre.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ErrorResponseMapperTest {
	@Test
	void mapsInvisibleObjectsToOneStableExternalClass() {
		Clock fixedClock = Clock.fixed(Instant.parse("2026-05-27T02:52:26Z"), ZoneOffset.UTC);
		ErrorResponseMapper mapper = new ErrorResponseMapper(fixedClock);
		assertEquals(ErrorCode.ACCESS_DENIED, mapper.externalCode(ErrorCode.DATA_NOT_FOUND));
		assertEquals(ErrorCode.ACCESS_DENIED, mapper.externalCode(ErrorCode.GRANT_NOT_FOUND));
		assertEquals(ErrorCode.ACCESS_DENIED, mapper.externalCode(ErrorCode.PACKAGE_NOT_FOUND));
		assertEquals(mapper.json(ErrorCode.ACCESS_DENIED, "same-id"),
				mapper.json(mapper.externalCode(ErrorCode.PACKAGE_NOT_FOUND), "same-id"));
		assertFalse(mapper.json(ErrorCode.ACCESS_DENIED, "request").contains("PACKAGE_NOT_FOUND"));
		assertEquals(403, mapper.status(ErrorCode.IDEMPOTENCY_CONFLICT));
		assertEquals(413, mapper.status(ErrorCode.PAYLOAD_TOO_LARGE));
	}
}
