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

## Vulnerability Data Access

Dependency-Check is a required CI gate and downloads vulnerability metadata
from NVD. Repository administrators must configure the GitHub Actions secret
`NVD_API_KEY`; the workflow exposes it only to the Dependency-Check Maven
step as the `NVD_API_KEY` environment variable.

The Maven configuration reads that environment variable, applies a conservative
NVD API delay, emits HTML and JSON reports, and fails when a dependency reaches
CVSS 7 or higher. CI caches
`~/.m2/repository/org/owasp/dependency-check-data` between runs so builds do
not repeatedly perform a cold metadata download and unnecessarily consume NVD
rate limits.

For a local vulnerability scan:

```powershell
$env:NVD_API_KEY = '<your-nvd-api-key>'
mvn --batch-mode org.owasp:dependency-check-maven:check
```

Skipping this scan is suitable only for diagnosis; it is not an acceptable
release-evidence result.
