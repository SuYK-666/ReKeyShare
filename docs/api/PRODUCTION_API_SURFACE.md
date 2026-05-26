# Production API Surface

## Scope

The production profile exposes only ciphertext-oriented business and management
surfaces. Authentication and KMS integration remain deployment requirements.

| Surface | Production behavior |
| --- | --- |
| `/api/data/upload-encrypted` | Accept encrypted object material only |
| `/api/shared-packages/{packageId}` | Return encrypted package metadata after authorization |
| `/api/audit/**` | Administrator-only verification and export |
| `/api/storage/**` | Administrator-only operational endpoints |
| `/api/data/upload` | Disabled; plaintext demo route |
| `/api/grants`, `/api/grants/ecc`, `/api/proxy/re-encrypt` | Baseline-only transform routes omitted from production OpenAPI and not usable as production flows |
| `/api/demo/**`, `/experiments/**` | Disabled/absent in production |

## Verification

`ProductionProfileBaselineRouteDisabledTest` verifies that baseline endpoints are
not advertised and baseline user registration is rejected in production.
