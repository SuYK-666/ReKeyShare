# Documentation Authority Index

This index defines the single authoritative source for each class of project
fact. `README.md` is an entry point only and must not redefine protocol
details.

| Fact Scope | Authoritative Document | Supporting Evidence |
| --- | --- | --- |
| Security architecture and trust claims | `SECURITY_DESIGN.md`, `security/security-boundary.md` | `reports/SECOND_ITERATION_REPORT.md` |
| Cryptographic scheme positioning | `CRYPTO_SCHEME.md`, `crypto/HPKE_STYLE_ENVELOPE_V1.md` | crypto tests |
| Formal conversion proof and replay | `crypto/POLICY_BOUND_PROOF_V1.md`, `security/proof-replay.md` | proof tests |
| Multi-tenant boundaries | `multi-tenant-isolation.md` | JDBC/AAD/proof tests |
| Proxy lifecycle and admission | `security/proxy-governance.md` | proxy tests |
| API and external errors | OpenAPI output, `api/error-model.md` | API integration tests |
| Package representation | `package-format/v2.md` | package tests |
| Storage/profile mapping | `storage/repository-design.md`, `deployment.md` | JDBC/HTTP restart tests |
| Known boundaries | `known-limitations.md` | traceability matrix |
| Test/acceptance mapping | `testing/SECOND_ITERATION_TRACEABILITY.md` | `reports/final-verification.md` |
| Experiments and measured reports | `experiments/experiment-design.md`, `reports/raw`, `reports/summary` | `experiment-environment.json` |
| Terminology | `glossary.md` | model/API naming review |
