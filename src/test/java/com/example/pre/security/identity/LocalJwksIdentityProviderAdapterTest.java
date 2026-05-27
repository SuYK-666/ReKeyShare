package com.example.pre.security.identity;

import com.example.pre.model.UserRole;
import com.example.pre.service.ErrorCode;
import com.example.pre.service.ReKeyShareException;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LocalJwksIdentityProviderAdapterTest {
	@Test
	void acceptsKnownKidAndRejectsUnknownExpiredIssuerAudienceAndMissingTenant() throws Exception {
		KeyPair trusted = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
		KeyPair rotated = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
		LocalJwksIdentityProviderAdapter adapter = new LocalJwksIdentityProviderAdapter("https://issuer.local",
				"rekeyshare-api", Map.of("kid-1", trusted.getPublic()));
		String valid = token(trusted, "kid-1", "https://issuer.local", "rekeyshare-api", "tenant-a",
				Instant.now().plusSeconds(60));
		assertEquals("tenant-a", adapter.verify(valid).tenantId());
		assertRejected(adapter, token(rotated, "kid-2", "https://issuer.local", "rekeyshare-api", "tenant-a",
				Instant.now().plusSeconds(60)));
		assertRejected(adapter, token(trusted, "kid-1", "https://issuer.local", "rekeyshare-api", "tenant-a",
				Instant.now().minusSeconds(1)));
		assertRejected(adapter,
				token(trusted, "kid-1", "wrong", "rekeyshare-api", "tenant-a", Instant.now().plusSeconds(60)));
		assertRejected(adapter,
				token(trusted, "kid-1", "https://issuer.local", "wrong", "tenant-a", Instant.now().plusSeconds(60)));
		assertRejected(adapter,
				token(trusted, "kid-1", "https://issuer.local", "rekeyshare-api", "", Instant.now().plusSeconds(60)));

		LocalJwksIdentityProviderAdapter rotatedAdapter = new LocalJwksIdentityProviderAdapter("https://issuer.local",
				"rekeyshare-api", Map.of("kid-2", rotated.getPublic()));
		assertEquals("tenant-a", rotatedAdapter.verify(token(rotated, "kid-2", "https://issuer.local", "rekeyshare-api",
				"tenant-a", Instant.now().plusSeconds(60))).tenantId());
		assertRejected(rotatedAdapter, valid);
	}

	private static String token(KeyPair key, String kid, String issuer, String audience, String tenant,
			Instant expiry) {
		return LocalJwksIdentityProviderAdapter.issueFixture(key, kid, issuer, audience, "alice", UserRole.OWNER,
				tenant, expiry);
	}

	private static void assertRejected(LocalJwksIdentityProviderAdapter adapter, String token) {
		assertEquals(ErrorCode.UNAUTHENTICATED,
				assertThrows(ReKeyShareException.class, () -> adapter.verify(token)).code());
	}
}
