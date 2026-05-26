package com.example.pre.security.identity;

import com.example.pre.service.SecurityContext;

public interface IdentityProviderAdapter {
    SecurityContext validateBearer(String token, String requiredAudience, String requiredScope, String tenantId);

    boolean authenticateProxyCertificate(byte[] peerCertificate, String expectedProxyId);
}
