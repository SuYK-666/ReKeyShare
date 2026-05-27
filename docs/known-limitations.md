# Known Limitations

## Current Deployment Limits

- The default HTTP composition uses in-memory repositories and built-in token
  fixtures; it is not a multi-instance production deployment.
- `secure-local` wires durable audit, formal proof replay, idempotency,
  proxy node/quota and live data/grant/package repositories plus local file
  object/key providers. It remains a single-node H2 verification profile, not
  managed multi-instance production persistence.
- Local implementations now exist for `ObjectStore`, `KeyManagementProvider`
  and append-only audit anchoring; external S3/KMS/OIDC/WORM services are not
  provisioned by this repository.
- `LocalJwksIdentityProviderAdapter` validates offline JWT/JWKS fixtures, but
  HTTP bootstrap does not yet provision remote OIDC/JWKS discovery or refresh.
- `POLICY_BOUND_PRE_V1` formalizes verifiable context binding, but the legacy
  RSA/ECC PRE primitives remain teaching baselines and are not production PRE.
- Threshold conversion demonstrates k-of-n governance; it does not assert
  production-grade collusion-resistant threshold cryptography. Completed
  threshold sessions are durable against restart replay, but the three
  independent proxy endpoint simulator is not yet deployed.
- Audit events now have a hash-bound `tenantId` and tenant query contract;
  legacy/demo emitters without trusted tenant input record the public scope.
- HTTP dispatch remains a hand-written route switch; OpenAPI is not yet
  generated from a declarative route registry.
- Critical-class branch floors are now CI-enforced, but the higher review
  targets remain test-expansion work as documented in `ops/ci-quality-gates.md`.
