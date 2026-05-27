package com.example.pre.storage;

import com.example.pre.model.AlgorithmType;
import com.example.pre.model.EncryptedDataPackage;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class JdbcDataRepository implements DataRepository {
	private final String jdbcUrl;
	private final String username;
	private final String password;
	private final String tenantId;

	public JdbcDataRepository(String jdbcUrl, String username, String password) {
		this(jdbcUrl, username, password, "default");
	}

	public JdbcDataRepository(String jdbcUrl, String username, String password, String tenantId) {
		this.jdbcUrl = jdbcUrl;
		this.username = username;
		this.password = password;
		this.tenantId = tenantId;
		initialize();
	}

	@Override
	public void save(EncryptedDataPackage data) {
		String sql = """
				merge into data_objects (
				  tenant_id, data_id, owner_id, algorithm, status, content_key_version, ciphertext_hash,
				  storage_path, version, created_at, encrypted_content, content_nonce, aad, file_name,
				  content_type, original_size, ciphertext_size, owner_key_id, policy_hash, context_hash,
				  capsule_id, capsule_parameter_spec, capsule_owner_key_id, capsule_owner_key_version,
				  capsule_header, capsule_wrapped_key, capsule_key_nonce, capsule_aad_hash,
				  capsule_context_hash, capsule_created_at
				) key (tenant_id, data_id) values (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?,
				  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""";
		try (Connection connection = connection()) {
			ensureUser(connection, data.tenantId(), data.ownerId(), "OWNER");
			try (PreparedStatement statement = connection.prepareStatement(sql)) {
				int i = 1;
				statement.setString(i++, data.tenantId());
				statement.setString(i++, data.dataId());
				statement.setString(i++, data.ownerId());
				statement.setString(i++, data.algorithm().name());
				statement.setInt(i++, data.contentKeyVersion());
				statement.setString(i++, data.ciphertextHash());
				statement.setString(i++, data.storagePath());
				statement.setTimestamp(i++, Timestamp.from(data.createdAt()));
				statement.setBytes(i++, data.encryptedContent());
				statement.setBytes(i++, data.contentNonce());
				statement.setBytes(i++, data.aad());
				statement.setString(i++, data.fileName());
				statement.setString(i++, data.contentType());
				statement.setLong(i++, data.originalSize());
				statement.setLong(i++, data.ciphertextSize());
				statement.setString(i++, data.ownerKeyId());
				statement.setString(i++, data.policyHash());
				statement.setString(i++, data.contextHash());
				statement.setString(i++, data.originalCapsule().capsuleId());
				statement.setString(i++, data.originalCapsule().parameterSpec());
				statement.setString(i++, data.originalCapsule().ownerKeyId());
				statement.setInt(i++, data.originalCapsule().ownerKeyVersion());
				statement.setBytes(i++, data.originalCapsule().header());
				statement.setBytes(i++, data.originalCapsule().wrappedKey());
				statement.setBytes(i++, data.originalCapsule().keyNonce());
				statement.setString(i++, data.originalCapsule().aadHash());
				statement.setString(i++, data.originalCapsule().contextHash());
				statement.setTimestamp(i, Timestamp.from(data.originalCapsule().createdAt()));
				statement.executeUpdate();
			}
		} catch (SQLException e) {
			throw new IllegalStateException("data object persistence failed", e);
		}
	}

	@Override
	public Optional<EncryptedDataPackage> findById(String dataId) {
		String sql = "select * from data_objects where tenant_id = ? and data_id = ?";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, tenantId);
			statement.setString(2, dataId);
			try (ResultSet result = statement.executeQuery()) {
				return result.next() ? Optional.of(read(result)) : Optional.empty();
			}
		} catch (SQLException e) {
			throw new IllegalStateException("data object query failed", e);
		}
	}

	@Override
	public Optional<EncryptedDataPackage> findByTenantAndId(String scopedTenantId, String dataId) {
		String sql = "select * from data_objects where tenant_id = ? and data_id = ?";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, scopedTenantId);
			statement.setString(2, dataId);
			try (ResultSet result = statement.executeQuery()) {
				return result.next() ? Optional.of(read(result)) : Optional.empty();
			}
		} catch (SQLException e) {
			throw new IllegalStateException("tenant-scoped data object query failed", e);
		}
	}

	@Override
	public Collection<EncryptedDataPackage> findAll() {
		String sql = "select * from data_objects where tenant_id = ? order by created_at, data_id";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, tenantId);
			try (ResultSet result = statement.executeQuery()) {
				List<EncryptedDataPackage> objects = new ArrayList<>();
				while (result.next()) {
					objects.add(read(result));
				}
				return List.copyOf(objects);
			}
		} catch (SQLException e) {
			throw new IllegalStateException("data object list failed", e);
		}
	}

	private EncryptedDataPackage read(ResultSet result) throws SQLException {
		return new EncryptedDataPackage(result.getString("data_id"), result.getString("owner_id"),
				AlgorithmType.valueOf(result.getString("algorithm")), result.getBytes("encrypted_content"),
				result.getBytes("content_nonce"), result.getBytes("aad"), JdbcObjectCodec.readCapsule(result),
				result.getTimestamp("created_at").toInstant(), result.getString("file_name"),
				result.getString("content_type"), result.getLong("original_size"), result.getLong("ciphertext_size"),
				result.getString("ciphertext_hash"), result.getString("owner_key_id"),
				result.getInt("content_key_version"), result.getString("storage_path"), result.getString("policy_hash"),
				result.getString("context_hash"), result.getString("tenant_id"));
	}

	private void initialize() {
		try (Connection connection = connection()) {
			JdbcSchemaInitializer.initialize(connection);
		} catch (SQLException e) {
			throw new IllegalStateException("data repository schema initialization failed", e);
		}
	}

	private void ensureUser(Connection connection, String scopedTenantId, String userId, String role)
			throws SQLException {
		try (PreparedStatement statement = connection.prepareStatement("""
				merge into users (tenant_id, user_id, role, status, created_at) key (tenant_id, user_id)
				values (?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)
				""")) {
			statement.setString(1, scopedTenantId);
			statement.setString(2, userId);
			statement.setString(3, role);
			statement.executeUpdate();
		}
	}

	private Connection connection() throws SQLException {
		return DriverManager.getConnection(jdbcUrl, username, password);
	}
}
