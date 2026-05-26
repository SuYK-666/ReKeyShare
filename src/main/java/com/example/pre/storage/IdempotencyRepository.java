package com.example.pre.storage;

import java.time.Instant;
import java.util.Optional;

public interface IdempotencyRepository {
    record Entry(String scopedKey, String requestHash, Integer status, String responseBody, Instant expiresAt) {
        public boolean completed() {
            return status != null;
        }
    }

    Optional<Entry> find(String scopedKey, Instant now);

    boolean begin(Entry pending);

    void complete(String scopedKey, String requestHash, int status, String responseBody);
}
