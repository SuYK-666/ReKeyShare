# Storage Schema

## Scope

The deployment schema is defined by `src/main/resources/db/schema.sql`.

Ciphertext metadata contains tenant-scoped URI, digest, length and algorithm
metadata; blob bytes belong behind `ObjectStore`. The nonce table enforces a
unique `(tenant_id, key_id, nonce)` allocation and retains a fingerprint
uniqueness guard. Grant, package, proof key id, key version and audit records are
persistent model boundaries.
