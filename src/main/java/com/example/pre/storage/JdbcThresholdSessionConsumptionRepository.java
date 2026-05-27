package com.example.pre.storage;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;

public final class JdbcThresholdSessionConsumptionRepository implements ThresholdSessionConsumptionRepository {
	private final String jdbcUrl;
	private final String username;
	private final String password;

	public JdbcThresholdSessionConsumptionRepository(String jdbcUrl, String username, String password) {
		this.jdbcUrl = jdbcUrl;
		this.username = username;
		this.password = password;
		try (Connection connection = connection()) {
			JdbcSchemaInitializer.initialize(connection);
		} catch (SQLException e) {
			throw new IllegalStateException("threshold consumption schema initialization failed", e);
		}
	}

	@Override
	public boolean isConsumed(String tenantId, String sessionId) {
		try (Connection connection = connection();
				PreparedStatement statement = connection.prepareStatement(
						"select count(*) from threshold_session_consumptions where tenant_id = ? and session_id = ?")) {
			statement.setString(1, tenantId);
			statement.setString(2, sessionId);
			try (var result = statement.executeQuery()) {
				result.next();
				return result.getInt(1) > 0;
			}
		} catch (SQLException e) {
			throw new IllegalStateException("threshold consumption query failed", e);
		}
	}

	@Override
	public boolean consume(String tenantId, String sessionId, String contextHash, Instant consumedAt) {
		try (Connection connection = connection(); PreparedStatement statement = connection.prepareStatement("""
				insert into threshold_session_consumptions (tenant_id, session_id, context_hash, consumed_at)
				values (?, ?, ?, ?)
				""")) {
			statement.setString(1, tenantId);
			statement.setString(2, sessionId);
			statement.setString(3, contextHash);
			statement.setTimestamp(4, Timestamp.from(consumedAt));
			statement.executeUpdate();
			return true;
		} catch (SQLException e) {
			if ("23505".equals(e.getSQLState())) {
				return false;
			}
			throw new IllegalStateException("threshold consumption persistence failed", e);
		}
	}

	private Connection connection() throws SQLException {
		return DriverManager.getConnection(jdbcUrl, username, password);
	}
}
