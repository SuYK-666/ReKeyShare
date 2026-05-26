package com.example.pre.app;

import com.example.pre.crypto.provider.SecureEnvelopeProvider;
import com.example.pre.crypto.EncryptedKeyCapsule;
import com.example.pre.crypto.provider.SchemeDescriptor;
import com.example.pre.crypto.proof.InMemoryProxySigningKeyRegistry;
import com.example.pre.crypto.proof.PolicyBoundConversionProof;
import com.example.pre.crypto.proof.PolicyBoundProofVerifier;
import com.example.pre.crypto.proof.ProofPayloadCanonicalizer;
import com.example.pre.crypto.proof.ProxySigningKeyRecord;
import com.example.pre.crypto.threshold.ThresholdReKeyShare;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.AuditEvent;
import com.example.pre.model.CapsuleContext;
import com.example.pre.model.PackageManifest;
import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.model.SharedPackageV2;
import com.example.pre.service.AuditProofService;
import com.example.pre.service.AuditService;
import com.example.pre.service.PackageVerifier;
import com.example.pre.service.ThresholdReEncryptionService;
import com.example.pre.storage.InMemoryProofReplayRepository;
import com.example.pre.storage.InMemoryAuditRepository;
import com.example.pre.util.Bytes;
import com.example.pre.util.SecureRandomUtil;

import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.security.Signature;
import java.util.Base64;
import java.util.List;

public final class VerificationCli {
    private VerificationCli() {
    }

    public static void main(String[] args) throws Exception {
        int status = run(args, System.out);
        if (status != 0) {
            System.exit(status);
        }
    }

    public static int run(String[] args, PrintStream out) throws Exception {
        String command = String.join(" ", args);
        return switch (command) {
            case "crypto verify-envelope" -> verifyEnvelope(out);
            case "audit verify" -> verifyAudit(out);
            case "attack-matrix check" -> verifyAttackMatrix(out);
            case "verify-package" -> verifyPackage(out);
            case "verify-proof" -> verifyProof(out);
            case "verify-audit" -> verifyAudit(out);
            case "verify-threshold" -> verifyThreshold(out);
            default -> {
                out.println("{\"valid\":false,\"errorCode\":\"INVALID_REQUEST\","
                        + "\"usage\":\"verify-package | verify-proof | verify-audit | verify-threshold | crypto verify-envelope | attack-matrix check\"}");
                yield 2;
            }
        };
    }

    private static int verifyEnvelope(PrintStream out) {
        SecureEnvelopeProvider provider = new SecureEnvelopeProvider();
        var recipient = provider.generateKeyPair("recipient");
        byte[] dek = SecureRandomUtil.randomBytes(32);
        CapsuleContext context = new CapsuleContext("cli-object", "owner", "recipient",
                AlgorithmType.SECURE_ENVELOPE, "owner-key-v1", 1, "cli-policy",
                "tenant-cli", "grant-cli", "SECURE_ENVELOPE_V1", "proxy-cli", "VERIFY_ENVELOPE");
        var capsule = provider.encapsulate(dek, recipient.publicKey(), context);
        boolean recovered = java.util.Arrays.equals(dek, provider.decapsulate(capsule, recipient.privateKey(), context));
        boolean tamperRejected = false;
        try {
            CapsuleContext altered = new CapsuleContext("other-object", "owner", "recipient",
                    AlgorithmType.SECURE_ENVELOPE, "owner-key-v1", 1, "cli-policy",
                    "tenant-cli", "grant-cli", "SECURE_ENVELOPE_V1", "proxy-cli", "VERIFY_ENVELOPE");
            provider.decapsulate(capsule, recipient.privateKey(), altered);
        } catch (IllegalArgumentException expected) {
            tamperRejected = true;
        }
        boolean valid = recovered && tamperRejected;
        out.println("{\"command\":\"crypto verify-envelope\",\"valid\":" + valid
                + ",\"contextTamperRejected\":" + tamperRejected + "}");
        return valid ? 0 : 1;
    }

    private static int verifyAudit(PrintStream out) {
        InMemoryAuditRepository repository = new InMemoryAuditRepository();
        repository.record(new AuditEvent(Instant.now(), "owner", "UPLOAD", "object-1", true, "cli"));
        repository.record(new AuditEvent(Instant.now(), "proxy", "TRANSFORM", "object-1", true, "cli"));
        AuditProofService proofService = new AuditProofService();
        var proof = proofService.createProof(repository.findAll());
        boolean chainValid = new AuditService(repository).verifyChain().valid();
        boolean proofValid = proofService.verifyProof(proof);
        boolean valid = chainValid && proofValid;
        out.println("{\"command\":\"audit verify\",\"valid\":" + valid
                + ",\"chainValid\":" + chainValid + ",\"signatureValid\":" + proofValid + "}");
        return valid ? 0 : 1;
    }

    private static int verifyAttackMatrix(PrintStream out) throws Exception {
        Path matrix = Path.of("docs", "security", "attack-test-matrix.md");
        long scenarios;
        try (var lines = Files.lines(matrix)) {
            scenarios = lines.filter(line -> line.startsWith("| AT-")).count();
        }
        boolean valid = scenarios >= 30;
        out.println("{\"command\":\"attack-matrix check\",\"valid\":" + valid
                + ",\"scenarioCount\":" + scenarios + "}");
        return valid ? 0 : 1;
    }

    private static int verifyPackage(PrintStream out) {
        ReEncryptedPackage payload = new ReEncryptedPackage("data-cli", "owner", "recipient", AlgorithmType.RSA_PRE,
                Bytes.utf8("ciphertext"), Bytes.utf8("nonce-12byte"), Bytes.utf8("aad"),
                new EncryptedKeyCapsule(AlgorithmType.RSA_PRE, Bytes.utf8("header"), Bytes.utf8("wrapped"),
                        Bytes.utf8("keynonce-12b")), Instant.now());
        payload = payload.withIssuedManifestHash(PackageManifest.issue(payload).manifestHash());
        SchemeDescriptor descriptor = new SchemeDescriptor("RSA_PRE_BASELINE", "CLI fixture", "EXPERIMENTAL",
                "test", true, true, false, "NOT_PRODUCTION_REVIEWED", "IMPLEMENTED");
        SharedPackageV2 issued = SharedPackageV2.issue(payload, descriptor, Instant.now().plusSeconds(30));
        new PackageVerifier().verify(issued, Instant.now());
        boolean tamperRejected;
        try {
            ReEncryptedPackage changed = new ReEncryptedPackage("data-cli", "owner", "recipient",
                    AlgorithmType.RSA_PRE, Bytes.utf8("changed"), Bytes.utf8("nonce-12byte"), Bytes.utf8("aad"),
                    payload.reEncryptedCapsule(), Instant.now());
            new PackageVerifier().verify(new SharedPackageV2(issued.packageVersion(), issued.schemeId(),
                    issued.parameterSpec(), issued.proofStatus(), issued.keyVersion(), issued.expiresAt(),
                    changed, issued.manifest()), Instant.now());
            tamperRejected = false;
        } catch (RuntimeException expected) {
            tamperRejected = true;
        }
        out.println("{\"command\":\"verify-package\",\"valid\":" + tamperRejected
                + ",\"tamperRejected\":" + tamperRejected + "}");
        return tamperRejected ? 0 : 1;
    }

    private static int verifyProof(PrintStream out) throws Exception {
        Instant issuedAt = Instant.now();
        InMemoryProxySigningKeyRegistry keys = new InMemoryProxySigningKeyRegistry();
        ProxySigningKeyRecord key = keys.rotate("proxy-cli", issuedAt);
        PolicyBoundConversionProof unsigned = new PolicyBoundConversionProof("POLICY_BOUND_PROOF_V1",
                "POLICY_BOUND_PRE_V1", "tenant-cli", "data-cli", "grant-cli", "owner", "recipient",
                "proxy-cli", "package-cli", "policy", 1, "capsule", "ciphertext", "aad", "manifest",
                key.keyId(), key.keyEpoch(), issuedAt, issuedAt.plusSeconds(900), "nonce-cli", "pending",
                "Ed25519", "");
        ProofPayloadCanonicalizer canonicalizer = new ProofPayloadCanonicalizer();
        String digest = canonicalizer.digest(unsigned);
        PolicyBoundConversionProof hashed = proofWithSignature(unsigned, digest, "");
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(key.privateKey());
        signer.update(canonicalizer.canonicalBytes(hashed));
        PolicyBoundConversionProof proof = proofWithSignature(hashed, digest,
                Base64.getEncoder().encodeToString(signer.sign()));
        PolicyBoundProofVerifier verifier = new PolicyBoundProofVerifier(keys, new InMemoryProofReplayRepository());
        boolean accepted = verifier.verify(proof, issuedAt.plusSeconds(1), true)
                == PolicyBoundProofVerifier.Decision.ACCEPT;
        boolean replayRejected = verifier.verify(proof, issuedAt.plusSeconds(2), true)
                == PolicyBoundProofVerifier.Decision.PROOF_REPLAY_DETECTED;
        boolean valid = accepted && replayRejected;
        out.println("{\"command\":\"verify-proof\",\"valid\":" + valid
                + ",\"replayRejected\":" + replayRejected + "}");
        return valid ? 0 : 1;
    }

    private static PolicyBoundConversionProof proofWithSignature(PolicyBoundConversionProof proof, String hash,
                                                                  String signature) {
        return new PolicyBoundConversionProof(proof.proofVersion(), proof.algorithmSuite(), proof.tenantId(),
                proof.dataId(), proof.grantId(), proof.ownerId(), proof.recipientId(), proof.proxyId(),
                proof.packageId(), proof.policyHash(), proof.contentKeyVersion(), proof.capsuleHash(),
                proof.ciphertextHash(), proof.aadHash(), proof.manifestHash(), proof.keyId(), proof.keyEpoch(),
                proof.issuedAt(), proof.expiresAt(), proof.proofNonce(), hash, proof.signatureAlgorithm(), signature);
    }

    private static int verifyThreshold(PrintStream out) {
        ThresholdReEncryptionService service = new ThresholdReEncryptionService();
        byte[] secret = Bytes.utf8("threshold-cli");
        List<ThresholdReKeyShare> shares = service.splitForProxies(secret, 2,
                List.of("proxy-a", "proxy-b", "proxy-c"));
        boolean accepted = java.util.Arrays.equals(secret, service.aggregate(List.of(
                service.convertShare("proxy-a", shares.get(0)), service.convertShare("proxy-b", shares.get(1)))));
        boolean insufficientRejected;
        try {
            service.aggregate(List.of(service.convertShare("proxy-a", shares.get(0))));
            insufficientRejected = false;
        } catch (RuntimeException expected) {
            insufficientRejected = true;
        }
        boolean valid = accepted && insufficientRejected;
        out.println("{\"command\":\"verify-threshold\",\"valid\":" + valid
                + ",\"insufficientRejected\":" + insufficientRejected + "}");
        return valid ? 0 : 1;
    }
}
