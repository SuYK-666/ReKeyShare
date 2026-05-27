# Final Verification

- Commit: `22bc6b5190c0032d5e954f75fe8fb8381a75da17`
- Executed at: `2026-05-27T09:54:42.4311349+08:00`
- Duration seconds: `175.74`
- Java: `java version "25.0.2" 2026-01-20 LTS`
- Build/unit/integration/security/static-quality gates (`mvn verify`): `PASS`
- Security boundary gate: `PASS`
- Reproducible experiment runner: `PASS`
- Documentation links and performance budget: `PASS`

Raw experiment evidence is preserved under `docs/reports/raw/`; interpreted summaries are under `docs/reports/summary/`.
Deployment-scoped integrations (KMS/HSM, OIDC/mTLS, WORM anchor, durable multi-instance runtime wiring) remain explicit boundaries.
