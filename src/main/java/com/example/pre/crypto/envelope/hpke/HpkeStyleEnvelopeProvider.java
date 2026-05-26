package com.example.pre.crypto.envelope.hpke;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.crypto.kdf.Kdf;
import com.example.pre.crypto.symmetric.AesGcm;
import com.example.pre.util.Bytes;

import javax.crypto.KeyAgreement;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Arrays;

/**
 * Direct-recipient KEM/KDF/AEAD envelope. This provider is not PRE and exposes no transform operation.
 */
public final class HpkeStyleEnvelopeProvider implements EnvelopeProvider {
    public static final String SUITE = "HPKE_STYLE_ENVELOPE_V1";
    private static final byte[] INFO = Bytes.utf8("ReKeyShare|HPKE_STYLE_ENVELOPE_V1|P256|HKDF-SHA256|AES-256-GCM|");

    @Override
    public HpkeStyleSealedContentKey seal(HpkeStyleEnvelopeSealRequest request) {
        require(request.contentKey(), "contentKey");
        try {
            KeyPair ephemeral = ephemeralKey();
            HpkeStyleEnvelopeHeader unsignedHeader = header(request, "");
            byte[] aad = aad(unsignedHeader);
            HpkeStyleEnvelopeHeader header = header(request, Hash.sha256Hex(aad));
            aad = aad(header);
            byte[] kek = derive(ephemeral.getPrivate(), request.recipientPublicKey(), aad);
            try {
                AesGcm.CipherText sealed = AesGcm.encrypt(kek, request.contentKey(), aad);
                return new HpkeStyleSealedContentKey(header, ephemeral.getPublic().getEncoded(),
                        sealed.ciphertext(), sealed.nonce(), Hash.sha256Hex(aad));
            } finally {
                Arrays.fill(kek, (byte) 0);
            }
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("HPKE-style envelope sealing failed", e);
        }
    }

    @Override
    public byte[] open(HpkeStyleEnvelopeOpenRequest request) {
        if (!verifyHeader(request.sealedKey(), request)) {
            throw new IllegalArgumentException("HPKE-style envelope context/header mismatch");
        }
        byte[] aad = aad(request.sealedKey().header());
        try {
            PublicKey ephemeral = KeyFactory.getInstance("EC").generatePublic(
                    new X509EncodedKeySpec(request.sealedKey().encapsulatedPublicKey()));
            byte[] kek = derive(request.recipientPrivateKey(), ephemeral, aad);
            try {
                return AesGcm.decrypt(kek, request.sealedKey().nonce(), request.sealedKey().ciphertext(), aad);
            } finally {
                Arrays.fill(kek, (byte) 0);
            }
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("HPKE-style envelope opening failed", e);
        }
    }

    @Override
    public boolean verifyHeader(HpkeStyleSealedContentKey sealed, HpkeStyleEnvelopeOpenRequest expected) {
        HpkeStyleEnvelopeHeader h = sealed.header();
        return SUITE.equals(h.envelopeVersion())
                && SUITE.equals(h.algorithmSuite())
                && "DHKEM-P256".equals(h.kemId())
                && "HKDF-SHA256".equals(h.kdfId())
                && "AES-256-GCM".equals(h.aeadId())
                && h.tenantId().equals(expected.tenantId())
                && h.dataId().equals(expected.dataId())
                && h.recipientId().equals(expected.recipientId())
                && h.policyHash().equals(expected.policyHash())
                && h.contentKeyVersion() == expected.contentKeyVersion()
                && Hash.sha256Hex(aad(new HpkeStyleEnvelopeHeader(h.envelopeVersion(), h.algorithmSuite(),
                        h.kemId(), h.kdfId(), h.aeadId(), h.recipientKeyId(), h.tenantId(), h.dataId(),
                        h.recipientId(), h.policyHash(), h.contentKeyVersion(), h.createdAt(), "")))
                        .equals(h.aadHash())
                && Hash.sha256Hex(aad(h)).equals(sealed.headerHash());
    }

    private static HpkeStyleEnvelopeHeader header(HpkeStyleEnvelopeSealRequest request, String aadHash) {
        Instant createdAt = request.createdAt() == null ? Instant.now() : request.createdAt();
        return new HpkeStyleEnvelopeHeader(SUITE, SUITE, "DHKEM-P256", "HKDF-SHA256", "AES-256-GCM",
                request.recipientKeyId(), request.tenantId(), request.dataId(), request.recipientId(),
                request.policyHash(), request.contentKeyVersion(), createdAt, aadHash);
    }

    private static byte[] aad(HpkeStyleEnvelopeHeader h) {
        return Bytes.utf8(String.join("|", h.envelopeVersion(), h.algorithmSuite(), h.kemId(), h.kdfId(),
                h.aeadId(), h.recipientKeyId(), h.tenantId(), h.dataId(), h.recipientId(), h.policyHash(),
                Integer.toString(h.contentKeyVersion()), h.createdAt().toString(), h.aadHash()));
    }

    private static byte[] derive(PrivateKey own, PublicKey peer, byte[] aad) throws GeneralSecurityException {
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(own);
        agreement.doPhase(peer, true);
        byte[] shared = agreement.generateSecret();
        try {
            return Kdf.hkdfSha256(null, shared, Bytes.concat(INFO, aad), AesGcm.KEY_BYTES);
        } finally {
            Arrays.fill(shared, (byte) 0);
        }
    }

    public static KeyPair recipientKeyPair() {
        try {
            return ephemeralKey();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 is unavailable", e);
        }
    }

    private static KeyPair ephemeralKey() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    private static void require(byte[] value, String field) {
        if (value == null || value.length == 0) {
            throw new IllegalArgumentException(field + " must be present");
        }
    }
}
