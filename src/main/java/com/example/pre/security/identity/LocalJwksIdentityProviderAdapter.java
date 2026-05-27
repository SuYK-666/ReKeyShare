package com.example.pre.security.identity;

import com.example.pre.model.UserRole;
import com.example.pre.service.ErrorCode;
import com.example.pre.service.ReKeyShareException;
import com.example.pre.service.SecurityContext;
import com.example.pre.util.JsonFields;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.PublicKey;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Offline JWKS fixture adapter for integration tests and local deployment.
 * Production deployments can supply the same contract from a remote JWKS cache.
 */
public final class LocalJwksIdentityProviderAdapter implements IdentityProviderAdapter {
	private final Map<String, PublicKey> keys;
	private final IdentityProviderMetadata metadata;

	public LocalJwksIdentityProviderAdapter(String issuer, String audience, Map<String, PublicKey> keys) {
		this.keys = Map.copyOf(keys);
		this.metadata = new IdentityProviderMetadata(issuer, audience, "local-fixture");
	}

	@Override
	public SecurityContext verify(String token) {
		try {
			String[] segments = token.split("\\.", 3);
			if (segments.length != 3) {
				throw rejected("invalid JWT format");
			}
			Map<String, String> header = json(segments[0]);
			Map<String, String> claims = json(segments[1]);
			if (!"EdDSA".equals(header.get("alg"))) {
				throw rejected("unsupported JWT algorithm");
			}
			PublicKey key = keys.get(header.get("kid"));
			if (key == null) {
				throw rejected("unknown JWT kid");
			}
			Signature verifier = Signature.getInstance("Ed25519");
			verifier.initVerify(key);
			verifier.update((segments[0] + "." + segments[1]).getBytes(StandardCharsets.US_ASCII));
			if (!verifier.verify(Base64.getUrlDecoder().decode(segments[2]))) {
				throw rejected("invalid JWT signature");
			}
			if (!metadata.issuer().equals(claims.get("iss")) || !metadata.audience().equals(claims.get("aud"))) {
				throw rejected("JWT issuer or audience mismatch");
			}
			String tenantId = required(claims, "tenantId");
			long issuedAt = epoch(claims, "iat");
			long expiresAt = epoch(claims, "exp");
			if (expiresAt <= Instant.now().getEpochSecond()) {
				throw rejected("JWT expired");
			}
			return new SecurityContext(required(claims, "sub"), UserRole.valueOf(required(claims, "role")), tenantId,
					required(claims, "jti"), issuedAt, expiresAt);
		} catch (ReKeyShareException e) {
			throw e;
		} catch (GeneralSecurityException | IllegalArgumentException e) {
			throw rejected("invalid JWT");
		}
	}

	@Override
	public JwksSnapshot keys() {
		Map<String, String> publicKeys = new LinkedHashMap<>();
		keys.forEach((kid, key) -> publicKeys.put(kid,
				Base64.getUrlEncoder().withoutPadding().encodeToString(key.getEncoded())));
		return new JwksSnapshot(Map.copyOf(publicKeys), Instant.now());
	}

	@Override
	public IdentityProviderMetadata metadata() {
		return metadata;
	}

	public static String issueFixture(KeyPair key, String kid, String issuer, String audience, String subject,
			UserRole role, String tenantId, Instant expiresAt) {
		long now = Instant.now().getEpochSecond();
		String header = b64("{\"alg\":\"EdDSA\",\"kid\":\"" + kid + "\",\"typ\":\"JWT\"}");
		String claims = b64("{\"iss\":\"" + issuer + "\",\"aud\":\"" + audience + "\",\"sub\":\"" + subject
				+ "\",\"role\":\"" + role.name() + "\",\"tenantId\":\"" + tenantId
				+ "\",\"jti\":\"jwt-fixture\",\"iat\":" + now + ",\"exp\":" + expiresAt.getEpochSecond() + "}");
		try {
			Signature signer = Signature.getInstance("Ed25519");
			signer.initSign(key.getPrivate());
			signer.update((header + "." + claims).getBytes(StandardCharsets.US_ASCII));
			return header + "." + claims + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign());
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("cannot sign JWT fixture", e);
		}
	}

	private static Map<String, String> json(String segment) {
		return JsonFields.parseObject(new String(Base64.getUrlDecoder().decode(segment), StandardCharsets.UTF_8));
	}

	private static String required(Map<String, String> claims, String name) {
		String value = claims.get(name);
		if (value == null || value.isBlank()) {
			throw rejected("missing JWT claim " + name);
		}
		return value;
	}

	private static long epoch(Map<String, String> claims, String name) {
		return Long.parseLong(required(claims, name));
	}

	private static String b64(String json) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
	}

	private static ReKeyShareException rejected(String message) {
		return new ReKeyShareException(ErrorCode.UNAUTHENTICATED, message);
	}
}
