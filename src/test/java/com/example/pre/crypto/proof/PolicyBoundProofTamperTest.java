package com.example.pre.crypto.proof;

import org.junit.jupiter.api.Test;

import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.function.UnaryOperator;
import com.example.pre.storage.InMemoryProofReplayRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PolicyBoundProofTamperTest {
    private final Instant issued = Instant.parse("2026-05-26T10:00:00Z");
    private final ProofPayloadCanonicalizer canonicalizer = new ProofPayloadCanonicalizer();

    @Test
    void rejectsEveryBoundFieldMutationAndSignerFailure() throws Exception {
        InMemoryProxySigningKeyRegistry keys = new InMemoryProxySigningKeyRegistry();
        ProxySigningKeyRecord key = keys.rotate("proxy-a", issued);
        PolicyBoundConversionProof valid = signed(key, base(key));
        PolicyBoundProofVerifier verifier = new PolicyBoundProofVerifier(keys, new InMemoryProofReplayRepository());
        assertEquals(PolicyBoundProofVerifier.Decision.ACCEPT,
                verifier.verify(valid, issued.plusSeconds(1), false));

        List<UnaryOperator<PolicyBoundConversionProof>> changes = List.of(
                p -> copy(p, "tenant-b", p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), "data-b", p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), "grant-b", p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), "owner-b", p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), "recipient-b", p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), "pkg-b",
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        "policy-b", p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), 9, p.capsuleHash(), p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), "capsule-b", p.ciphertextHash(), p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), "cipher-b", p.aadHash()),
                p -> copy(p, p.tenantId(), p.dataId(), p.grantId(), p.ownerId(), p.recipientId(), p.packageId(),
                        p.policyHash(), p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), "aad-b")
        );
        for (UnaryOperator<PolicyBoundConversionProof> change : changes) {
            assertEquals(PolicyBoundProofVerifier.Decision.PROOF_CONTEXT_MISMATCH,
                    verifier.verify(change.apply(valid), issued.plusSeconds(1), false));
        }

        InMemoryProxySigningKeyRegistry untrustedRegistry = new InMemoryProxySigningKeyRegistry();
        ProxySigningKeyRecord untrustedKey = untrustedRegistry.rotate("proxy-a", issued);
        PolicyBoundConversionProof unknown = signed(untrustedKey, base(untrustedKey));
        assertEquals(PolicyBoundProofVerifier.Decision.PROOF_SIGNER_UNKNOWN,
                verifier.verify(unknown, issued.plusSeconds(1), false));
        keys.revoke("proxy-a", key.keyId());
        assertEquals(PolicyBoundProofVerifier.Decision.PROOF_SIGNER_REVOKED,
                verifier.verify(valid, issued.plusSeconds(1), false));
    }

    @Test
    void rejectsConsumedNonceAndExpiredProof() throws Exception {
        InMemoryProxySigningKeyRegistry keys = new InMemoryProxySigningKeyRegistry();
        ProxySigningKeyRecord key = keys.rotate("proxy-a", issued);
        PolicyBoundConversionProof valid = signed(key, base(key));
        PolicyBoundProofVerifier verifier = new PolicyBoundProofVerifier(keys, new InMemoryProofReplayRepository());
        assertEquals(PolicyBoundProofVerifier.Decision.ACCEPT, verifier.verify(valid, issued.plusSeconds(1), true));
        assertEquals(PolicyBoundProofVerifier.Decision.PROOF_REPLAY_DETECTED,
                verifier.verify(valid, issued.plusSeconds(2), true));
        assertEquals(PolicyBoundProofVerifier.Decision.PROOF_EXPIRED,
                verifier.verify(valid, issued.plusSeconds(901), false));
    }

    private PolicyBoundConversionProof base(ProxySigningKeyRecord key) {
        return new PolicyBoundConversionProof("POLICY_BOUND_PROOF_V1", "POLICY_BOUND_PRE_V1", "tenant-a",
                "data-a", "grant-a", "owner-a", "recipient-a", "proxy-a", "pkg-a", "policy-a", 7,
                "capsule-a", "cipher-a", "aad-a", "manifest-a", key.keyId(), key.keyEpoch(), issued,
                issued.plusSeconds(900), "nonce-a", "pending", "Ed25519", "");
    }

    private PolicyBoundConversionProof signed(ProxySigningKeyRecord key, PolicyBoundConversionProof unsigned)
            throws Exception {
        String digest = canonicalizer.digest(unsigned);
        PolicyBoundConversionProof hashed = withSignature(unsigned, digest, "");
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(key.privateKey());
        signer.update(canonicalizer.canonicalBytes(hashed));
        return withSignature(hashed, digest, Base64.getEncoder().encodeToString(signer.sign()));
    }

    private static PolicyBoundConversionProof copy(PolicyBoundConversionProof p, String tenant, String data,
                                                    String grant, String owner, String recipient, String pkg,
                                                    String policy, int version, String capsule, String cipher,
                                                    String aad) {
        return new PolicyBoundConversionProof(p.proofVersion(), p.algorithmSuite(), tenant, data, grant, owner,
                recipient, p.proxyId(), pkg, policy, version, capsule, cipher, aad, p.manifestHash(), p.keyId(),
                p.keyEpoch(), p.issuedAt(), p.expiresAt(), p.proofNonce(), p.canonicalPayloadHash(),
                p.signatureAlgorithm(), p.signature());
    }

    private static PolicyBoundConversionProof withSignature(PolicyBoundConversionProof p, String digest,
                                                             String signature) {
        return new PolicyBoundConversionProof(p.proofVersion(), p.algorithmSuite(), p.tenantId(), p.dataId(),
                p.grantId(), p.ownerId(), p.recipientId(), p.proxyId(), p.packageId(), p.policyHash(),
                p.contentKeyVersion(), p.capsuleHash(), p.ciphertextHash(), p.aadHash(), p.manifestHash(),
                p.keyId(), p.keyEpoch(), p.issuedAt(), p.expiresAt(), p.proofNonce(), digest,
                p.signatureAlgorithm(), signature);
    }
}
