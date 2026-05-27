package com.example.pre.model;

import java.time.Instant;

public record ConversionProof(String proofVersion, String algorithmSuite, String objectDigest, String grantDigest,
		String capsuleDigest, String packageDigest, String proxyId, Instant issuedAt, String nonce,
		String signatureAlgorithm, String publicKey, String signature, String tenantId, String dataId, String grantId,
		String ownerId, String recipientId, String packageId, String policyHash, int contentKeyVersion, String aadHash,
		String keyId, long keyEpoch, Instant expiresAt, String canonicalPayloadHash) {
	public ConversionProof(String proofVersion, String algorithmSuite, String objectDigest, String grantDigest,
			String capsuleDigest, String packageDigest, String proxyId, Instant issuedAt, String nonce,
			String signatureAlgorithm, String publicKey, String signature) {
		this(proofVersion, algorithmSuite, objectDigest, grantDigest, capsuleDigest, packageDigest, proxyId, issuedAt,
				nonce, signatureAlgorithm, publicKey, signature, "", "", "", "", "", "", "", 0, "", "", 0, issuedAt,
				"");
	}
}
