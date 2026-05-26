package com.example.pre.service;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.crypto.threshold.ThresholdTranscript;

import java.time.Instant;
import java.util.List;

public final class ThresholdTranscriptVerifier {
    public boolean verify(ThresholdTranscript transcript) {
        return transcript.transcriptHash().equals(hash(transcript.sessionId(), transcript.contextHash(),
                transcript.proxyIds(), transcript.shareDigests(), transcript.aggregateResultHash(),
                transcript.aggregatedAt()));
    }

    static String hash(String sessionId, String contextHash, List<String> proxyIds, List<String> shareDigests,
                       String aggregateResultHash, Instant at) {
        return Hash.sha256Hex(String.join("|", "threshold-transcript-v1", sessionId, contextHash,
                String.join(",", proxyIds), String.join(",", shareDigests), aggregateResultHash, at.toString()));
    }
}
