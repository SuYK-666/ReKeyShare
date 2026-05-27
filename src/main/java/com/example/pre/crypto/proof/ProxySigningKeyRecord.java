package com.example.pre.crypto.proof;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;

public record ProxySigningKeyRecord(String proxyId, String keyId, long keyEpoch, PublicKey publicKey,
		PrivateKey privateKey, Instant notBefore, Instant notAfter, Status status) {
	public enum Status {
		ACTIVE, RETIRED, REVOKED
	}

	public boolean usableForNewProof(Instant at) {
		return status == Status.ACTIVE && !at.isBefore(notBefore) && at.isBefore(notAfter);
	}
}
