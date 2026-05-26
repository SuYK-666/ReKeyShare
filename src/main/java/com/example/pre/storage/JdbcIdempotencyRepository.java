package com.example.pre.storage;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

public final class JdbcIdempotencyRepository implements IdempotencyRepository {
    private final String jdbcUrl;
    private final String username;
    private final String password;

    public JdbcIdempotencyRepository(String jdbcUrl, String username, String password) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
        try (Connection connection = connection()) {
            JdbcSchemaInitializer.initialize(connection);
        } catch (SQLException e) {
            throw new IllegalStateException("idempotency schema initialization failed", e);
        }
    }

    @Override
    public Optional<Entry> find(String scopedKey, Instant now) {
        deleteExpired(now);
        String sql = "select request_hash, response_status, response_body, expires_at from idempotency_requests where scoped_key = ?";
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, scopedKey);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    return Optional.empty();
                }
                Integer status = result.getObject("response_status", Integer.class);
                return Optional.of(new Entry(scopedKey, result.getString("request_hash"), status,
                        result.getString("response_body"), result.getTimestamp("expires_at").toInstant()));
            }
        } catch (SQLException e) {
            throw new IllegalStateException("idempotency query failed", e);
        }
    }

    @Override
    public boolean begin(Entry pending) {
        String sql = "insert into idempotency_requests (scoped_key, request_hash, expires_at) values (?, ?, ?)";
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, pending.scopedKey());
            statement.setString(2, pending.requestHash());
            statement.setTimestamp(3, Timestamp.from(pending.expiresAt()));
            statement.executeUpdate();
            return true;
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("idempotency begin failed", e);
        }
    }

    @Override
    public void complete(String scopedKey, String requestHash, int status, String responseBody) {
        String sql = """
                update idempotency_requests set response_status = ?, response_body = ?
                 where scoped_key = ? and request_hash = ?
                """;
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, status);
            statement.setString(2, responseBody);
            statement.setString(3, scopedKey);
            statement.setString(4, requestHash);
            statement.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("idempotency completion failed", e);
        }
    }

    private void deleteExpired(Instant now) {
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement("delete from idempotency_requests where expires_at < ?")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("idempotency expiry cleanup failed", e);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }
}
