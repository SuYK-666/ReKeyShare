# Production Profile

## Scope

Production hides baseline/demo/experiment routes and accepts ciphertext-oriented
interfaces only. Prior to real deployment it must be assembled with durable
metadata repositories, `ObjectStore`, `KeyManagementProvider`,
`IdentityProviderAdapter` and an external `AuditAnchorProvider`.

The repository currently supplies adapter contracts and development/JDBC
evidence; the built-in HTTP composition is not a claimed enterprise deployment.
