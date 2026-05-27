package com.example.pre.service;

import java.time.Clock;
import java.time.Instant;

/**
 * Stable wire-level error classification. Internal service reasons remain
 * available to audit.
 */
public final class ErrorResponseMapper {
	private final Clock clock;

	public ErrorResponseMapper() {
		this(Clock.systemUTC());
	}

	public ErrorResponseMapper(Clock clock) {
		this.clock = clock;
	}

	public ErrorCode externalCode(ErrorCode internal) {
		return switch (internal) {
			case DATA_NOT_FOUND, GRANT_NOT_FOUND, PACKAGE_NOT_FOUND, ACCESS_DENIED -> ErrorCode.ACCESS_DENIED;
			default -> internal;
		};
	}

	public int status(ErrorCode code) {
		return switch (code) {
			case UNAUTHENTICATED -> 401;
			case ACCESS_DENIED, GRANT_REVOKED, GRANT_EXPIRED, GRANT_ROTATED, POLICY_VIOLATION,
					CRYPTO_PROFILE_NOT_ALLOWED, DEMO_ONLY_API_DISABLED, PROXY_INACTIVE, PROXY_QUOTA_EXCEEDED,
					SCHEME_NOT_ALLOWED, KEY_REVOKED, KEY_EXPIRED, IDEMPOTENCY_CONFLICT ->
				403;
			case PAYLOAD_TOO_LARGE -> 413;
			case RATE_LIMITED -> 429;
			default -> 400;
		};
	}

	public String message(ErrorCode external) {
		return switch (external) {
			case ACCESS_DENIED -> "object is not accessible";
			case UNAUTHENTICATED -> "authentication required";
			case RATE_LIMITED -> "request rate limit exceeded";
			default -> external.name();
		};
	}

	public String json(ErrorCode external, String requestId) {
		return "{\"success\":false,\"errorCode\":\"" + external.name() + "\",\"code\":\"" + external.name()
				+ "\",\"message\":\"" + message(external) + "\",\"traceId\":\"" + requestId + "\",\"requestId\":\""
				+ requestId + "\",\"eventId\":\"err-" + requestId + "\",\"timestamp\":\"" + Instant.now(clock)
				+ "\"}";
	}
}
