# Revocation Model

## Scope

Revocation blocks future server-authorized use; it cannot recover plaintext
already opened and retained offline by a recipient.

Grant revoke denies future transformation and download. Package invalidation
rejects previously issued packages at service verification. Content key rotation
makes old key-version packages stale. Evidence is covered by lifecycle and
revocation tests and attack cases `AT-03`/`AT-10`.
