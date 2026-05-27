package com.example.pre.crypto.ecc;

import java.time.Instant;
import com.example.pre.util.SecureRandomUtil;

public record ReKeySessionContext(String sessionId, Instant createdAt) {
	public static ReKeySessionContext create() {
		return new ReKeySessionContext(SecureRandomUtil.randomId(), Instant.now());
	}
}
