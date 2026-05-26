# Project Positioning

## Scope

ReKeyShare is a Java backend prototype for ciphertext custody, authorized capsule
conversion, package validation and audit evidence. It does not rely on a frontend
for any security claim.

## Product Boundary

The formal system accepts ciphertext and cryptographic metadata only. It must not
store plaintext, a content encryption key, or an end-user private key. A recipient
performs final opening outside the service boundary.

## Paths

`SECURE_ENVELOPE_V1` and `HPKE_STYLE_ENVELOPE_V1` are reviewed direct-recipient
envelope paths. `POLICY_BOUND_PRE_V1` is the verifiable transformation research
path. `RSA_PRE_BASELINE` and `ECC_PRE_BASELINE` are demo/test teaching baselines.

## Evidence

Production exposure is guarded by `ProductionProfileBaselineRouteDisabledTest`.
The cryptographic protocol, attack and traceability evidence is maintained under
`docs/crypto`, `docs/testing` and `docs/reports`.
