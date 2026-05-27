# Dependency And License Policy

## Release Gate

Release CI runs OWASP Dependency-Check with `failBuildOnCVSS=7`, retains its
report, and generates CycloneDX SBOM files for both Maven and npm dependency
graphs. SHA-256 checksums for SBOM artifacts are retained as CI evidence.

## License Review

Permissive licenses such as Apache-2.0, MIT, BSD and ISC are accepted by
default. Copyleft, source-available or unknown licenses require recorded
review before release.

Any vulnerability suppression must identify the advisory, justification,
owner and an expiry or review date. Blanket permanent suppressions are not
accepted.
