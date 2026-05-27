package com.example.pre.security.identity;

import com.example.pre.service.ReKeyShareException;
import com.example.pre.service.ErrorCode;
import com.example.pre.service.SecurityContext;

import java.time.Instant;
import java.util.Map;

public interface IdentityProviderAdapter {
	record JwksSnapshot(Map<String, String> publicKeys, Instant refreshedAt) {
	}

	record IdentityProviderMetadata(String issuer, String audience, String jwksSource) {
	}

	SecurityContext verify(String bearerToken);

	JwksSnapshot keys();

	IdentityProviderMetadata metadata();

	default SecurityContext validateBearer(String token, String requiredAudience, String requiredScope,
			String tenantId) {
		SecurityContext context = verify(token);
		if (!metadata().audience().equals(requiredAudience) || !context.tenantId().equals(tenantId)) {
			throw new ReKeyShareException(ErrorCode.UNAUTHENTICATED, "identity claim mismatch");
		}
		return context;
	}

	default boolean authenticateProxyCertificate(byte[] peerCertificate, String expectedProxyId) {
		return false;
	}
}
