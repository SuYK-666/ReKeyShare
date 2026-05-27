package com.example.pre.storage;

import com.example.pre.crypto.EncryptedKeyCapsule;
import com.example.pre.crypto.ReEncryptionKey;
import com.example.pre.crypto.ScopedReEncryptionKey;
import com.example.pre.crypto.ecc.EccReEncryptionKey;
import com.example.pre.crypto.rsa.RsaReEncryptionKey;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.ConversionProof;
import com.example.pre.model.ShareGrant;

import java.math.BigInteger;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;

final class JdbcObjectCodec {
	private JdbcObjectCodec() {
	}

	static EncryptedKeyCapsule readCapsule(ResultSet result) throws SQLException {
		Timestamp created = result.getTimestamp("capsule_created_at");
		return new EncryptedKeyCapsule(result.getString("capsule_id"),
				AlgorithmType.valueOf(result.getString("algorithm")), result.getString("capsule_parameter_spec"),
				result.getString("capsule_owner_key_id"), result.getInt("capsule_owner_key_version"),
				result.getBytes("capsule_header"), result.getBytes("capsule_wrapped_key"),
				result.getBytes("capsule_key_nonce"), result.getString("capsule_aad_hash"),
				result.getString("capsule_context_hash"), created.toInstant());
	}

	static String reKeyType(ReEncryptionKey key) {
		ReEncryptionKey material = unwrap(key);
		if (material == null) {
			return null;
		}
		if (material instanceof RsaReEncryptionKey) {
			return "RSA";
		}
		if (material instanceof EccReEncryptionKey) {
			return "ECC";
		}
		throw new IllegalArgumentException("unsupported durable re-encryption key type");
	}

	static String reKeyValue1(ReEncryptionKey key) {
		ReEncryptionKey material = unwrap(key);
		if (material instanceof RsaReEncryptionKey rsa) {
			return rsa.modulus().toString(16);
		}
		if (material instanceof EccReEncryptionKey ecc) {
			return ecc.scalar().toString(16);
		}
		return null;
	}

	static String reKeyValue2(ReEncryptionKey key) {
		ReEncryptionKey material = unwrap(key);
		return material instanceof RsaReEncryptionKey rsa ? rsa.exponent().toString(16) : null;
	}

	static ReEncryptionKey readReKey(ResultSet result, ShareGrantFields fields) throws SQLException {
		String type = result.getString("rekey_type");
		if (type == null) {
			return null;
		}
		ReEncryptionKey material = switch (type) {
			case "RSA" ->
				new RsaReEncryptionKey(hex(result.getString("rekey_value_1")), hex(result.getString("rekey_value_2")));
			case "ECC" -> new EccReEncryptionKey(hex(result.getString("rekey_value_1")));
			default -> throw new SQLException("unsupported durable re-encryption key type: " + type);
		};
		return new ScopedReEncryptionKey(material, fields.grantId(), fields.dataId(), fields.recipientId(),
				fields.contentKeyVersion(), fields.policyHash(), fields.expiresAt(), fields.maxReEncryptCount());
	}

	static ConversionProof readProof(ResultSet result) throws SQLException {
		String version = result.getString("proof_version");
		if (version == null) {
			return null;
		}
		return new ConversionProof(version, result.getString("proof_algorithm_suite"),
				result.getString("proof_object_digest"), result.getString("proof_grant_digest"),
				result.getString("proof_capsule_digest"), result.getString("proof_package_digest"),
				result.getString("proof_proxy_id"), instant(result, "proof_issued_at"), result.getString("proof_nonce"),
				result.getString("proof_signature_algorithm"), result.getString("proof_public_key"),
				result.getString("proof_signature"), result.getString("proof_tenant_id"), result.getString("data_id"),
				result.getString("grant_id"), result.getString("owner_id"), result.getString("recipient_id"),
				result.getString("package_id"), result.getString("proof_policy_hash"),
				result.getInt("content_key_version"), result.getString("proof_aad_hash"),
				result.getString("proof_key_id"), result.getLong("proof_key_epoch"),
				instant(result, "proof_expires_at"), result.getString("proof_canonical_payload_hash"));
	}

	static Instant instant(ResultSet result, String column) throws SQLException {
		Timestamp timestamp = result.getTimestamp(column);
		return timestamp == null ? null : timestamp.toInstant();
	}

	private static BigInteger hex(String value) {
		return new BigInteger(value, 16);
	}

	private static ReEncryptionKey unwrap(ReEncryptionKey key) {
		if (key instanceof ScopedReEncryptionKey scoped) {
			return scoped.snapshotDelegate();
		}
		return key;
	}

	record ShareGrantFields(String grantId, String dataId, String recipientId, int contentKeyVersion, String policyHash,
			Instant expiresAt, int maxReEncryptCount) {
	}
}
