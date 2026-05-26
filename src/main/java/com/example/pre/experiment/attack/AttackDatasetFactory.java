package com.example.pre.experiment.attack;

import java.util.List;

public final class AttackDatasetFactory {
    public List<AttackCase> cases() {
        return List.of(
                rejected("AT-01", "IDOR dataId", "dataId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE", "DATA_SCOPE_REJECTED"),
                rejected("AT-02", "BOLA grantId", "grantId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE", "GRANT_SCOPE_REJECTED"),
                rejected("AT-03", "Revoked package", "grant.status", "R-REVOKE-001", "GRANT_REVOKED", "GRANT_NOT_ACTIVE"),
                rejected("AT-04", "Old capsule replay", "capsuleHash", "R-PROOF-001", "PROOF_INVALID", "CAPSULE_HASH_MISMATCH"),
                rejected("AT-05", "Wrong AAD", "aadHash", "R-AAD-001", "AAD_MISMATCH", "AAD_HASH_MISMATCH"),
                rejected("AT-06", "Wrong policy", "policyHash", "R-PROOF-001", "PROOF_INVALID", "POLICY_HASH_MISMATCH"),
                rejected("AT-07", "Wrong recipient share", "recipientId", "R-THRESHOLD-001", "THRESHOLD_SHARE_INVALID", "SHARE_CONTEXT_MISMATCH"),
                rejected("AT-08", "Audit tamper", "eventHash", "R-AUDIT-001", "AUDIT_CHAIN_BROKEN", "HASH_CHAIN_MISMATCH"),
                rejected("AT-09", "Revoked proxy signer", "keyId", "R-PROOF-001", "PROOF_INVALID", "PROOF_SIGNER_REVOKED"),
                rejected("AT-10", "Key version downgrade", "contentKeyVersion", "R-REVOKE-001", "KEY_REVOKED", "STALE_KEY_VERSION"),
                rejected("AT-11", "Cross tenant package replay", "tenantId", "R-BOLA-001", "OBJECT_NOT_ACCESSIBLE", "TENANT_SCOPE_REJECTED"),
                rejected("AT-12", "Manifest tamper", "manifestHash", "R-PROOF-001", "PACKAGE_INVALID", "MANIFEST_MISMATCH"),
                rejected("AT-13", "Idempotency conflict", "requestDigest", "R-IDEMPOTENCY-001", "IDEMPOTENCY_CONFLICT", "KEY_BODY_CONFLICT")
        );
    }

    private static AttackCase rejected(String id, String title, String field, String requirement, String code,
                                       String reason) {
        return new AttackCase() {
            public String id() { return id; }
            public String title() { return title; }
            public String mutatedField() { return field; }
            public String requirementId() { return requirement; }
            public String externalErrorCode() { return code; }
            public String internalAuditReason() { return reason; }
            public boolean rejected() { return true; }
        };
    }
}
