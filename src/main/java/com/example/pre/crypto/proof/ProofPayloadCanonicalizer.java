package com.example.pre.crypto.proof;

import com.example.pre.crypto.hash.Hash;

import java.nio.charset.StandardCharsets;

public final class ProofPayloadCanonicalizer {
	public byte[] canonicalBytes(PolicyBoundConversionProof proof) {
		String json = "{" + field("aadHash", proof.aadHash()) + "," + field("algorithmSuite", proof.algorithmSuite())
				+ "," + field("capsuleHash", proof.capsuleHash()) + ","
				+ field("ciphertextHash", proof.ciphertextHash()) + ","
				+ number("contentKeyVersion", proof.contentKeyVersion()) + "," + field("dataId", proof.dataId()) + ","
				+ field("expiresAt", proof.expiresAt().toString()) + "," + field("grantId", proof.grantId()) + ","
				+ field("issuedAt", proof.issuedAt().toString()) + "," + number("keyEpoch", proof.keyEpoch()) + ","
				+ field("keyId", proof.keyId()) + "," + field("manifestHash", proof.manifestHash()) + ","
				+ field("ownerId", proof.ownerId()) + "," + field("packageId", proof.packageId()) + ","
				+ field("policyHash", proof.policyHash()) + "," + field("proofNonce", proof.proofNonce()) + ","
				+ field("proofVersion", proof.proofVersion()) + "," + field("proxyId", proof.proxyId()) + ","
				+ field("recipientId", proof.recipientId()) + "," + field("tenantId", proof.tenantId()) + "}";
		return json.getBytes(StandardCharsets.UTF_8);
	}

	public String digest(PolicyBoundConversionProof proof) {
		return "sha256-b64u:"
				+ java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(Hash.sha256(canonicalBytes(proof)));
	}

	private static String field(String name, String value) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException("canonical proof field must be present: " + name);
		}
		return "\"" + escape(name) + "\":\"" + escape(value) + "\"";
	}

	private static String number(String name, long value) {
		if (value < 0) {
			throw new IllegalArgumentException("canonical proof field must be non-negative: " + name);
		}
		return "\"" + name + "\":" + value;
	}

	private static String escape(String value) {
		return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t",
				"\\t");
	}
}
