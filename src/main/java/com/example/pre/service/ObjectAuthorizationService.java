package com.example.pre.service;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.model.AuditEvent;
import com.example.pre.model.GrantAction;
import com.example.pre.model.GrantStatus;
import com.example.pre.model.PackageStatus;
import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.model.ShareGrant;
import com.example.pre.model.UserRole;
import com.example.pre.storage.AuditRepository;
import com.example.pre.storage.DataRepository;
import com.example.pre.storage.GrantRepository;
import com.example.pre.storage.ReEncryptedPackageRepository;
import com.example.pre.util.AadBuilder;

import java.time.Instant;

public final class ObjectAuthorizationService {
	private final DataRepository dataRepository;
	private final GrantRepository grantRepository;
	private final ReEncryptedPackageRepository packageRepository;
	private final AuditRepository audit;

	public ObjectAuthorizationService(DataRepository dataRepository, GrantRepository grantRepository,
			ReEncryptedPackageRepository packageRepository, AuditRepository audit) {
		this.dataRepository = dataRepository;
		this.grantRepository = grantRepository;
		this.packageRepository = packageRepository;
		this.audit = audit;
	}

	public void assertCanReadData(SecurityContext actor, String dataId) {
		var data = requireData(actor, dataId);
		if (data.ownerId().equals(actor.userId())) {
			return;
		}
		boolean allowed = grantRepository.findByTenantAndDataId(actor.tenantId(), dataId).stream()
				.anyMatch(grant -> grant.recipientId().equals(actor.userId()) && grant.canUse(Instant.now()));
		if (!allowed) {
			deny(actor, "UNAUTHORIZED_ACCESS", dataId, ErrorCode.ACCESS_DENIED, "user cannot read data");
		}
	}

	public void assertCanCreateGrant(SecurityContext actor, String dataId) {
		var data = requireData(actor, dataId);
		if (!data.ownerId().equals(actor.userId())) {
			deny(actor, "UNAUTHORIZED_ACCESS", dataId, ErrorCode.ACCESS_DENIED, "only owner can create grant");
		}
	}

	public ShareGrant assertCanUseGrant(SecurityContext actor, String grantId, GrantAction action) {
		ShareGrant grant = requireGrant(actor, grantId);
		if (!grant.recipientId().equals(actor.userId())) {
			deny(actor, "UNAUTHORIZED_ACCESS", grantId, ErrorCode.ACCESS_DENIED, "only recipient can use grant");
		}
		validateGrantForRecipientAccess(actor, grant);
		validateActionPolicy(actor, grant, action);
		return grant;
	}

	public ShareGrant assertCanReEncryptGrant(SecurityContext actor, String grantId) {
		assertProxyRole(actor);
		ShareGrant grant = requireGrant(actor, grantId);
		validateGrantState(actor, grant);
		if (grant.reEncryptCount() >= grant.policy().maxReEncryptCount()) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.POLICY_VIOLATION,
					"re-encrypt count exhausted");
		}
		return grant;
	}

	public ShareGrant assertCanRevokeGrant(SecurityContext actor, String grantId) {
		ShareGrant grant = requireGrant(actor, grantId);
		if (!grant.ownerId().equals(actor.userId())) {
			deny(actor, "UNAUTHORIZED_ACCESS", grantId, ErrorCode.ACCESS_DENIED, "only owner can revoke grant");
		}
		return grant;
	}

	public ReEncryptedPackage assertCanDownloadPackage(SecurityContext actor, String packageId) {
		ReEncryptedPackage dataPackage = assertCanAccessPackage(actor, packageId);
		ShareGrant grant = grantForPackage(actor, dataPackage);
		validateActionPolicy(actor, grant, GrantAction.DOWNLOAD);
		assertCanRecordDownload(actor, grant);
		return dataPackage;
	}

	public ReEncryptedPackage assertCanDecryptPackage(SecurityContext actor, String packageId) {
		ReEncryptedPackage dataPackage = assertCanAccessPackage(actor, packageId);
		ShareGrant grant = grantForPackage(actor, dataPackage);
		validateActionPolicy(actor, grant, GrantAction.DECRYPT_DEMO);
		assertCanRecordDecrypt(actor, grant);
		return dataPackage;
	}

	public ReEncryptedPackage assertCanPreviewPackage(SecurityContext actor, String packageId) {
		ReEncryptedPackage dataPackage = assertCanAccessPackage(actor, packageId);
		ShareGrant grant = grantForPackage(actor, dataPackage);
		validateActionPolicy(actor, grant, GrantAction.PREVIEW);
		return dataPackage;
	}

	public void assertProxyRole(SecurityContext actor) {
		if (actor == null || !actor.hasRole(UserRole.PROXY)) {
			SecurityContext effective = actor == null ? legacy("unknown") : actor;
			deny(effective, "UNAUTHORIZED_ACCESS", effective.userId(), ErrorCode.ACCESS_DENIED,
					"only proxy role can re-encrypt");
		}
	}

	// Compatibility overloads for local scenario fixtures. HTTP handlers use
	// SecurityContext methods.
	public void assertCanReadData(String userId, String dataId) {
		assertCanReadData(legacy(userId), dataId);
	}

	public void assertCanCreateGrant(String userId, String dataId) {
		assertCanCreateGrant(legacy(userId), dataId);
	}

	public ShareGrant assertCanUseGrant(String userId, String grantId) {
		return assertCanUseGrant(legacy(userId), grantId, GrantAction.DOWNLOAD);
	}

	public ShareGrant assertCanUseGrant(String userId, String grantId, GrantAction action) {
		return assertCanUseGrant(legacy(userId), grantId, action);
	}

	public ShareGrant assertCanRevokeGrant(String userId, String grantId) {
		return assertCanRevokeGrant(legacy(userId), grantId);
	}

	public ReEncryptedPackage assertCanDownloadPackage(String userId, String packageId) {
		return assertCanDownloadPackage(legacy(userId), packageId);
	}

	public ReEncryptedPackage assertCanDecryptPackage(String userId, String packageId) {
		return assertCanDecryptPackage(legacy(userId), packageId);
	}

	public ReEncryptedPackage assertCanPreviewPackage(String userId, String packageId) {
		return assertCanPreviewPackage(legacy(userId), packageId);
	}

	private void validateGrantState(SecurityContext actor, ShareGrant grant) {
		if (grant.status() == GrantStatus.REVOKED) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.GRANT_REVOKED, "grant revoked");
		}
		if (grant.status() == GrantStatus.ROTATED) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.KEY_REVOKED,
					"grant points to rotated content key");
		}
		if (grant.policy().expired(Instant.now()) || grant.status() == GrantStatus.EXPIRED) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.GRANT_EXPIRED, "grant expired");
		}
	}

	private void validateGrantForRecipientAccess(SecurityContext actor, ShareGrant grant) {
		validateGrantState(actor, grant);
		if (grant.accessCount() >= grant.policy().maxAccessCount()) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.POLICY_VIOLATION, "access count exhausted");
		}
	}

	public void assertCanRecordDownload(SecurityContext actor, ShareGrant grant) {
		if (grant.downloadCount() >= grant.policy().maxDownloadCount()) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.POLICY_VIOLATION, "download count exhausted");
		}
	}

	public void assertCanRecordDownload(String actorId, ShareGrant grant) {
		assertCanRecordDownload(legacy(actorId), grant);
	}

	public void assertCanRecordDecrypt(SecurityContext actor, ShareGrant grant) {
		if (grant.decryptCount() >= grant.policy().maxDecryptCount()) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.POLICY_VIOLATION, "decrypt count exhausted");
		}
	}

	public void assertCanRecordDecrypt(String actorId, ShareGrant grant) {
		assertCanRecordDecrypt(legacy(actorId), grant);
	}

	private void validateActionPolicy(SecurityContext actor, ShareGrant grant, GrantAction action) {
		switch (action) {
			case DOWNLOAD -> requirePolicy(actor, grant, grant.policy().allowDownload(), "download is disabled");
			case PREVIEW -> requirePolicy(actor, grant, grant.policy().allowPreview(), "preview is disabled");
			case RESHARE -> requirePolicy(actor, grant, grant.policy().allowReshare(), "reshare is disabled");
			case DECRYPT_DEMO -> requirePolicy(actor, grant,
					hasAllowedAction(grant.policy().allowedActions(), "decrypt"), "decrypt is disabled");
			case PROXY_REENCRYPT, VIEW_AUDIT -> {
			}
			default -> throw new ReKeyShareException(ErrorCode.POLICY_VIOLATION, "unsupported grant action");
		}
	}

	private void requirePolicy(SecurityContext actor, ShareGrant grant, boolean allowed, String reason) {
		if (!allowed) {
			deny(actor, "GRANT_ACCESS_DENIED", grant.grantId(), ErrorCode.POLICY_VIOLATION, reason);
		}
	}

	private ReEncryptedPackage assertCanAccessPackage(SecurityContext actor, String packageId) {
		ReEncryptedPackage dataPackage = requirePackage(actor, packageId);
		if (dataPackage.status() != PackageStatus.ACTIVE) {
			deny(actor, "GRANT_ACCESS_DENIED", packageId, ErrorCode.GRANT_ROTATED, "shared package is invalidated");
		}
		if (!dataPackage.recipientId().equals(actor.userId())) {
			deny(actor, "UNAUTHORIZED_ACCESS", packageId, ErrorCode.ACCESS_DENIED, "only recipient can access package");
		}
		ShareGrant grant = grantForPackage(actor, dataPackage);
		validateGrantForRecipientAccess(actor, grant);
		validateGrantContext(actor, dataPackage, grant);
		return dataPackage;
	}

	private void validateGrantContext(SecurityContext actor, ReEncryptedPackage dataPackage, ShareGrant grant) {
		var data = requireData(actor, dataPackage.dataId());
		if (!grant.policyHash().equals(dataPackage.grantPolicyHash())) {
			deny(actor, "GRANT_ACCESS_DENIED", dataPackage.packageId(), ErrorCode.AAD_MISMATCH,
					"grant policy hash mismatch");
		}
		if (grant.contentKeyVersion() != dataPackage.contentKeyVersion()) {
			deny(actor, "GRANT_ACCESS_DENIED", dataPackage.packageId(), ErrorCode.GRANT_ROTATED,
					"content key version mismatch");
		}
		String expected = Hash.sha256Hex(AadBuilder.build(DataSecurityService.grantContext(data, grant)));
		if (!expected.equals(dataPackage.grantContextHash())) {
			deny(actor, "GRANT_ACCESS_DENIED", dataPackage.packageId(), ErrorCode.AAD_MISMATCH,
					"grant context hash mismatch");
		}
	}

	private com.example.pre.model.EncryptedDataPackage requireData(SecurityContext actor, String id) {
		return dataRepository.findByTenantAndId(actor.tenantId(), id).orElseThrow(() -> missingOrMismatch(actor, id,
				dataRepository.findById(id).isPresent(), ErrorCode.DATA_NOT_FOUND, "data"));
	}

	private ShareGrant requireGrant(SecurityContext actor, String id) {
		return grantRepository.findByTenantAndId(actor.tenantId(), id).orElseThrow(() -> missingOrMismatch(actor, id,
				grantRepository.findById(id).isPresent(), ErrorCode.GRANT_NOT_FOUND, "grant"));
	}

	private ReEncryptedPackage requirePackage(SecurityContext actor, String id) {
		return packageRepository.findByTenantAndId(actor.tenantId(), id).orElseThrow(() -> missingOrMismatch(actor, id,
				packageRepository.findById(id).isPresent(), ErrorCode.PACKAGE_NOT_FOUND, "package"));
	}

	private ShareGrant grantForPackage(SecurityContext actor, ReEncryptedPackage dataPackage) {
		return requireGrant(actor, dataPackage.grantId());
	}

	private ReKeyShareException missingOrMismatch(SecurityContext actor, String id, boolean otherTenantExists,
			ErrorCode missingCode, String type) {
		String reason = otherTenantExists ? "TENANT_MISMATCH_" + type.toUpperCase() : type.toUpperCase() + "_NOT_FOUND";
		audit.record(new AuditEvent(Instant.now(), actor.auditActor(), "UNAUTHORIZED_ACCESS", id, false, reason)
				.withTenant(actor.tenantId()));
		return new ReKeyShareException(missingCode, type + " not found");
	}

	private void deny(SecurityContext actor, String action, String target, ErrorCode code, String reason) {
		audit.record(
				new AuditEvent(Instant.now(), actor.auditActor(), action, target, false, code.name() + ":" + reason)
						.withTenant(actor.tenantId()));
		throw new ReKeyShareException(code, reason);
	}

	private static SecurityContext legacy(String userId) {
		return new SecurityContext(userId, UserRole.RECIPIENT, "default", "legacy", 0, Long.MAX_VALUE);
	}

	private static boolean hasAllowedAction(String allowedActions, String expected) {
		for (String action : allowedActions.split(",")) {
			if (expected.equalsIgnoreCase(action.trim())) {
				return true;
			}
		}
		return false;
	}
}
