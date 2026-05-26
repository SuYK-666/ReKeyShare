package com.example.pre.service;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.crypto.proof.InMemoryProxySigningKeyRegistry;
import com.example.pre.crypto.proof.PolicyBoundConversionProof;
import com.example.pre.crypto.proof.PolicyBoundProofVerifier;
import com.example.pre.crypto.proof.ProofPayloadCanonicalizer;
import com.example.pre.crypto.proof.ProxySigningKeyRecord;
import com.example.pre.crypto.proof.ProxySigningKeyRegistry;
import com.example.pre.model.ConversionProof;
import com.example.pre.model.AlgorithmSuite;
import com.example.pre.model.PackageManifest;
import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.model.ShareGrant;
import com.example.pre.util.Bytes;
import com.example.pre.util.SecureRandomUtil;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

public final class ConversionProofService {
    private static final Duration MAX_PROOF_AGE = Duration.ofMinutes(15);
    private final ProxySigningKeyRegistry signingKeys;
    private final ProofPayloadCanonicalizer canonicalizer = new ProofPayloadCanonicalizer();

    public ConversionProofService() {
        this(new InMemoryProxySigningKeyRegistry());
    }

    public ConversionProofService(ProxySigningKeyRegistry signingKeys) {
        this.signingKeys = signingKeys;
    }

    public ConversionProof issue(ReEncryptedPackage dataPackage, ShareGrant grant, String proxyId) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(MAX_PROOF_AGE);
        String nonce = Base64.getEncoder().encodeToString(SecureRandomUtil.randomBytes(16));
        ProxySigningKeyRecord key = signingKeys.activeForSigning(proxyId, issuedAt);
        ConversionProof unsigned = new ConversionProof("POLICY_BOUND_PROOF_V1", AlgorithmSuite.POLICY_BOUND_PRE_V1.name(),
                objectDigest(dataPackage), grantDigest(grant), capsuleDigest(dataPackage), packageDigest(dataPackage),
                proxyId, issuedAt, nonce, "Ed25519", "", "", "tenant-default", dataPackage.dataId(),
                grant.grantId(), grant.ownerId(), grant.recipientId(), dataPackage.packageId(), grant.policyHash(),
                grant.contentKeyVersion(), Hash.sha256Hex(dataPackage.aad()), key.keyId(), key.keyEpoch(),
                expiresAt, "");
        PolicyBoundConversionProof payload = toPolicyBound(unsigned, "");
        String canonicalHash = canonicalizer.digest(payload);
        ConversionProof hashed = copyWithSignature(unsigned, "", canonicalHash);
        return copyWithSignature(hashed, sign(key, toPolicyBound(hashed, canonicalHash)), canonicalHash);
    }

    public boolean verifyTrusted(ConversionProof proof, ReEncryptedPackage dataPackage, ShareGrant grant, Instant now) {
        if (proof == null || !matchesContext(proof, dataPackage, grant)) {
            return false;
        }
        return new PolicyBoundProofVerifier(signingKeys, (nonce, hash) -> true)
                .verify(toPolicyBound(proof, proof.canonicalPayloadHash()), now, false)
                == PolicyBoundProofVerifier.Decision.ACCEPT;
    }

    public static boolean verify(ConversionProof proof, ReEncryptedPackage dataPackage, ShareGrant grant, Instant now) {
        if (proof == null || !"conversion-proof-v1".equals(proof.proofVersion())
                || !"Ed25519".equals(proof.signatureAlgorithm())
                || proof.issuedAt().isAfter(now.plusSeconds(30))
                || proof.issuedAt().plus(MAX_PROOF_AGE).isBefore(now)
                || !(proof.algorithmSuite().equals(dataPackage.algorithm().name())
                    || proof.algorithmSuite().equals(AlgorithmSuite.POLICY_BOUND_PRE_V1.name()))
                || !proof.objectDigest().equals(objectDigest(dataPackage))
                || !proof.grantDigest().equals(grantDigest(grant))
                || !proof.capsuleDigest().equals(capsuleDigest(dataPackage))
                || !proof.packageDigest().equals(packageDigest(dataPackage))) {
            return false;
        }
        try {
            PublicKey publicKey = KeyFactory.getInstance("Ed25519")
                    .generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(proof.publicKey())));
            Signature verifier = Signature.getInstance("Ed25519");
            verifier.initVerify(publicKey);
            verifier.update(payload(proof).getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.getDecoder().decode(proof.signature()));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return false;
        }
    }

    public static String digest(ConversionProof proof) {
        return Hash.sha256Hex(payload(proof) + "|" + proof.signature());
    }

    public ProxySigningKeyRegistry signingKeys() {
        return signingKeys;
    }

    private String sign(ProxySigningKeyRecord key, PolicyBoundConversionProof proof) {
        try {
            Signature signer = Signature.getInstance("Ed25519");
            signer.initSign(key.privateKey());
            signer.update(canonicalizer.canonicalBytes(proof));
            return Base64.getEncoder().encodeToString(signer.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("cannot issue conversion proof", e);
        }
    }

    private static String payload(ConversionProof proof) {
        return String.join("|", proof.proofVersion(), proof.algorithmSuite(), proof.objectDigest(),
                proof.grantDigest(), proof.capsuleDigest(), proof.packageDigest(), proof.proxyId(),
                proof.issuedAt().toString(), proof.nonce(), proof.signatureAlgorithm(), proof.publicKey());
    }

    private static String objectDigest(ReEncryptedPackage dataPackage) {
        return Hash.sha256Hex(dataPackage.encryptedContent());
    }

    private static String grantDigest(ShareGrant grant) {
        return Hash.sha256Hex(String.join("|", grant.grantId(), grant.dataId(), grant.ownerId(), grant.recipientId(),
                grant.policyHash(), Integer.toString(grant.contentKeyVersion())));
    }

    private static String capsuleDigest(ReEncryptedPackage dataPackage) {
        return Hash.sha256Hex(Bytes.concat(dataPackage.reEncryptedCapsule().header(),
                dataPackage.reEncryptedCapsule().wrappedKey(), dataPackage.reEncryptedCapsule().keyNonce()));
    }

    private static String packageDigest(ReEncryptedPackage dataPackage) {
        return PackageManifest.issue(dataPackage).manifestHash();
    }

    private static boolean matchesContext(ConversionProof proof, ReEncryptedPackage dataPackage, ShareGrant grant) {
        return "POLICY_BOUND_PROOF_V1".equals(proof.proofVersion())
                && AlgorithmSuite.POLICY_BOUND_PRE_V1.name().equals(proof.algorithmSuite())
                && proof.dataId().equals(dataPackage.dataId())
                && proof.grantId().equals(grant.grantId())
                && proof.ownerId().equals(grant.ownerId())
                && proof.recipientId().equals(grant.recipientId())
                && proof.packageId().equals(dataPackage.packageId())
                && proof.policyHash().equals(grant.policyHash())
                && proof.contentKeyVersion() == grant.contentKeyVersion()
                && proof.objectDigest().equals(objectDigest(dataPackage))
                && proof.grantDigest().equals(grantDigest(grant))
                && proof.capsuleDigest().equals(capsuleDigest(dataPackage))
                && proof.packageDigest().equals(packageDigest(dataPackage))
                && proof.aadHash().equals(Hash.sha256Hex(dataPackage.aad()));
    }

    private static PolicyBoundConversionProof toPolicyBound(ConversionProof proof, String canonicalHash) {
        return new PolicyBoundConversionProof(proof.proofVersion(), proof.algorithmSuite(), proof.tenantId(),
                proof.dataId(), proof.grantId(), proof.ownerId(), proof.recipientId(), proof.proxyId(),
                proof.packageId(), proof.policyHash(), proof.contentKeyVersion(), proof.capsuleDigest(),
                proof.objectDigest(), proof.aadHash(), proof.packageDigest(), proof.keyId(), proof.keyEpoch(),
                proof.issuedAt(), proof.expiresAt(), proof.nonce(), canonicalHash, proof.signatureAlgorithm(),
                proof.signature());
    }

    private static ConversionProof copyWithSignature(ConversionProof proof, String signature, String canonicalHash) {
        return new ConversionProof(proof.proofVersion(), proof.algorithmSuite(), proof.objectDigest(),
                proof.grantDigest(), proof.capsuleDigest(), proof.packageDigest(), proof.proxyId(), proof.issuedAt(),
                proof.nonce(), proof.signatureAlgorithm(), proof.publicKey(), signature, proof.tenantId(),
                proof.dataId(), proof.grantId(), proof.ownerId(), proof.recipientId(), proof.packageId(),
                proof.policyHash(), proof.contentKeyVersion(), proof.aadHash(), proof.keyId(), proof.keyEpoch(),
                proof.expiresAt(), canonicalHash);
    }
}
