package com.example.pre.storage;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public final class InMemoryIdempotencyRepository implements IdempotencyRepository {
    private final Map<String, Entry> entries = new HashMap<>();

    @Override
    public synchronized Optional<Entry> find(String scopedKey, Instant now) {
        entries.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
        return Optional.ofNullable(entries.get(scopedKey));
    }

    @Override
    public synchronized boolean begin(Entry pending) {
        return entries.putIfAbsent(pending.scopedKey(), pending) == null;
    }

    @Override
    public synchronized void complete(String scopedKey, String requestHash, int status, String responseBody) {
        Entry current = entries.get(scopedKey);
        if (current != null && current.requestHash().equals(requestHash)) {
            entries.put(scopedKey, new Entry(scopedKey, requestHash, status, responseBody, current.expiresAt()));
        }
    }
}
