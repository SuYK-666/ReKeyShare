# CI Quality Gates

`.github/workflows/backend-ci.yml` executes on Java 17:

1. `mvn --batch-mode verify`: JUnit, JaCoCo, SpotBugs, Spotless and CycloneDX.
2. OWASP Dependency Check with `CVSS >= 7` configured as failure.
3. Frontend CycloneDX SBOM generation after `npm ci`.
4. Security-boundary, experiment, documentation-link and performance checks.
5. SHA-256 evidence generation and artifact upload.

## Branch Gates

The build rejects branch-coverage regressions for security-critical classes at
their currently demonstrated baselines:

| Component | Enforced branch floor | Review target |
| --- | ---: | ---: |
| `PolicyBoundProofVerifier` | 75% | 85% |
| `ObjectAuthorizationService` | 60% | 80% |
| `ProxyNodeService`, `PackageVerifier` | 70% | 80% / 85% |
| `AuditProofService`, `ErrorResponseMapper` | 80% | 80% / 90% |

These are enforceable floors, not a claim that the target maturity gate has
already been reached. New negative-path tests should raise the floors until
the review targets are met.

## Formatting And Evidence

Spotless with the Eclipse Java formatter executes during `verify`; unformatted
Java fails CI. This formatter is used because it remains compatible with the
JDK used to run local/CI quality gates. XML and YAML build/workflow files
remain structured multiline files for review.

Evidence checksums cover backend/frontend SBOMs and regenerated attack-matrix
JSON/Markdown files. GitHub Actions run URLs and artifact retention are
provided by the hosting workflow run rather than generated locally.
