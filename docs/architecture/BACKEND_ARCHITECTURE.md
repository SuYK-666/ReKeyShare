# Backend Architecture

## Scope

The backend separates HTTP routing, authorization services, crypto protocol
providers, repositories/object storage and audit evidence. Formal flows receive
ciphertext only and final decryption stays with the recipient or external KMS.

## Components

`ObjectAccessGuard` centralizes object operations; `ObjectStore` separates
ciphertext blobs from metadata; `KeyManagementProvider` and
`IdentityProviderAdapter` define deployment integrations; `AuditAnchorProvider`
supports independent checkpoints.
