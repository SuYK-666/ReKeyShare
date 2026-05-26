package com.example.pre.crypto.proof;

import java.util.HashSet;
import java.util.Set;

public final class InMemoryProofReplayRegistry implements ProofReplayRegistry {
    private final Set<String> consumed = new HashSet<>();

    @Override
    public synchronized boolean register(String proofNonce, String canonicalPayloadHash) {
        return consumed.add(proofNonce + "|" + canonicalPayloadHash);
    }
}
