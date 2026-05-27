package com.example.pre.crypto.proof;

import java.time.Instant;

public record PolicyBoundConversionProof(String proofVersion, String algorithmSuite, String tenantId, String dataId,
		String grantId, String ownerId, String recipientId, String proxyId, String packageId, String policyHash,
		int contentKeyVersion, String capsuleHash, String ciphertextHash, String aadHash, String manifestHash,
		String keyId, long keyEpoch, Instant issuedAt, Instant expiresAt, String proofNonce,
		String canonicalPayloadHash, String signatureAlgorithm, String signature) {
}
