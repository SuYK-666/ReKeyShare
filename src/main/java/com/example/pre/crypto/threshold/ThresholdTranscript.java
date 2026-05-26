package com.example.pre.crypto.threshold;

import java.time.Instant;
import java.util.List;

public record ThresholdTranscript(
        String sessionId,
        String contextHash,
        List<String> proxyIds,
        List<String> shareDigests,
        String aggregateResultHash,
        String transcriptHash,
        Instant aggregatedAt
) {
}
