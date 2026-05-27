package com.example.pre.model;

import com.example.pre.crypto.ReEncryptionKey;
import com.example.pre.util.SecureRandomUtil;

import java.time.Instant;

public record ShareGrant(String grantId, String dataId, String ownerId, String recipientId, AlgorithmType algorithm,
		GrantStatus status, AccessPolicy policy, String policyHash, ReEncryptionKey reKey, int accessCount,
		int reEncryptCount, int downloadCount, int decryptCount, int previewCount, Instant createdAt, Instant expiresAt,
		Instant revokedAt, String revokeReason, int contentKeyVersion, String tenantId) {
	public ShareGrant(String grantId, String dataId, String ownerId, String recipientId, AlgorithmType algorithm,
			GrantStatus status, AccessPolicy policy, String policyHash, ReEncryptionKey reKey, int accessCount,
			int reEncryptCount, int downloadCount, int decryptCount, int previewCount, Instant createdAt,
			Instant expiresAt, Instant revokedAt, String revokeReason, int contentKeyVersion) {
		this(grantId, dataId, ownerId, recipientId, algorithm, status, policy, policyHash, reKey, accessCount,
				reEncryptCount, downloadCount, decryptCount, previewCount, createdAt, expiresAt, revokedAt,
				revokeReason, contentKeyVersion, "default");
	}

	public static ShareGrant active(String dataId, String ownerId, String recipientId, AlgorithmType algorithm,
			AccessPolicy policy, String policyHash, ReEncryptionKey reKey, int contentKeyVersion) {
		return active(dataId, ownerId, recipientId, algorithm, policy, policyHash, reKey, contentKeyVersion, "default");
	}

	public static ShareGrant active(String dataId, String ownerId, String recipientId, AlgorithmType algorithm,
			AccessPolicy policy, String policyHash, ReEncryptionKey reKey, int contentKeyVersion, String tenantId) {
		return new ShareGrant(SecureRandomUtil.randomId(), dataId, ownerId, recipientId, algorithm, GrantStatus.ACTIVE,
				policy, policyHash, reKey, 0, 0, 0, 0, 0, Instant.now(), policy.expiresAt(), null, "",
				contentKeyVersion, tenantId);
	}

	public boolean canUse(Instant now) {
		return status == GrantStatus.ACTIVE && !policy.expired(now) && accessCount < policy.maxAccessCount();
	}

	public ShareGrant incrementAccess() {
		return copy(status, reKey, accessCount + 1, reEncryptCount, downloadCount, decryptCount, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant incrementReEncrypt() {
		return copy(status, reKey, accessCount, reEncryptCount + 1, downloadCount, decryptCount, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant incrementDownload() {
		return copy(status, reKey, accessCount + 1, reEncryptCount, downloadCount + 1, decryptCount, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant incrementDecrypt() {
		return copy(status, reKey, accessCount + 1, reEncryptCount, downloadCount, decryptCount + 1, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant incrementPreview() {
		return copy(status, reKey, accessCount + 1, reEncryptCount, downloadCount, decryptCount, previewCount + 1,
				revokedAt, revokeReason);
	}

	public ShareGrant withReKey(ReEncryptionKey scopedReKey) {
		return copy(status, scopedReKey, accessCount, reEncryptCount, downloadCount, decryptCount, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant revoke() {
		return revoke("manual revoke");
	}

	public ShareGrant revoke(String reason) {
		return copy(GrantStatus.REVOKED, reKey, accessCount, reEncryptCount, downloadCount, decryptCount, previewCount,
				Instant.now(), reason);
	}

	public ShareGrant expire() {
		return copy(GrantStatus.EXPIRED, reKey, accessCount, reEncryptCount, downloadCount, decryptCount, previewCount,
				revokedAt, revokeReason);
	}

	public ShareGrant rotate() {
		return copy(GrantStatus.ROTATED, reKey, accessCount, reEncryptCount, downloadCount, decryptCount, previewCount,
				revokedAt, "content key rotated");
	}

	private ShareGrant copy(GrantStatus newStatus, ReEncryptionKey newKey, int newAccessCount, int newReEncryptCount,
			int newDownloadCount, int newDecryptCount, int newPreviewCount, Instant newRevokedAt, String reason) {
		return new ShareGrant(grantId, dataId, ownerId, recipientId, algorithm, newStatus, policy, policyHash, newKey,
				newAccessCount, newReEncryptCount, newDownloadCount, newDecryptCount, newPreviewCount, createdAt,
				expiresAt, newRevokedAt, reason, contentKeyVersion, tenantId);
	}
}
