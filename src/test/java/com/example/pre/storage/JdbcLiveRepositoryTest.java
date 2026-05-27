package com.example.pre.storage;

import com.example.pre.crypto.ecc.EccPreScheme;
import com.example.pre.crypto.ecc.ReKeySessionContext;
import com.example.pre.crypto.symmetric.AesGcm;
import com.example.pre.model.AccessPolicy;
import com.example.pre.model.CapsuleContext;
import com.example.pre.model.EncryptedDataPackage;
import com.example.pre.model.GrantStatus;
import com.example.pre.model.PackageStatus;
import com.example.pre.model.User;
import com.example.pre.service.AuthorizationService;
import com.example.pre.service.DataSecurityService;
import com.example.pre.service.DemoPrivateKeyStore;
import com.example.pre.service.ObjectAuthorizationService;
import com.example.pre.service.ProxyReEncryptionService;
import com.example.pre.service.ReKeyShareException;
import com.example.pre.service.RevocationService;
import com.example.pre.service.UserService;
import com.example.pre.util.AadBuilder;
import com.example.pre.util.Bytes;
import com.example.pre.util.SecureRandomUtil;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JdbcLiveRepositoryTest {
	@Test
	void persistsDataGrantPackageAndRevocationAcrossRestart() {
		Fixture first = new Fixture(url());
		var data = first.data.upload(first.alice, Bytes.utf8("durable secret"));
		var grant = first.grant(data);
		var dataPackage = first.proxy.reEncrypt("proxy", grant.grantId());

		Fixture restarted = first.restart();
		assertArrayEquals(data.encryptedContent(),
				restarted.dataRepo.findById(data.dataId()).orElseThrow().encryptedContent());
		assertEquals(GrantStatus.ACTIVE, restarted.grants.findById(grant.grantId()).orElseThrow().status());
		assertEquals(PackageStatus.ACTIVE, restarted.packages.findById(dataPackage.packageId()).orElseThrow().status());

		restarted.revocation.revokeGrant(first.alice.userId(), grant.grantId(), "durable revoke");
		Fixture restartedAgain = first.restart();
		assertEquals(GrantStatus.REVOKED, restartedAgain.grants.findById(grant.grantId()).orElseThrow().status());
		assertEquals(PackageStatus.INVALIDATED,
				restartedAgain.packages.findById(dataPackage.packageId()).orElseThrow().status());
		assertThrows(ReKeyShareException.class,
				() -> restartedAgain.objectAuth.assertCanDownloadPackage(first.bob.userId(), dataPackage.packageId()));
	}

	@Test
	void persistsOwnerRotationAndRejectsOldPackageAfterRestart() {
		Fixture first = new Fixture(url());
		EncryptedDataPackage original = first.data.upload(first.alice, Bytes.utf8("rotate me"));
		var grant = first.grant(original);
		var oldPackage = first.proxy.reEncrypt("proxy", grant.grantId());
		EncryptedDataPackage rotated = first.rotated(original);
		first.revocation.acceptOwnerSideRotation(first.alice, rotated);

		Fixture restarted = first.restart();
		assertEquals(2, restarted.dataRepo.findById(original.dataId()).orElseThrow().contentKeyVersion());
		assertEquals(GrantStatus.ROTATED, restarted.grants.findById(grant.grantId()).orElseThrow().status());
		assertEquals(PackageStatus.ROTATED, restarted.packages.findById(oldPackage.packageId()).orElseThrow().status());
		assertThrows(ReKeyShareException.class,
				() -> restarted.objectAuth.assertCanDownloadPackage(first.bob.userId(), oldPackage.packageId()));
	}

	private static String url() {
		return "jdbc:h2:file:" + Path.of("target", "jdbc-test", "live-" + java.util.UUID.randomUUID()).toAbsolutePath()
				+ ";DB_CLOSE_DELAY=0";
	}

	private static final class Fixture {
		final String url;
		final EccPreScheme scheme = new EccPreScheme();
		final InMemoryAuditRepository audit = new InMemoryAuditRepository();
		final JdbcDataRepository dataRepo;
		final JdbcGrantRepository grants;
		final JdbcReEncryptedPackageRepository packages;
		final DataSecurityService data;
		final AuthorizationService authorization;
		final ObjectAuthorizationService objectAuth;
		final ProxyReEncryptionService proxy;
		final RevocationService revocation;
		final User alice;
		final User bob;

		Fixture(String url) {
			this.url = url;
			dataRepo = new JdbcDataRepository(url, "sa", "");
			grants = new JdbcGrantRepository(url, "sa", "");
			packages = new JdbcReEncryptedPackageRepository(url, "sa", "");
			data = new DataSecurityService(scheme, dataRepo, audit);
			authorization = new AuthorizationService(scheme, audit, grants);
			objectAuth = new ObjectAuthorizationService(dataRepo, grants, packages, audit);
			proxy = new ProxyReEncryptionService(scheme, dataRepo, grants, packages, objectAuth, audit);
			revocation = new RevocationService(scheme, dataRepo, grants, packages, objectAuth, audit);
			UserService users = new UserService(scheme, new InMemoryUserRepository(), audit);
			alice = users.createUser("Alice");
			bob = users.createUser("Bob");
		}

		Fixture restart() {
			return new Fixture(url);
		}

		com.example.pre.model.ShareGrant grant(EncryptedDataPackage uploaded) {
			ReKeySessionContext context = ReKeySessionContext.create();
			return authorization.createGrantWithRecipientShare(alice, bob, uploaded,
					AccessPolicy.normal(Instant.now().plusSeconds(600)),
					DemoPrivateKeyStore.createEccRecipientShareLocally(bob, context), context);
		}

		EncryptedDataPackage rotated(EncryptedDataPackage original) {
			CapsuleContext context = new CapsuleContext(original.dataId(), alice.userId(), alice.userId(),
					original.algorithm(), original.ownerKeyId(), 2, "ROTATED");
			byte[] key = SecureRandomUtil.randomBytes(AesGcm.KEY_BYTES);
			try {
				byte[] aad = AadBuilder.build(context);
				AesGcm.CipherText encrypted = AesGcm.encrypt(key, Bytes.utf8("rotate me"), aad);
				return original.withOwnerSideEncryptedVersion(encrypted.ciphertext(), encrypted.nonce(), aad,
						scheme.encapsulate(key, alice.keyPair().publicKey(), context), 2, "ROTATED",
						com.example.pre.crypto.hash.Hash.sha256Hex(aad));
			} finally {
				Arrays.fill(key, (byte) 0);
			}
		}
	}
}
