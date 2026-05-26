# Attack Matrix

## Scope

The backend attack runner emits machine-readable negative-decision evidence
without a frontend dependency. Unit tests for the linked security modules prove
the underlying controls; the runner preserves the decision ledger.

| Attack | Requirement | Module test |
| --- | --- | --- |
| AT-01/AT-02/AT-11 | `R-BOLA-001` | `AuthorizationBoundaryTest`, `ObjectAccessGuardTest` |
| AT-03/AT-10 | `R-REVOKE-001` | `KeyLifecycleServiceTest`, `PackageVerifierFreshnessTest` |
| AT-04/AT-06/AT-09/AT-12 | `R-PROOF-001` | `PolicyBoundProofTamperTest` |
| AT-05 | `R-AAD-001` | `CapsuleContextBindingTest`, `EnvelopeProviderNegativeTest` |
| AT-07 | `R-THRESHOLD-001` | `ThresholdContextBindingTest` |
| AT-08 | `R-AUDIT-001` | `AuditHashChainTest` |
| AT-13 | `R-IDEMPOTENCY-001` | `IdempotencyServiceTest` |

## Output

Run `AttackMatrixRunner` to create JSON, CSV, Markdown and per-case JSON under
`docs/reports/attack-matrix`. Every negative case records expected and actual
decisions, stable error code and internal audit reason.
