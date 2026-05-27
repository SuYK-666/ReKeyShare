package com.example.pre.storage;

import com.example.pre.model.AlgorithmType;
import com.example.pre.model.ConversionProof;
import com.example.pre.model.PackageStatus;
import com.example.pre.model.ReEncryptedPackage;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class JdbcReEncryptedPackageRepository implements ReEncryptedPackageRepository {
	private final String jdbcUrl;
	private final String username;
	private final String password;
	private final String tenantId;

	public JdbcReEncryptedPackageRepository(String jdbcUrl, String username, String password) {
		this(jdbcUrl, username, password, "default");
	}

	public JdbcReEncryptedPackageRepository(String jdbcUrl, String username, String password, String tenantId) {
		this.jdbcUrl = jdbcUrl;
		this.username = username;
		this.password = password;
		this.tenantId = tenantId;
		initialize();
	}

	@Override
	public synchronized void save(ReEncryptedPackage dataPackage) {
		String sql = """
				merge into packages (
				  tenant_id, package_id, grant_id, data_id, recipient_id, status, content_key_version,
				  conversion_proof_digest, proof_public_key_id, created_at, owner_id, algorithm,
				  encrypted_content, content_nonce, aad, ciphertext_storage_path, owner_key_id, policy_hash,
				  grant_policy_hash, owner_context_hash, grant_context_hash, grant_aad, invalidated_at,
				  invalidated_reason, issued_manifest_hash, capsule_id, capsule_parameter_spec,
				  capsule_owner_key_id, capsule_owner_key_version, capsule_header, capsule_wrapped_key,
				  capsule_key_nonce, capsule_aad_hash, capsule_context_hash, capsule_created_at,
				  proof_version, proof_algorithm_suite, proof_object_digest, proof_grant_digest,
				  proof_capsule_digest, proof_package_digest, proof_proxy_id, proof_issued_at, proof_nonce,
				  proof_signature_algorithm, proof_public_key, proof_signature, proof_tenant_id,
				  proof_policy_hash, proof_aad_hash, proof_key_id, proof_key_epoch, proof_expires_at,
				  proof_canonical_payload_hash
				) key (tenant_id, package_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
				  ?, ?, ?)
				""";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			ConversionProof proof = dataPackage.conversionProof();
			int i = 1;
			statement.setString(i++, dataPackage.tenantId());
			statement.setString(i++, dataPackage.packageId());
			statement.setString(i++, dataPackage.grantId());
			statement.setString(i++, dataPackage.dataId());
			statement.setString(i++, dataPackage.recipientId());
			statement.setString(i++, dataPackage.status().name());
			statement.setInt(i++, dataPackage.contentKeyVersion());
			statement.setString(i++,
					proof == null ? null : com.example.pre.service.ConversionProofService.digest(proof));
			statement.setString(i++, proof == null ? null : proof.keyId());
			statement.setTimestamp(i++, Timestamp.from(dataPackage.authorizedAt()));
			statement.setString(i++, dataPackage.ownerId());
			statement.setString(i++, dataPackage.algorithm().name());
			statement.setBytes(i++, dataPackage.encryptedContent());
			statement.setBytes(i++, dataPackage.contentNonce());
			statement.setBytes(i++, dataPackage.aad());
			statement.setString(i++, dataPackage.ciphertextStoragePath());
			statement.setString(i++, dataPackage.ownerKeyId());
			statement.setString(i++, dataPackage.policyHash());
			statement.setString(i++, dataPackage.grantPolicyHash());
			statement.setString(i++, dataPackage.ownerContextHash());
			statement.setString(i++, dataPackage.grantContextHash());
			statement.setBytes(i++, dataPackage.grantAad());
			timestamp(statement, i++, dataPackage.invalidatedAt());
			statement.setString(i++, dataPackage.invalidatedReason());
			statement.setString(i++, dataPackage.issuedManifestHash());
			statement.setString(i++, dataPackage.reEncryptedCapsule().capsuleId());
			statement.setString(i++, dataPackage.reEncryptedCapsule().parameterSpec());
			statement.setString(i++, dataPackage.reEncryptedCapsule().ownerKeyId());
			statement.setInt(i++, dataPackage.reEncryptedCapsule().ownerKeyVersion());
			statement.setBytes(i++, dataPackage.reEncryptedCapsule().header());
			statement.setBytes(i++, dataPackage.reEncryptedCapsule().wrappedKey());
			statement.setBytes(i++, dataPackage.reEncryptedCapsule().keyNonce());
			statement.setString(i++, dataPackage.reEncryptedCapsule().aadHash());
			statement.setString(i++, dataPackage.reEncryptedCapsule().contextHash());
			statement.setTimestamp(i++, Timestamp.from(dataPackage.reEncryptedCapsule().createdAt()));
			i = bindProof(statement, i, proof);
			statement.executeUpdate();
		} catch (SQLException e) {
			throw new IllegalStateException("re-encrypted package persistence failed", e);
		}
	}

	@Override
	public synchronized Optional<ReEncryptedPackage> findById(String packageId) {
		return query("select * from packages where tenant_id = ? and package_id = ?", packageId).stream().findFirst();
	}

	@Override
	public synchronized Optional<ReEncryptedPackage> findByTenantAndId(String scopedTenantId, String packageId) {
		return query(scopedTenantId, "select * from packages where tenant_id = ? and package_id = ?", packageId)
				.stream().findFirst();
	}

	@Override
	public synchronized Collection<ReEncryptedPackage> findAll() {
		return query("select * from packages where tenant_id = ? order by created_at, package_id", null);
	}

	private List<ReEncryptedPackage> query(String sql, String value) {
		return query(tenantId, sql, value);
	}

	private List<ReEncryptedPackage> query(String scopedTenantId, String sql, String value) {
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, scopedTenantId);
			if (value != null) {
				statement.setString(2, value);
			}
			try (ResultSet result = statement.executeQuery()) {
				List<ReEncryptedPackage> packages = new ArrayList<>();
				while (result.next()) {
					packages.add(read(result));
				}
				return List.copyOf(packages);
			}
		} catch (SQLException e) {
			throw new IllegalStateException("re-encrypted package query failed", e);
		}
	}

	private ReEncryptedPackage read(ResultSet result) throws SQLException {
		return new ReEncryptedPackage(result.getString("package_id"), result.getString("grant_id"),
				result.getString("data_id"), result.getString("owner_id"), result.getString("recipient_id"),
				AlgorithmType.valueOf(result.getString("algorithm")), result.getBytes("encrypted_content"),
				result.getBytes("content_nonce"), result.getBytes("aad"), JdbcObjectCodec.readCapsule(result),
				result.getTimestamp("created_at").toInstant(), result.getInt("content_key_version"),
				result.getString("ciphertext_storage_path"), result.getString("owner_key_id"),
				result.getString("policy_hash"), result.getString("grant_policy_hash"),
				result.getString("owner_context_hash"), result.getString("grant_context_hash"),
				result.getBytes("grant_aad"), PackageStatus.valueOf(result.getString("status")),
				JdbcObjectCodec.instant(result, "invalidated_at"), result.getString("invalidated_reason"),
				result.getString("issued_manifest_hash"), JdbcObjectCodec.readProof(result),
				result.getString("tenant_id"));
	}

	private static int bindProof(PreparedStatement statement, int i, ConversionProof proof) throws SQLException {
		statement.setString(i++, proof == null ? null : proof.proofVersion());
		statement.setString(i++, proof == null ? null : proof.algorithmSuite());
		statement.setString(i++, proof == null ? null : proof.objectDigest());
		statement.setString(i++, proof == null ? null : proof.grantDigest());
		statement.setString(i++, proof == null ? null : proof.capsuleDigest());
		statement.setString(i++, proof == null ? null : proof.packageDigest());
		statement.setString(i++, proof == null ? null : proof.proxyId());
		timestamp(statement, i++, proof == null ? null : proof.issuedAt());
		statement.setString(i++, proof == null ? null : proof.nonce());
		statement.setString(i++, proof == null ? null : proof.signatureAlgorithm());
		statement.setString(i++, proof == null ? null : proof.publicKey());
		statement.setString(i++, proof == null ? null : proof.signature());
		statement.setString(i++, proof == null ? null : proof.tenantId());
		statement.setString(i++, proof == null ? null : proof.policyHash());
		statement.setString(i++, proof == null ? null : proof.aadHash());
		statement.setString(i++, proof == null ? null : proof.keyId());
		if (proof == null) {
			statement.setNull(i++, java.sql.Types.BIGINT);
		} else {
			statement.setLong(i++, proof.keyEpoch());
		}
		timestamp(statement, i++, proof == null ? null : proof.expiresAt());
		statement.setString(i++, proof == null ? null : proof.canonicalPayloadHash());
		return i;
	}

	private void initialize() {
		try (Connection connection = connection()) {
			JdbcSchemaInitializer.initialize(connection);
		} catch (SQLException e) {
			throw new IllegalStateException("package repository schema initialization failed", e);
		}
	}

	private static void timestamp(PreparedStatement statement, int index, Instant value) throws SQLException {
		statement.setTimestamp(index, value == null ? null : Timestamp.from(value));
	}

	private Connection connection() throws SQLException {
		return DriverManager.getConnection(jdbcUrl, username, password);
	}
}
