package com.example.pre.service;

import com.example.pre.crypto.rsa.RsaCommonModulusParameters;
import com.example.pre.crypto.rsa.RsaPreScheme;
import com.example.pre.model.AccessPolicy;
import com.example.pre.model.EncryptedDataPackage;
import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.storage.InMemoryAuditRepository;
import com.example.pre.storage.InMemoryDataRepository;
import com.example.pre.storage.InMemoryGrantRepository;
import com.example.pre.storage.InMemoryReEncryptedPackageRepository;
import com.example.pre.storage.InMemoryUserRepository;
import com.example.pre.util.Bytes;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

class DataSecurityUploadEncryptedReEncryptTest {
	@Test
	void uploadEncryptedPackageCanBeReEncryptedAndDecryptedByRecipient() {
		RsaPreScheme scheme = new RsaPreScheme(RsaCommonModulusParameters.generate(1024));
		InMemoryAuditRepository audit = new InMemoryAuditRepository();
		InMemoryDataRepository dataRepository = new InMemoryDataRepository();
		InMemoryGrantRepository grantRepository = new InMemoryGrantRepository();
		InMemoryReEncryptedPackageRepository packageRepository = new InMemoryReEncryptedPackageRepository();
		UserService users = new UserService(scheme, new InMemoryUserRepository(), audit);
		DataSecurityService data = new DataSecurityService(scheme, dataRepository, audit);
		AuthorizationService authorization = new AuthorizationService(scheme, audit, grantRepository);
		ObjectAuthorizationService objectAuth = new ObjectAuthorizationService(dataRepository, grantRepository,
				packageRepository, audit);
		ProxyReEncryptionService proxy = new ProxyReEncryptionService(scheme, dataRepository, grantRepository,
				packageRepository, objectAuth, audit);

		var alice = users.createUser("alice");
		var bob = users.createUser("bob");
		byte[] plaintext = Bytes.utf8("salary.xlsx contents");

		EncryptedDataPackage encrypted = data.upload(alice, plaintext);
		var context = DataSecurityService.capsuleContext(encrypted);
		EncryptedDataPackage accepted = data.uploadEncrypted(new DataSecurityService.UploadEncryptedCommand(alice,
				encrypted.encryptedContent(), encrypted.contentNonce(), encrypted.aad(), encrypted.originalCapsule(),
				context, encrypted.originalSize(), encrypted.fileName(), encrypted.contentType()));

		AccessPolicy policy = AccessPolicy.normal(Instant.now().plus(1, ChronoUnit.DAYS));
		var grant = authorization.createGrant(alice, bob, accepted, policy);

		ReEncryptedPackage reEncrypted = proxy.reEncrypt("proxy", grant.grantId());

		assertArrayEquals(plaintext, data.decryptReEncrypted(bob, reEncrypted));
	}
}
