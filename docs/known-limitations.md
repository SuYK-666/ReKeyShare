# Known Limitations

## Current Deployment Limits

- The default HTTP composition uses in-memory repositories and built-in token
  fixtures; it is not a multi-instance production deployment.
- `secure-local` wires durable audit, formal proof replay, idempotency and
  proxy node/quota storage plus local file object/key providers. Live HTTP
  data/grant/package repositories still require full JDBC domain wiring for
  complete restart claims.
- Local implementations now exist for `ObjectStore`, `KeyManagementProvider`
  and append-only audit anchoring; external S3/KMS/OIDC/WORM services are not
  provisioned by this repository.
- `POLICY_BOUND_PRE_V1` formalizes verifiable context binding, but the legacy
  RSA/ECC PRE primitives remain teaching baselines and are not production PRE.
- Threshold conversion demonstrates k-of-n governance; it does not assert
  production-grade collusion-resistant threshold cryptography.
- Audit events now have a hash-bound `tenantId` and tenant query contract;
  legacy/demo emitters without trusted tenant input record the public scope.
