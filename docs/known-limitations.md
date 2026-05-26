# Known Limitations

## Current Deployment Limits

- The default HTTP composition uses in-memory repositories and built-in token
  fixtures; it is not a multi-instance production deployment.
- `ObjectStore`, `KeyManagementProvider`, `IdentityProviderAdapter` and
  `AuditAnchorProvider` are defined integration boundaries; external S3/KMS/OIDC
  or WORM services are not provisioned by this repository.
- `POLICY_BOUND_PRE_V1` formalizes verifiable context binding, but the legacy
  RSA/ECC PRE primitives remain teaching baselines and are not production PRE.
- Threshold conversion demonstrates k-of-n governance; it does not assert
  production-grade collusion-resistant threshold cryptography.
