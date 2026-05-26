# Test Strategy

## Scope

Acceptance prioritizes security rejection and reproducible evidence over
performance. The formal checks are profile isolation, proof/AAD binding,
revocation freshness, object authorization, envelope negative behavior,
threshold context, nonce uniqueness, audit tamper and idempotency stability.

## Commands

Run `mvn test` for executable controls and run `AttackMatrixRunner` to emit the
JSON/CSV/Markdown decision ledger. Final raw evidence remains under
`docs/reports`.
