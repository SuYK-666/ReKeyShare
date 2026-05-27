# Proof Replay Protection

`POLICY_BOUND_PROOF_V1` is single-consumption when submitted to the trusted
verification boundary. Static package reads may check signature and bound
context without consuming it, because a grant can permit multiple downloads.

## Replay Key

```text
tenantId | proxyId | keyId | keyEpoch | proofNonce | canonicalPayloadHash
```

`ConversionProofService.verifyTrusted(...)` validates formal version, bound
package/grant context, expected tenant, expiry, signer epoch and signature
before calling `ProofReplayRepository.consume(...)`. Invalid or expired proofs
therefore do not poison the replay store.

## Storage And Concurrency

`InMemoryProofReplayRepository` is limited to demo/tests.
`JdbcProofReplayRepository` is the durable adapter. Its primary key is the
replay key, so concurrent inserts allow at most one consumption.
`purgeExpired(now)` is explicit; an operator may clean rows after proof expiry
subject to audit retention policy.

`ConversionProofService.assertReplayRepositoryAllowed(...)` is invoked during
HTTP composition. `PRODUCTION` and `SECURE_LOCAL` reject an injected
`InMemoryProofReplayRepository`; only `DEMO` may use the process-local adapter.
`SECURE_LOCAL` stores replay state in its configured H2 file database.

## Evidence

- `ConversionProofServiceTest`: consume/replay, tenant mismatch and replay audit reason.
- `PolicyBoundProofTamperTest`: context, signature, replay and expiry negatives.
- `JdbcProofReplayRepositoryTest`: 100 concurrent submissions and restart persistence.
