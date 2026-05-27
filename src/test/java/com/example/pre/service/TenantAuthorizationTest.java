package com.example.pre.service;

import com.example.pre.crypto.ecc.EccPreScheme;
import com.example.pre.crypto.ecc.ReKeySessionContext;
import com.example.pre.model.AccessPolicy;
import com.example.pre.model.UserRole;
import com.example.pre.storage.InMemoryAuditRepository;
import com.example.pre.storage.InMemoryDataRepository;
import com.example.pre.storage.InMemoryGrantRepository;
import com.example.pre.storage.InMemoryReEncryptedPackageRepository;
import com.example.pre.storage.InMemoryUserRepository;
import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TenantAuthorizationTest {
	@Test
	void rejectsCrossTenantDataGrantPackageAndRecordsScopedReason() {
		EccPreScheme scheme = new EccPreScheme();
		InMemoryAuditRepository audit = new InMemoryAuditRepository();
		InMemoryDataRepository dataRepo = new InMemoryDataRepository();
		InMemoryGrantRepository grants = new InMemoryGrantRepository();
		InMemoryReEncryptedPackageRepository packages = new InMemoryReEncryptedPackageRepository();
		UserService users = new UserService(scheme, new InMemoryUserRepository(), audit);
		var alice = users.createUser("same-user");
		var bob = users.createUser("recipient");
		DataSecurityService dataService = new DataSecurityService(scheme, dataRepo, audit);
		var data = dataService.upload(alice, Bytes.utf8("tenant-a")).withTenant("tenant-a");
		dataRepo.save(data);
		AuthorizationService authorization = new AuthorizationService(scheme, audit, grants);
		ReKeySessionContext session = ReKeySessionContext.create();
		var grant = authorization.createGrantWithRecipientShare(alice, bob, data,
				AccessPolicy.normal(Instant.now().plusSeconds(600)),
				DemoPrivateKeyStore.createEccRecipientShareLocally(bob, session), session);
		ObjectAuthorizationService objects = new ObjectAuthorizationService(dataRepo, grants, packages, audit);
		ProxyReEncryptionService proxy = new ProxyReEncryptionService(scheme, dataRepo, grants, packages, objects,
				audit);
		SecurityContext proxyA = actor("proxy", UserRole.PROXY, "tenant-a");
		var dataPackage = proxy.reEncrypt(proxyA, grant.grantId());

		assertThrows(ReKeyShareException.class,
				() -> objects.assertCanReadData(actor("same-user", UserRole.OWNER, "tenant-b"), data.dataId()));
		assertThrows(ReKeyShareException.class,
				() -> objects.assertCanReEncryptGrant(actor("proxy", UserRole.PROXY, "tenant-b"), grant.grantId()));
		ReKeyShareException denied = assertThrows(ReKeyShareException.class, () -> objects
				.assertCanDownloadPackage(actor("recipient", UserRole.RECIPIENT, "tenant-b"), dataPackage.packageId()));
		assertEquals(ErrorCode.PACKAGE_NOT_FOUND, denied.code());
		assertTrue(audit.findAll().stream().anyMatch(
				event -> "tenant-b".equals(event.tenantId()) && event.message().contains("TENANT_MISMATCH_PACKAGE")));
	}

	private static SecurityContext actor(String id, UserRole role, String tenantId) {
		return new SecurityContext(id, role, tenantId, "fixture", 0, Long.MAX_VALUE);
	}
}
