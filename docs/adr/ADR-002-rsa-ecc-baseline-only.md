# ADR-002: RSA/ECC Are Baseline Only

## Status

Accepted.

## Decision

`RSA_PRE_BASELINE` and `ECC_PRE_BASELINE` remain for education and deterministic
negative testing. Neither is described or routed as a production cryptographic
provider.

## Consequences

Research on verifiable transformation proceeds through `POLICY_BOUND_PRE_V1`;
direct-recipient production comparison proceeds through envelope providers.
