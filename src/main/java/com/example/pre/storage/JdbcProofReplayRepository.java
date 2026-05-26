package com.example.pre.storage;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;

public final class JdbcProofReplayRepository implements ProofReplayRepository {
    private final String jdbcUrl;
    private final String username;
    private final String password;

    public JdbcProofReplayRepository(String jdbcUrl, String username, String password) {
        this.jdbcUrl = jdbcUrl;
        this.username = username;
        this.password = password;
        try (Connection connection = connection()) {
            JdbcSchemaInitializer.initialize(connection);
        } catch (SQLException e) {
            throw new IllegalStateException("proof replay schema initialization failed", e);
        }
    }

    @Override
    public boolean consume(String tenantId, String proxyId, String keyId, long keyEpoch,
                           String proofNonce, String canonicalPayloadHash, Instant expiresAt) {
        String sql = """
                insert into proof_replay_consumptions
                  (tenant_id, proxy_id, key_id, key_epoch, proof_nonce, canonical_payload_hash, consumed_at, expires_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, tenantId);
            statement.setString(2, proxyId);
            statement.setString(3, keyId);
            statement.setLong(4, keyEpoch);
            statement.setString(5, proofNonce);
            statement.setString(6, canonicalPayloadHash);
            statement.setTimestamp(7, Timestamp.from(Instant.now()));
            statement.setTimestamp(8, Timestamp.from(expiresAt));
            statement.executeUpdate();
            return true;
        } catch (SQLException duplicateOrFailure) {
            if ("23505".equals(duplicateOrFailure.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("proof replay consumption failed", duplicateOrFailure);
        }
    }

    @Override
    public void purgeExpired(Instant now) {
        try (Connection connection = connection();
             PreparedStatement statement = connection.prepareStatement(
                     "delete from proof_replay_consumptions where expires_at < ?")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("proof replay cleanup failed", e);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }
}
