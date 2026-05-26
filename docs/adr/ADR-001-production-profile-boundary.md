# ADR-001: Production Profile Boundary

## Status

Accepted.

## Decision

The default runtime profile is production-oriented and does not expose plaintext
demo routes or RSA/ECC baseline transformation endpoints. Demo capabilities must
be explicitly enabled through the demo profile.

## Consequences

The production catalog is smaller but its promises are auditable. Automated
evidence is provided by `ProductionProfileBaselineRouteDisabledTest`.
