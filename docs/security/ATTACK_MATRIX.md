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
| AT-14/AT-15 | `R-PROOF-REPLAY-001` | `ConversionProofServiceTest`, `JdbcProofReplayRepositoryTest` |
| AT-16/AT-17 | `R-TENANT-001`, `R-AUDIT-001` | `ConversionProofServiceTest`, `AuditHashChainTest` |
| AT-18/AT-19 | `R-BOLA-001` | `ApiIntegrationTest` |
| AT-20/AT-21/AT-22/AT-23 | `R-PROXY-001` | `ProxyNodeServiceTest`, `ConversionProofServiceTest` |
| AT-24/AT-25/AT-26/AT-27/AT-28/AT-29 | `R-PROOF-001` | `PolicyBoundProofTamperTest`, `PackageVerifierTest` |
| AT-30/AT-31/AT-32/AT-33 | `R-PACKAGE-001`, `R-AAD-001`, `R-REVOKE-001` | package and lifecycle tests |
| AT-34/AT-35/AT-36 | `R-THRESHOLD-001` | threshold tests |
| AT-37/AT-38 | `R-AUDIT-001` | `AuditHashChainTest` |
| AT-39/AT-40 | `R-PROFILE-001` | `ProductionProfileBaselineRouteDisabledTest`, `ApiIntegrationTest` |

## Output

Run `AttackMatrixRunner` to create JSON, CSV, Markdown and per-case JSON under
`docs/reports/attack-matrix`. Every negative case records expected and actual
decisions, stable error code, internal audit reason and
`datasetVersion=security-fixtures-v2`. Fixed principal/object ownership
expectations are documented in `../testing/security-fixtures-v2.md`.
