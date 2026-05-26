package com.example.pre.service;

import com.example.pre.crypto.hash.Hash;
import com.example.pre.storage.IdempotencyRepository;
import com.example.pre.storage.InMemoryIdempotencyRepository;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

public final class IdempotencyService {
    public record Outcome(int status, String body) {
    }

    public record Pending(String scopedKey, String requestHash) {
    }

    public record Decision(Pending pending, Outcome replay) {
        public boolean replayed() {
            return replay != null;
        }
    }

    private final IdempotencyRepository repository;
    private final Duration retention;

    public IdempotencyService(Duration retention) {
        this(retention, new InMemoryIdempotencyRepository());
    }

    public IdempotencyService(Duration retention, IdempotencyRepository repository) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("idempotency retention must be positive");
        }
        this.retention = retention;
        this.repository = repository;
    }

    public synchronized String execute(String key, String actor, String action, String resource, String requestBody,
                                       Supplier<String> operation) {
        if (key == null || key.isBlank()) {
            return operation.get();
        }
        Decision decision = begin(key, actor, action, resource, requestBody);
        if (decision.replayed()) {
            return decision.replay().body();
        }
        String response = operation.get();
        complete(decision.pending(), 200, response);
        return response;
    }

    public synchronized Decision begin(String key, String actor, String action, String resource, String requestBody) {
        Instant now = Instant.now();
        String scopedKey = actor + "|" + action + "|" + resource + "|" + key;
        String requestHash = Hash.sha256Hex(requestBody.getBytes(StandardCharsets.UTF_8));
        IdempotencyRepository.Entry existing = repository.find(scopedKey, now).orElse(null);
        if (existing != null) {
            if (!existing.requestHash().equals(requestHash)) {
                throw new ReKeyShareException(ErrorCode.IDEMPOTENCY_CONFLICT,
                        "idempotency key has already been used for a different request");
            }
            if (!existing.completed()) {
                throw new ReKeyShareException(ErrorCode.IDEMPOTENCY_CONFLICT,
                        "idempotent request is already in progress");
            }
            return new Decision(null, new Outcome(existing.status(), existing.responseBody()));
        }
        Pending pending = new Pending(scopedKey, requestHash);
        if (!repository.begin(new IdempotencyRepository.Entry(scopedKey, requestHash, null, null,
                now.plus(retention)))) {
            return begin(key, actor, action, resource, requestBody);
        }
        return new Decision(pending, null);
    }

    public synchronized void complete(Pending pending, int status, String body) {
        if (pending == null) {
            return;
        }
        repository.complete(pending.scopedKey(), pending.requestHash(), status, body);
    }
}
