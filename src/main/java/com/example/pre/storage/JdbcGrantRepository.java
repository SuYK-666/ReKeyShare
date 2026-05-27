package com.example.pre.storage;

import com.example.pre.model.AccessPolicy;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.GrantStatus;
import com.example.pre.model.ShareGrant;

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

public final class JdbcGrantRepository implements GrantRepository {
	private final String jdbcUrl;
	private final String username;
	private final String password;
	private final String tenantId;

	public JdbcGrantRepository(String jdbcUrl, String username, String password) {
		this(jdbcUrl, username, password, "default");
	}

	public JdbcGrantRepository(String jdbcUrl, String username, String password, String tenantId) {
		this.jdbcUrl = jdbcUrl;
		this.username = username;
		this.password = password;
		this.tenantId = tenantId;
		initialize();
	}

	@Override
	public synchronized void save(ShareGrant grant) {
		String sql = """
				merge into grants (
				  tenant_id, grant_id, data_id, owner_id, recipient_id, status, policy_hash, content_key_version,
				  max_access_count, max_reencrypt_count, max_download_count, max_decrypt_count, access_count,
				  reencrypt_count, download_count, decrypt_count, version, algorithm, allow_preview,
				  allow_download, allow_reshare, preview_count, expires_at, created_at, revoked_at,
				  revoke_reason, purpose, allowed_actions, rekey_type, rekey_value_1, rekey_value_2
				) key (tenant_id, grant_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?,
				  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""";
		try (Connection connection = connection()) {
			ensureUser(connection, grant.tenantId(), grant.ownerId(), "OWNER");
			ensureUser(connection, grant.tenantId(), grant.recipientId(), "RECIPIENT");
			try (PreparedStatement statement = connection.prepareStatement(sql)) {
				int i = 1;
				statement.setString(i++, grant.tenantId());
				statement.setString(i++, grant.grantId());
				statement.setString(i++, grant.dataId());
				statement.setString(i++, grant.ownerId());
				statement.setString(i++, grant.recipientId());
				statement.setString(i++, grant.status().name());
				statement.setString(i++, grant.policyHash());
				statement.setInt(i++, grant.contentKeyVersion());
				statement.setInt(i++, grant.policy().maxAccessCount());
				statement.setInt(i++, grant.policy().maxReEncryptCount());
				statement.setInt(i++, grant.policy().maxDownloadCount());
				statement.setInt(i++, grant.policy().maxDecryptCount());
				statement.setInt(i++, grant.accessCount());
				statement.setInt(i++, grant.reEncryptCount());
				statement.setInt(i++, grant.downloadCount());
				statement.setInt(i++, grant.decryptCount());
				statement.setString(i++, grant.algorithm().name());
				statement.setBoolean(i++, grant.policy().allowPreview());
				statement.setBoolean(i++, grant.policy().allowDownload());
				statement.setBoolean(i++, grant.policy().allowReshare());
				statement.setInt(i++, grant.previewCount());
				timestamp(statement, i++, grant.expiresAt());
				statement.setTimestamp(i++, Timestamp.from(grant.createdAt()));
				timestamp(statement, i++, grant.revokedAt());
				statement.setString(i++, grant.revokeReason());
				statement.setString(i++, grant.policy().purpose());
				statement.setString(i++, grant.policy().allowedActions());
				statement.setString(i++, JdbcObjectCodec.reKeyType(grant.reKey()));
				statement.setString(i++, JdbcObjectCodec.reKeyValue1(grant.reKey()));
				statement.setString(i, JdbcObjectCodec.reKeyValue2(grant.reKey()));
				statement.executeUpdate();
			}
		} catch (SQLException e) {
			throw new IllegalStateException("grant persistence failed", e);
		}
	}

	@Override
	public synchronized Optional<ShareGrant> findById(String grantId) {
		return query("select * from grants where tenant_id = ? and grant_id = ?", grantId).stream().findFirst();
	}

	@Override
	public synchronized Optional<ShareGrant> findByTenantAndId(String scopedTenantId, String grantId) {
		return query(scopedTenantId, "select * from grants where tenant_id = ? and grant_id = ?", grantId).stream()
				.findFirst();
	}

	@Override
	public synchronized Collection<ShareGrant> findByTenantAndDataId(String scopedTenantId, String dataId) {
		return query(scopedTenantId, "select * from grants where tenant_id = ? and data_id = ? order by grant_id",
				dataId);
	}

	@Override
	public synchronized Collection<ShareGrant> findAll() {
		return query("select * from grants where tenant_id = ? order by grant_id", null);
	}

	@Override
	public synchronized Collection<ShareGrant> findByDataId(String dataId) {
		return query("select * from grants where tenant_id = ? and data_id = ? order by grant_id", dataId);
	}

	private List<ShareGrant> query(String sql, String value) {
		return query(tenantId, sql, value);
	}

	private List<ShareGrant> query(String scopedTenantId, String sql, String value) {
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, scopedTenantId);
			if (value != null) {
				statement.setString(2, value);
			}
			try (ResultSet result = statement.executeQuery()) {
				List<ShareGrant> grants = new ArrayList<>();
				while (result.next()) {
					grants.add(read(result));
				}
				return List.copyOf(grants);
			}
		} catch (SQLException e) {
			throw new IllegalStateException("grant query failed", e);
		}
	}

	private ShareGrant read(ResultSet result) throws SQLException {
		AccessPolicy policy = new AccessPolicy(result.getBoolean("allow_preview"), result.getBoolean("allow_download"),
				result.getBoolean("allow_reshare"), result.getInt("max_access_count"),
				result.getInt("max_reencrypt_count"), result.getInt("max_download_count"),
				result.getInt("max_decrypt_count"), JdbcObjectCodec.instant(result, "expires_at"),
				result.getString("purpose"), result.getString("allowed_actions"));
		JdbcObjectCodec.ShareGrantFields fields = new JdbcObjectCodec.ShareGrantFields(result.getString("grant_id"),
				result.getString("data_id"), result.getString("recipient_id"), result.getInt("content_key_version"),
				result.getString("policy_hash"), JdbcObjectCodec.instant(result, "expires_at"),
				result.getInt("max_reencrypt_count"));
		return new ShareGrant(fields.grantId(), fields.dataId(), result.getString("owner_id"), fields.recipientId(),
				AlgorithmType.valueOf(result.getString("algorithm")), GrantStatus.valueOf(result.getString("status")),
				policy, fields.policyHash(), JdbcObjectCodec.readReKey(result, fields), result.getInt("access_count"),
				result.getInt("reencrypt_count"), result.getInt("download_count"), result.getInt("decrypt_count"),
				result.getInt("preview_count"), JdbcObjectCodec.instant(result, "created_at"), fields.expiresAt(),
				JdbcObjectCodec.instant(result, "revoked_at"), result.getString("revoke_reason"),
				fields.contentKeyVersion(), result.getString("tenant_id"));
	}

	private void initialize() {
		try (Connection connection = connection()) {
			JdbcSchemaInitializer.initialize(connection);
		} catch (SQLException e) {
			throw new IllegalStateException("grant repository schema initialization failed", e);
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

	private static void timestamp(PreparedStatement statement, int index, java.time.Instant value) throws SQLException {
		statement.setTimestamp(index, value == null ? null : Timestamp.from(value));
	}

	private Connection connection() throws SQLException {
		return DriverManager.getConnection(jdbcUrl, username, password);
	}
}
