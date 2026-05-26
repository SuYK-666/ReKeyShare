# Key Lifecycle

Production user registration stores only public metadata; services must not
read user private keys. `KeyManagementProvider` defines the replaceable
service-side signing and key-wrapping boundary.

`LocalKeyManagementProvider` is the `secure-local` implementation. It supports:

- Ed25519 signing and verification by `keyId`;
- AES-256-GCM wrapping and unwrapping bound to caller-provided AAD;
- key rotation with fresh key material;
- revocation that blocks new signing and wrapping;
- restart recovery from a local provider file.

`LocalKeyManagementProviderTest` verifies rotation, signing, wrapping, wrong
AAD rejection, restart recovery and post-revocation signing refusal.

The local provider file is explicitly not production custody. Production must
replace it with a KMS/HSM implementation of the same provider boundary and
publish trusted verification keys according to operational policy.
