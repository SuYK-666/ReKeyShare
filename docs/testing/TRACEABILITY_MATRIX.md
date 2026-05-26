# Security Traceability Matrix

## Scope

This matrix maps new acceptance requirements to executable controls and evidence.

| Requirement | Code | Test | Experiment evidence | Document |
| --- | --- | --- | --- | --- |
| R-PROFILE-001 | `AlgorithmSuite`, `CryptoProfileGuard` | `ProductionProfileBaselineRouteDisabledTest` | production scan | `SCHEME_BOUNDARY.md` |
| R-PROOF-001 | `PolicyBoundProofVerifier` | `PolicyBoundProofTamperTest` | E-03/AT-04,06,09,12 | `POLICY_BOUND_PROOF_V1.md` |
| R-REVOKE-001 | `PackageVerifier` | `PackageVerifierFreshnessTest` | E-04/AT-03,10 | `REVOCATION_MODEL.md` |
| R-ENVELOPE-001 | `HpkeStyleEnvelopeProvider` | `EnvelopeProviderNegativeTest` | E-06/AT-05 | `HPKE_STYLE_ENVELOPE_V1.md` |
| R-THRESHOLD-001 | `ThresholdSessionService` | `ThresholdContextBindingTest` | E-07/AT-07 | `THRESHOLD_PRE_PROTOTYPE.md` |
| R-STORAGE-001 | `ObjectStore` | `ObjectStoreTest` | E-05/E-08 | `STORAGE_SCHEMA.md` |
| R-EVIDENCE-001 | `AttackMatrixRunner` | `AttackMatrixRunnerTest` | attack-results files | `ATTACK_MATRIX.md` |
