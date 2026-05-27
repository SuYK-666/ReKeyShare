package com.example.pre.crypto.proof;

import java.time.Instant;

public interface ProxySigningKeyRegistry {
	ProxySigningKeyRecord activeForSigning(String proxyId, Instant at);

	ProxySigningKeyRecord findForVerification(String proxyId, String keyId);

	ProxySigningKeyRecord rotate(String proxyId, Instant at);

	void revoke(String proxyId, String keyId);
}
