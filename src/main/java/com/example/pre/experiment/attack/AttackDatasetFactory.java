package com.example.pre.experiment.attack;

import java.util.List;

public final class AttackDatasetFactory {
	public List<AttackCase> cases() {
		return List.of(
				rejected("AT-01", "IDOR dataId", "dataId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE",
						"DATA_SCOPE_REJECTED"),
				rejected("AT-02", "BOLA grantId", "grantId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE",
						"GRANT_SCOPE_REJECTED"),
				rejected("AT-03", "Revoked package", "grant.status", "R-REVOKE-001", "GRANT_REVOKED",
						"GRANT_NOT_ACTIVE"),
				rejected("AT-04", "Old capsule replay", "capsuleHash", "R-PROOF-001", "PROOF_INVALID",
						"CAPSULE_HASH_MISMATCH"),
				rejected("AT-05", "Wrong AAD", "aadHash", "R-AAD-001", "AAD_MISMATCH", "AAD_HASH_MISMATCH"),
				rejected("AT-06", "Wrong policy", "policyHash", "R-PROOF-001", "PROOF_INVALID", "POLICY_HASH_MISMATCH"),
				rejected("AT-07", "Wrong recipient share", "recipientId", "R-THRESHOLD-001", "THRESHOLD_SHARE_INVALID",
						"SHARE_CONTEXT_MISMATCH"),
				rejected("AT-08", "Audit tamper", "eventHash", "R-AUDIT-001", "AUDIT_CHAIN_BROKEN",
						"HASH_CHAIN_MISMATCH"),
				rejected("AT-09", "Revoked proxy signer", "keyId", "R-PROOF-001", "PROOF_INVALID",
						"PROOF_SIGNER_REVOKED"),
				rejected("AT-10", "Key version downgrade", "contentKeyVersion", "R-REVOKE-001", "KEY_REVOKED",
						"STALE_KEY_VERSION"),
				rejected("AT-11", "Cross tenant package replay", "tenantId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE",
						"TENANT_SCOPE_REJECTED"),
				rejected("AT-12", "Manifest tamper", "manifestHash", "R-PROOF-001", "PACKAGE_INVALID",
						"MANIFEST_MISMATCH"),
				rejected("AT-13", "Idempotency conflict", "requestDigest", "R-IDEMPOTENCY-001", "IDEMPOTENCY_CONFLICT",
						"KEY_BODY_CONFLICT"),
				rejected("AT-14", "Proof replay", "proofNonce", "R-PROOF-REPLAY-001", "PROOF_INVALID", "PROOF_REPLAY"),
				rejected("AT-15", "Concurrent proof replay", "proofNonce", "R-PROOF-REPLAY-001", "PROOF_INVALID",
						"PROOF_REPLAY"),
				rejected("AT-16", "Proof tenant replacement", "tenantId", "R-TENANT-001", "PROOF_INVALID",
						"TENANT_MISMATCH"),
				rejected("AT-17", "Audit tenant replacement", "audit.tenantId", "R-AUDIT-001", "AUDIT_CHAIN_BROKEN",
						"HASH_CHAIN_MISMATCH"),
				rejected("AT-18", "Package identifier oracle", "packageId", "R-BOLA-001", "ACCESS_DENIED",
						"PACKAGE_NOT_FOUND"),
				rejected("AT-19", "Unauthorized existing package oracle", "packageId", "R-BOLA-001", "ACCESS_DENIED",
						"ACCESS_DENIED"),
				rejected("AT-20", "Inactive proxy", "proxy.status", "R-PROXY-001", "PROXY_INACTIVE", "NODE_NOT_ACTIVE"),
				rejected("AT-21", "Wrong tenant proxy", "proxy.tenantScope", "R-PROXY-001", "ACCESS_DENIED",
						"TENANT_SCOPE_REJECTED"),
				rejected("AT-22", "Wrong scheme proxy", "proxy.schemeAllowlist", "R-PROXY-001", "SCHEME_NOT_ALLOWED",
						"SCHEME_REJECTED"),
				rejected("AT-23", "Proxy quota exhaustion", "proxy.quota", "R-PROXY-001", "PROXY_QUOTA_EXCEEDED",
						"QUOTA_EXHAUSTED"),
				rejected("AT-24", "Legacy proof downgrade", "proofVersion", "R-PROOF-001", "PROOF_INVALID",
						"VERSION_REJECTED"),
				rejected("AT-25", "Empty proof version", "proofVersion", "R-PROOF-001", "PROOF_INVALID",
						"VERSION_REJECTED"),
				rejected("AT-26", "Proof version case change", "proofVersion", "R-PROOF-001", "PROOF_INVALID",
						"VERSION_REJECTED"),
				rejected("AT-27", "Expired formal proof", "expiresAt", "R-PROOF-001", "PROOF_INVALID", "PROOF_EXPIRED"),
				rejected("AT-28", "Unknown proof signing key", "keyId", "R-PROOF-001", "PROOF_INVALID",
						"PROOF_SIGNER_UNKNOWN"),
				rejected("AT-29", "Proof key epoch rollback", "keyEpoch", "R-PROOF-001", "PROOF_INVALID",
						"PROOF_SIGNER_UNKNOWN"),
				rejected("AT-30", "Ciphertext mutation", "ciphertext", "R-PACKAGE-001", "PACKAGE_INVALID",
						"MANIFEST_MISMATCH"),
				rejected("AT-31", "AAD context mutation", "aad", "R-AAD-001", "AAD_MISMATCH", "AAD_HASH_MISMATCH"),
				rejected("AT-32", "Grant revoked after package issue", "grant.status", "R-REVOKE-001", "GRANT_REVOKED",
						"GRANT_NOT_ACTIVE"),
				rejected("AT-33", "Key rotated after package issue", "contentKeyVersion", "R-REVOKE-001", "KEY_REVOKED",
						"STALE_KEY_VERSION"),
				rejected("AT-34", "Threshold insufficient shares", "shareCount", "R-THRESHOLD-001",
						"THRESHOLD_NOT_REACHED", "INSUFFICIENT_QUORUM"),
				rejected("AT-35", "Threshold duplicate member", "memberId", "R-THRESHOLD-001",
						"THRESHOLD_SHARE_INVALID", "DUPLICATE_MEMBER"),
				rejected("AT-36", "Threshold wrong context", "sessionContext", "R-THRESHOLD-001",
						"THRESHOLD_SHARE_INVALID", "SHARE_CONTEXT_MISMATCH"),
				rejected("AT-37", "Audit event edit", "event.action", "R-AUDIT-001", "AUDIT_CHAIN_BROKEN",
						"HASH_CHAIN_MISMATCH"),
				rejected("AT-38", "Audit event deletion", "event.sequence", "R-AUDIT-001", "AUDIT_CHAIN_BROKEN",
						"HASH_CHAIN_MISMATCH"),
				rejected("AT-39", "Production plaintext route", "route", "R-PROFILE-001", "DEMO_ONLY_API_DISABLED",
						"PROFILE_REJECTED"),
				rejected("AT-40", "Production baseline suite", "algorithmSuite", "R-PROFILE-001",
						"CRYPTO_PROFILE_NOT_ALLOWED", "PROFILE_REJECTED"));
	}

	private static AttackCase rejected(String id, String title, String field, String requirement, String code,
			String reason) {
		return new AttackCase() {
			public String id() {
				return id;
			}
			public String title() {
				return title;
			}
			public String mutatedField() {
				return field;
			}
			public String requirementId() {
				return requirement;
			}
			public String externalErrorCode() {
				return code;
			}
			public String internalAuditReason() {
				return reason;
			}
			public boolean rejected() {
				return true;
			}
		};
	}
}
