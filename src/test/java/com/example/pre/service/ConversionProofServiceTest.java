package com.example.pre.service;

import com.example.pre.crypto.ecc.EccPreScheme;
import com.example.pre.model.AccessPolicy;
import com.example.pre.model.ConversionProof;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.UserRole;
import com.example.pre.storage.InMemoryAuditRepository;
import com.example.pre.storage.InMemoryDataRepository;
import com.example.pre.storage.InMemoryGrantRepository;
import com.example.pre.storage.InMemoryReEncryptedPackageRepository;
import com.example.pre.storage.InMemoryUserRepository;
import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConversionProofServiceTest {
	@Test
	void productionAndSecureLocalRejectInMemoryReplayComposition() {
		ConversionProofService service = new ConversionProofService();
		service.assertReplayRepositoryAllowed("DEMO");
		assertThrows(IllegalStateException.class, () -> service.assertReplayRepositoryAllowed("PRODUCTION"));
		assertThrows(IllegalStateException.class, () -> service.assertReplayRepositoryAllowed("SECURE_LOCAL"));
	}

	@Test
	void proxyIssuesDownloadVerifiableProofAndTamperIsRejected() {
		EccPreScheme scheme = new EccPreScheme();
		InMemoryAuditRepository audit = new InMemoryAuditRepository();
		InMemoryDataRepository dataRepository = new InMemoryDataRepository();
		InMemoryGrantRepository grants = new InMemoryGrantRepository();
		InMemoryReEncryptedPackageRepository packages = new InMemoryReEncryptedPackageRepository();
		UserService users = new UserService(scheme, new InMemoryUserRepository(), audit);
		DataSecurityService data = new DataSecurityService(scheme, dataRepository, audit);
		AuthorizationService authz = new AuthorizationService(scheme, audit, grants);
		ObjectAuthorizationService objects = new ObjectAuthorizationService(dataRepository, grants, packages, audit);
		ConversionProofService proofs = new ConversionProofService(
				new com.example.pre.crypto.proof.InMemoryProxySigningKeyRegistry(),
				new com.example.pre.storage.InMemoryProofReplayRepository(), audit);
		ProxyNodeService proxyNodes = new ProxyNodeService(audit);
		proxyNodes.register("admin", "proxy", "fixture", Set.of("default"), Set.of(AlgorithmType.ECC_PRE), 1);
		ProxyReEncryptionService proxy = new ProxyReEncryptionService(scheme, dataRepository, grants, packages, objects,
				audit, proofs, proxyNodes);
		var alice = users.createUser("Alice");
		var bob = users.createUser("Bob");
		var uploaded = data.upload(alice, Bytes.utf8("proof-bound-data"));
		var session = com.example.pre.crypto.ecc.ReKeySessionContext.create();
		var share = DemoPrivateKeyStore.createEccRecipientShareLocally(bob, session);
		var grant = authz.createGrantWithRecipientShare(alice, bob, uploaded,
				AccessPolicy.normal(Instant.now().plusSeconds(300)), share, session);
		var issued = proxy.reEncrypt(new SecurityContext("proxy", UserRole.PROXY, "default", "fixture",
				Instant.now().minusSeconds(1).getEpochSecond(), Instant.now().plusSeconds(60).getEpochSecond(),
				"fixture"), grant.grantId());

		assertTrue(proofs.verifyTrusted(issued.conversionProof(), issued, grant, Instant.now()));
		assertFalse(proofs.verifyTrusted(issued.conversionProof(), issued, grant, Instant.now()));
		assertTrue(audit.findAll().stream().anyMatch(event -> "PROOF_REPLAY".equals(event.message())));
		assertTrue(audit.findAll().stream().anyMatch(event -> event.message().startsWith("proofDigest=")));

		ConversionProof proof = issued.conversionProof();
		ConversionProof tampered = new ConversionProof(proof.proofVersion(), proof.algorithmSuite(), "bad-object",
				proof.grantDigest(), proof.capsuleDigest(), proof.packageDigest(), proof.proxyId(), proof.issuedAt(),
				proof.nonce(), proof.signatureAlgorithm(), proof.publicKey(), proof.signature());
		assertFalse(proofs.verifyTrusted(tampered, issued.withConversionProof(tampered), grant, Instant.now()));

		ConversionProof tenantProof = proofs.issue(issued, grant, "proxy", "tenant-a");
		assertFalse(proofs.verifyTrusted(tenantProof, issued.withConversionProof(tenantProof), grant, "tenant-b",
				Instant.now()));
		assertTrue(proofs.verifyTrusted(tenantProof, issued.withConversionProof(tenantProof), grant, "tenant-a",
				Instant.now()));
	}
}
