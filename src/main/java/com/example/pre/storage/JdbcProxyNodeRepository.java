package com.example.pre.storage;

import com.example.pre.model.AlgorithmType;
import com.example.pre.model.ProxyNode;
import com.example.pre.model.ProxyNodeStatus;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public final class JdbcProxyNodeRepository implements ProxyNodeRepository {
	private static final String REGISTRY_TENANT = "__registry__";
	private final String jdbcUrl;
	private final String username;
	private final String password;

	public JdbcProxyNodeRepository(String jdbcUrl, String username, String password) {
		this.jdbcUrl = jdbcUrl;
		this.username = username;
		this.password = password;
		try (Connection connection = connection()) {
			JdbcSchemaInitializer.initialize(connection);
		} catch (SQLException e) {
			throw new IllegalStateException("proxy repository schema initialization failed", e);
		}
	}

	@Override
	public void save(ProxyNode node) {
		String sql = """
				merge into proxy_nodes (tenant_id, proxy_id, status, certificate_fingerprint, allowed_tenant_ids,
				  allowed_scheme_ids, quota, usage_count, suspended_reason, created_at, revoked_at, updated_at)
				key (tenant_id, proxy_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, REGISTRY_TENANT);
			statement.setString(2, node.proxyId());
			statement.setString(3, node.status().name());
			statement.setString(4, node.certificateFingerprint());
			statement.setString(5, String.join(",", node.allowedTenantIds()));
			statement.setString(6, node.allowedSchemeIds().stream().map(Enum::name).sorted()
					.collect(java.util.stream.Collectors.joining(",")));
			statement.setLong(7, node.quota());
			statement.setLong(8, node.usageCount());
			statement.setString(9, node.suspendedReason());
			statement.setTimestamp(10, Timestamp.from(node.createdAt()));
			statement.setTimestamp(11, node.revokedAt() == null ? null : Timestamp.from(node.revokedAt()));
			statement.setTimestamp(12, Timestamp.from(node.lastSeenAt()));
			statement.executeUpdate();
		} catch (SQLException e) {
			throw new IllegalStateException("proxy node persistence failed", e);
		}
	}

	@Override
	public Optional<ProxyNode> findById(String proxyId) {
		try (Connection connection = connection();
				PreparedStatement statement = connection
						.prepareStatement("select * from proxy_nodes where tenant_id = ? and proxy_id = ?")) {
			statement.setString(1, REGISTRY_TENANT);
			statement.setString(2, proxyId);
			try (ResultSet result = statement.executeQuery()) {
				return result.next() ? Optional.of(read(result)) : Optional.empty();
			}
		} catch (SQLException e) {
			throw new IllegalStateException("proxy node query failed", e);
		}
	}

	@Override
	public Collection<ProxyNode> findAll() {
		try (Connection connection = connection();
				PreparedStatement statement = connection
						.prepareStatement("select * from proxy_nodes where tenant_id = ? order by proxy_id")) {
			statement.setString(1, REGISTRY_TENANT);
			try (ResultSet result = statement.executeQuery()) {
				java.util.ArrayList<ProxyNode> nodes = new java.util.ArrayList<>();
				while (result.next()) {
					nodes.add(read(result));
				}
				return List.copyOf(nodes);
			}
		} catch (SQLException e) {
			throw new IllegalStateException("proxy node list failed", e);
		}
	}

	@Override
	public boolean consumeUse(String proxyId) {
		String sql = """
				update proxy_nodes set usage_count = usage_count + 1, updated_at = ?
				 where tenant_id = ? and proxy_id = ? and status = 'ACTIVE' and usage_count < quota
				""";
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setTimestamp(1, Timestamp.from(Instant.now()));
			statement.setString(2, REGISTRY_TENANT);
			statement.setString(3, proxyId);
			return statement.executeUpdate() == 1;
		} catch (SQLException e) {
			throw new IllegalStateException("atomic proxy quota consumption failed", e);
		}
	}

	private static ProxyNode read(ResultSet result) throws SQLException {
		Timestamp revoked = result.getTimestamp("revoked_at");
		return new ProxyNode(result.getString("proxy_id"), result.getString("certificate_fingerprint"),
				ProxyNodeStatus.valueOf(result.getString("status")), strings(result.getString("allowed_tenant_ids")),
				algorithms(result.getString("allowed_scheme_ids")), result.getLong("quota"),
				result.getLong("usage_count"), result.getString("suspended_reason"),
				result.getTimestamp("created_at").toInstant(), revoked == null ? null : revoked.toInstant(),
				result.getTimestamp("updated_at").toInstant());
	}

	private static Set<String> strings(String value) {
		return value == null || value.isBlank() ? Set.of() : new LinkedHashSet<>(Arrays.asList(value.split(",")));
	}

	private static Set<AlgorithmType> algorithms(String value) {
		if (value == null || value.isBlank()) {
			return Set.of();
		}
		return Arrays.stream(value.split(",")).map(AlgorithmType::valueOf)
				.collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
	}

	private Connection connection() throws SQLException {
		return DriverManager.getConnection(jdbcUrl, username, password);
	}
}
