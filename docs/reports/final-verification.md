# Final Verification

- Commit: `628cb38b56eb804479fcdd3e6a5cffb3696f1a4a`
- Executed at: `2026-05-27T00:35:05.0259077+08:00`
- Duration seconds: `134.35`
- Java: `java version "25.0.2" 2026-01-20 LTS`
- Build/unit/integration/security/static-quality gates (`mvn verify`): `PASS`
- Security boundary gate: `PASS`
- Reproducible experiment runner: `PASS`
- Documentation links and performance budget: `PASS`

Raw experiment evidence is preserved under `docs/reports/raw/`; interpreted summaries are under `docs/reports/summary/`.
Deployment-scoped integrations (KMS/HSM, OIDC/mTLS, WORM anchor, durable multi-instance runtime wiring) remain explicit boundaries.
