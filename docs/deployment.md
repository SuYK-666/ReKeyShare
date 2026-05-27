# Deployment And Verification

## Runtime Profiles

| Profile | Purpose |
| --- | --- |
| `production` | formal route/provider boundary; uses an ephemeral process token key pending external IdP integration |
| `secure-local` | local H2 audit/replay/idempotency/proxy state, file ciphertext store and local key provider |
| `demo` | teaching baseline and plaintext verification fixtures only |

Production and secure-local OpenAPI omit plaintext upload, baseline
transformation and demo decrypt routes.

## Secure-Local Start

```powershell
$env:REKEYSHARE_PROFILE = 'secure-local'
$env:REKEYSHARE_LOCAL_TOKEN_SECRET = 'replace-with-at-least-24-local-chars'
mvn -q -DskipTests compile exec:java -Dexec.mainClass=com.example.pre.app.ReKeyShareApplication
```

Defaults:

| Component | Location |
| --- | --- |
| H2 database | `storage/secure-local/rekeyshare` |
| Ciphertext objects | `storage/secure-local/objects` |
| Local key store | `storage/secure-local/keys/keys.properties` |

The local key store is a replaceable functional implementation, not HSM
custody. `secure-local` fails fast unless a non-trivial token signing secret is
supplied by configuration.

`production` never loads the demo fixture token secret: it selects a random
process key only as a fail-closed local boundary until an external identity
adapter is configured. Tokens do not survive a production process restart.

## Remaining Production Integrations

- Replace local/built-in token processing with OIDC or mTLS identity carrying tenant scope.
- Wire complete live domain repositories to transactional managed persistence.
- Provision signing/wrapping private keys in KMS/HSM.
- Anchor audit roots to externally immutable storage.

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
```

The command runs tests, JaCoCo, SpotBugs, SBOM generation, security boundary
checks, reproducible experiments, documentation checks and performance smoke
checks, then updates `docs/reports/final-verification.md`.
