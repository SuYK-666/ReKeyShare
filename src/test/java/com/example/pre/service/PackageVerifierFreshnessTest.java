package com.example.pre.service;

import com.example.pre.crypto.EncryptedKeyCapsule;
import com.example.pre.crypto.provider.SchemeDescriptor;
import com.example.pre.model.AccessPolicy;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.PackageStatus;
import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.model.ShareGrant;
import com.example.pre.model.SharedPackageV2;
import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PackageVerifierFreshnessTest {
    @Test
    void revokedAndRotatedAuthorizationRejectPreviouslyIssuedPackage() {
        Instant now = Instant.now();
        ReEncryptedPackage payload = new ReEncryptedPackage("data-a", "owner", "recipient", AlgorithmType.RSA_PRE,
                Bytes.utf8("cipher"), Bytes.utf8("nonce"), Bytes.utf8("aad"),
                new EncryptedKeyCapsule(AlgorithmType.RSA_PRE, Bytes.utf8("h"), Bytes.utf8("w"), Bytes.utf8("n")),
                now);
        SharedPackageV2 pkg = SharedPackageV2.issue(payload, new SchemeDescriptor("RSA_PRE_BASELINE", "RSA",
                "EXPERIMENTAL", "test", true, true, false, "BASELINE", "IMPLEMENTED"),
                now.plusSeconds(120));
        ShareGrant grant = ShareGrant.active(payload.dataId(), payload.ownerId(), payload.recipientId(),
                payload.algorithm(), AccessPolicy.normal(now.plusSeconds(120)), "policy", null, 1);
        PackageVerifier verifier = new PackageVerifier();
        assertEquals(ErrorCode.GRANT_REVOKED,
                assertThrows(ReKeyShareException.class,
                        () -> verifier.verifyAuthorizationFreshness(pkg, grant.revoke(), now)).code());
        assertEquals(ErrorCode.KEY_REVOKED,
                assertThrows(ReKeyShareException.class,
                        () -> verifier.verifyAuthorizationFreshness(pkg, grant.rotate(), now)).code());
        ReEncryptedPackage invalid = payload.invalidate(PackageStatus.INVALIDATED, "revoked");
        SharedPackageV2 invalidPackage = SharedPackageV2.issue(invalid, new SchemeDescriptor("RSA_PRE_BASELINE",
                "RSA", "EXPERIMENTAL", "test", true, true, false, "BASELINE", "IMPLEMENTED"),
                now.plusSeconds(120));
        assertEquals(ErrorCode.PACKAGE_INVALID,
                assertThrows(ReKeyShareException.class,
                        () -> verifier.verifyAuthorizationFreshness(invalidPackage, grant, now)).code());
    }
}
