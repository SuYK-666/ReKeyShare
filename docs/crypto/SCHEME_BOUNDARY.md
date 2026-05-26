# Scheme Boundary

## Scope

This document classifies algorithm suites exposed by the backend. A path being
implemented does not by itself mean it is suitable for production deployment.

| Suite | Purpose | Default profile | Production recommendation | Endpoint boundary | Evidence |
| --- | --- | --- | --- | --- | --- |
| `RSA_PRE_BASELINE` | Teaching transform baseline | demo/test | No | Hidden and rejected in production | `ProductionProfileBaselineRouteDisabledTest` |
| `ECC_PRE_BASELINE` | Teaching transform baseline | demo/test | No | Hidden and rejected in production | `ProductionProfileBaselineRouteDisabledTest` |
| `POLICY_BOUND_PRE_V1` | Context-bound verifiable proxy transformation protocol | research/test | Requires reviewed PRE provider before deployment | Internal protocol/service only until reviewed | `PolicyBoundProofTamperTest` |
| `SECURE_ENVELOPE_V1` | Existing direct-recipient JCA envelope | production baseline | Yes, within documented JCA boundary | Formal encrypted upload path | `CapsuleContextBindingTest` |
| `HPKE_STYLE_ENVELOPE_V1` | KEM/KDF/AEAD-style direct-recipient envelope | production comparison path | Yes, within documented provider boundary | Provider contract; not PRE transform | `EnvelopeProviderNegativeTest` |

## Security Boundaries

`RSA_PRE_BASELINE` and `ECC_PRE_BASELINE` cannot claim reviewed PRE security,
collusion resistance or production key custody. They are not production APIs.

`POLICY_BOUND_PRE_V1` binds policy and package context and proves a registered
proxy signature; it cannot upgrade an unreviewed underlying PRE primitive.

`SECURE_ENVELOPE_V1` and `HPKE_STYLE_ENVELOPE_V1` seal a key directly for a
recipient. They cannot claim proxy transformation semantics.

The threshold path is a governance prototype and cannot claim production-grade
collusion resistance.
