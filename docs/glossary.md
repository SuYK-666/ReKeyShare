# Glossary

| Term | Meaning |
| --- | --- |
| AAD | Authenticated additional data bound to encrypted material |
| Access policy | Constraints on recipient actions and counts |
| Actor | Authenticated subject requesting an operation |
| Algorithm suite | Named collection of cryptographic mechanisms |
| Anchor | Persisted checkpoint outside the mutable audit sequence |
| Audit event | Hash-chained record of a security-relevant decision |
| Baseline | Teaching or comparison implementation, not production assurance |
| Capsule | Wrapped data-encryption-key material and its metadata |
| Canonicalization | Deterministic byte construction before hashing/signing |
| Ciphertext | Encrypted content stored by the platform |
| Content key version | Rotation epoch for the encrypted content key |
| DEK | Data encryption key used on content |
| Envelope | Direct recipient key-wrapping construction |
| Formal proof | `POLICY_BOUND_PROOF_V1` signed transformation evidence |
| Grant | Owner-to-recipient authorization and policy object |
| HPKE-style | Engineering comparison envelope, not RFC interoperability claim |
| Idempotency key | Client key binding retries to one business result |
| Key epoch | Proxy signing key rotation generation |
| Key provider | Replaceable signing/wrapping custody interface |
| Manifest | Digest set authenticating a shared package payload |
| Nonce | Unique random/allocated input used by AEAD or proof replay |
| Object store | Ciphertext blob storage boundary |
| Owner | Principal creating content and grants |
| Package | Recipient-facing encrypted sharing payload |
| Policy hash | Digest of canonical authorization policy |
| PRE | Proxy re-encryption concept |
| Profile | Runtime capability and dependency selection |
| Proof replay | Reuse of an already consumed formal proof |
| Proxy | Authorized capsule transformation node |
| Recipient | Principal authorized to retrieve encrypted package material |
| Rekey | Material enabling authorized conversion |
| Revocation | Blocking future authorized use of a grant/key |
| Scheme allowlist | Algorithms a proxy node is admitted to execute |
| Secure-local | Durable local verification profile using H2/files |
| Tenant | Isolation scope carried by identity and security metadata |
| Threshold | k-of-n governance prototype requiring multiple shares |
| Transcript | Evidence of threshold aggregation context and shares |
| Trust domain | Administrative boundary under common policy/key governance |
| Verification CLI | Offline machine-readable evidence entry point |
