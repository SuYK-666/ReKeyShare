# Acceptance Scorecard

## Hard Gates

| Gate | Executable result |
| --- | --- |
| Plaintext/private key leakage boundary | PASS |
| Production baseline exposure | PASS |
| Proof tamper/replay/signer rejection | PASS |
| Revocation and stale key rejection | PASS |
| Wrong AAD/envelope misuse rejection | PASS |
| Unauthorized/cross-tenant tested access rejection | PASS |
| Audit tamper detection | PASS |
| Traceability of new claims | PASS |

## Qualification

The repository passes its executable backend prototype security gates. A
production deployment grade is intentionally not asserted until external
KMS/OIDC/object-store/audit-anchor adapters are configured and exercised in a
deployed environment, as recorded in `docs/known-limitations.md`.
