# Negative Cases

## Scope

Every false acceptance below is an acceptance failure.

| Requirement | Required rejection test |
| --- | --- |
| Proof binding | `PolicyBoundProofTamperTest` |
| Revocation/key freshness | `PackageVerifierFreshnessTest` |
| Profile isolation | `ProductionProfileBaselineRouteDisabledTest` |
| Envelope recipient/AAD/header | `EnvelopeProviderNegativeTest` |
| Threshold context/replay | `ThresholdContextBindingTest` |
| Ciphertext storage isolation | `ObjectStoreTest` |
| Attack evidence output | `AttackMatrixRunnerTest` |
