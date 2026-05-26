package com.example.pre.crypto.proof;

public interface ProofReplayRegistry {
    boolean register(String proofNonce, String canonicalPayloadHash);
}
