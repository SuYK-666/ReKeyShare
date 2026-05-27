package com.example.pre.service;

import com.example.pre.model.UserRole;

public record SecurityContext(String userId, UserRole role, String tenantId, String tokenId, long issuedAt,
		long expiresAt, String credentialFingerprint) {
	public SecurityContext(String userId, UserRole role, String tenantId, String tokenId, long issuedAt,
			long expiresAt) {
		this(userId, role, tenantId, tokenId, issuedAt, expiresAt, "");
	}

	public boolean hasRole(UserRole expected) {
		return role == expected || role == UserRole.ADMIN;
	}

	public String auditActor() {
		return userId + "@" + tenantId;
	}

	public SecurityContext withCredentialFingerprint(String fingerprint) {
		return new SecurityContext(userId, role, tenantId, tokenId, issuedAt, expiresAt, fingerprint);
	}
}
