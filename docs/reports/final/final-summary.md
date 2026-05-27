# Final Security Upgrade Summary

## Scope

This report records the backend and algorithm upgrade run performed on
2026-05-26. It does not evaluate frontend behavior or claim provisioned external
production infrastructure.

## Measured Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Unit/integration suite | PASS | `mvn test` |
| Static/coverage/build quality | PASS | `mvn verify` after JDK 25-compatible SpotBugs upgrade |
| Attack decision ledger | PASS, 40/40 rejected as expected | `../attack-matrix/attack-results.json` |
| E-01 through E-12 indexed evidence | PASS for executable repository controls | `raw/E-*.json` |

## Analysis

The previous critical proof gap has been closed for the formal path: proof
verification resolves signer identity from a registry and signs canonical,
explicitly bound context rather than trusting an embedded public key. Negative
tests reject context changes, expired/revoked signers and consumed nonces.

The envelope and threshold paths now have independent semantics and tests:
HPKE-style sealing is direct recipient wrapping, while threshold shares are
scoped governance artifacts with offline transcripts. Neither is represented as
an upgraded production PRE primitive.

No measured security-correctness result missed its target. `mvn verify` initially
failed because the prior SpotBugs plugin could not analyze JDK 25 class files;
upgrading the plugin corrected the tooling mismatch and the rerun passed.

## Deployment Boundary

External object storage, KMS/HSM, OIDC/mTLS, WORM/time-stamped audit anchors and
multi-instance runtime assembly remain deployment integrations. Their interfaces
and restrictions are documented in `docs/known-limitations.md`; they are not
reported as externally tested systems.
