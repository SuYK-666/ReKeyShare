package com.example.pre.crypto.provider;

import com.example.pre.crypto.symmetric.AesGcm;
import com.example.pre.util.SecureRandomUtil;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Properties;

/**
 * File-backed secure-local provider. It proves lifecycle and replaceability;
 * it is not a replacement for production HSM/KMS key custody.
 */
public final class LocalKeyManagementProvider implements KeyManagementProvider {
    private final Path keyFile;
    private final Properties keys = new Properties();

    public LocalKeyManagementProvider(Path keyFile) {
        this.keyFile = keyFile.toAbsolutePath().normalize();
        load();
    }

    @Override
    public synchronized byte[] sign(String keyId, byte[] payload) {
        requireActive(keyId);
        try {
            Signature signature = Signature.getInstance("Ed25519");
            signature.initSign(privateKey(keyId));
            signature.update(payload);
            return signature.sign();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("local key signature failed", e);
        }
    }

    @Override
    public synchronized boolean verify(String keyId, byte[] payload, byte[] signatureBytes) {
        try {
            Signature signature = Signature.getInstance("Ed25519");
            signature.initVerify(getPublicKey(keyId));
            signature.update(payload);
            return signature.verify(signatureBytes);
        } catch (GeneralSecurityException e) {
            return false;
        }
    }

    @Override
    public synchronized byte[] wrapKey(String keyId, byte[] dataKey, byte[] aad) {
        requireActive(keyId);
        AesGcm.CipherText encrypted = AesGcm.encrypt(wrappingKey(keyId), dataKey, aad);
        byte[] out = new byte[encrypted.nonce().length + encrypted.ciphertext().length];
        System.arraycopy(encrypted.nonce(), 0, out, 0, encrypted.nonce().length);
        System.arraycopy(encrypted.ciphertext(), 0, out, encrypted.nonce().length, encrypted.ciphertext().length);
        return out;
    }

    @Override
    public synchronized byte[] unwrapKey(String keyId, byte[] wrappedKey, byte[] aad) {
        if (wrappedKey.length <= AesGcm.NONCE_BYTES) {
            throw new IllegalArgumentException("invalid wrapped key");
        }
        byte[] nonce = java.util.Arrays.copyOf(wrappedKey, AesGcm.NONCE_BYTES);
        byte[] payload = java.util.Arrays.copyOfRange(wrappedKey, AesGcm.NONCE_BYTES, wrappedKey.length);
        return AesGcm.decrypt(wrappingKey(keyId), nonce, payload, aad);
    }

    @Override
    public synchronized PublicKey getPublicKey(String keyId) {
        try {
            return KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(decode(keyId + ".public")));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("unknown local key: " + keyId, e);
        }
    }

    @Override
    public synchronized String rotateKey(String purpose) {
        try {
            String keyId = purpose + "-" + Instant.now().toEpochMilli() + "-"
                    + Base64.getUrlEncoder().withoutPadding().encodeToString(SecureRandomUtil.randomBytes(6));
            KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
            KeyPair pair = generator.generateKeyPair();
            keys.setProperty(keyId + ".purpose", purpose);
            keys.setProperty(keyId + ".status", "ACTIVE");
            keys.setProperty(keyId + ".createdAt", Instant.now().toString());
            keys.setProperty(keyId + ".public", encode(pair.getPublic().getEncoded()));
            keys.setProperty(keyId + ".private", encode(pair.getPrivate().getEncoded()));
            keys.setProperty(keyId + ".wrapping", encode(SecureRandomUtil.randomBytes(AesGcm.KEY_BYTES)));
            persist();
            return keyId;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("local key rotation failed", e);
        }
    }

    public synchronized void revokeKey(String keyId) {
        requirePresent(keyId);
        keys.setProperty(keyId + ".status", "REVOKED");
        keys.setProperty(keyId + ".revokedAt", Instant.now().toString());
        persist();
    }

    private PrivateKey privateKey(String keyId) {
        try {
            return KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(decode(keyId + ".private")));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("unknown local key: " + keyId, e);
        }
    }

    private byte[] wrappingKey(String keyId) {
        requirePresent(keyId);
        return decode(keyId + ".wrapping");
    }

    private void requireActive(String keyId) {
        requirePresent(keyId);
        if (!"ACTIVE".equals(keys.getProperty(keyId + ".status"))) {
            throw new IllegalStateException("key is not active: " + keyId);
        }
    }

    private void requirePresent(String keyId) {
        if (keys.getProperty(keyId + ".status") == null) {
            throw new IllegalArgumentException("unknown local key: " + keyId);
        }
    }

    private byte[] decode(String property) {
        String value = keys.getProperty(property);
        if (value == null) {
            throw new IllegalArgumentException("missing local key property: " + property);
        }
        return Base64.getDecoder().decode(value);
    }

    private static String encode(byte[] value) {
        return Base64.getEncoder().encodeToString(value);
    }

    private void load() {
        if (!Files.exists(keyFile)) {
            return;
        }
        try (InputStream input = Files.newInputStream(keyFile)) {
            keys.load(input);
        } catch (IOException e) {
            throw new IllegalStateException("local key store read failed", e);
        }
    }

    private void persist() {
        try {
            if (keyFile.getParent() != null) {
                Files.createDirectories(keyFile.getParent());
            }
            try (OutputStream output = Files.newOutputStream(keyFile, StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
                keys.store(output, "ReKeyShare secure-local key metadata and encrypted-at-rest boundary");
            }
        } catch (IOException e) {
            throw new IllegalStateException("local key store write failed", e);
        }
    }
}
