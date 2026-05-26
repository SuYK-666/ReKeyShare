package com.example.pre.crypto.proof;

import java.security.GeneralSecurityException;
import java.security.KeyPairGenerator;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class InMemoryProxySigningKeyRegistry implements ProxySigningKeyRegistry {
    private final Map<String, ProxySigningKeyRecord> records = new HashMap<>();
    private final Map<String, Long> epochs = new HashMap<>();

    @Override
    public synchronized ProxySigningKeyRecord activeForSigning(String proxyId, Instant at) {
        return records.values().stream()
                .filter(record -> record.proxyId().equals(proxyId) && record.usableForNewProof(at))
                .findFirst().orElseGet(() -> rotate(proxyId, at));
    }

    @Override
    public synchronized ProxySigningKeyRecord findForVerification(String proxyId, String keyId) {
        ProxySigningKeyRecord record = records.get(keyId);
        return record != null && record.proxyId().equals(proxyId) ? record : null;
    }

    @Override
    public synchronized ProxySigningKeyRecord rotate(String proxyId, Instant at) {
        records.replaceAll((id, current) -> current.proxyId().equals(proxyId)
                && current.status() == ProxySigningKeyRecord.Status.ACTIVE
                ? new ProxySigningKeyRecord(current.proxyId(), current.keyId(), current.keyEpoch(),
                current.publicKey(), current.privateKey(), current.notBefore(), current.notAfter(),
                ProxySigningKeyRecord.Status.RETIRED) : current);
        long epoch = epochs.merge(proxyId, 1L, Long::sum);
        try {
            var pair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
            var record = new ProxySigningKeyRecord(proxyId, "proxy-key-" + UUID.randomUUID(), epoch,
                    pair.getPublic(), pair.getPrivate(), at.minusSeconds(1), at.plus(Duration.ofDays(365)),
                    ProxySigningKeyRecord.Status.ACTIVE);
            records.put(record.keyId(), record);
            return record;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Ed25519 is unavailable", e);
        }
    }

    @Override
    public synchronized void revoke(String proxyId, String keyId) {
        ProxySigningKeyRecord record = findForVerification(proxyId, keyId);
        if (record == null) {
            throw new IllegalArgumentException("unknown proxy signing key");
        }
        records.put(keyId, new ProxySigningKeyRecord(record.proxyId(), record.keyId(), record.keyEpoch(),
                record.publicKey(), record.privateKey(), record.notBefore(), record.notAfter(),
                ProxySigningKeyRecord.Status.REVOKED));
    }
}
