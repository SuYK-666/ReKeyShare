# Second Iteration Traceability

This matrix is the authoritative mapping for changes made on 2026-05-27. It
supplements the original traceability matrix without claiming unfinished
runtime deployment work.

| Item | Status | Code | Tests | Documentation |
| --- | --- | --- | --- | --- |
| P0-01 proof replay | implemented | `storage/ProofReplayRepository`, `storage/JdbcProofReplayRepository`, `ConversionProofService`, `schema.sql` | `ConversionProofServiceTest`, `PolicyBoundProofTamperTest`, `JdbcProofReplayRepositoryTest` | `security/proof-replay.md` |
| P0-01b replay composition guard | implemented: non-demo rejects in-memory repository | `ConversionProofService`, `ReKeyShareApplication` | `ConversionProofServiceTest`, `JdbcProofReplayRepositoryTest` | `security/proof-replay.md`, `deployment.md` |
| P0-02 tenant binding | implemented for proof and object authorization paths | `ConversionProofService`, `ObjectAuthorizationService`, tenant-scoped repositories, `ReKeyShareApplication` | `ConversionProofServiceTest`, `TenantAuthorizationTest` | `multi-tenant-isolation.md`, `api/authorization-matrix.md` |
| P0-03 secure-local security state | implemented: audit/replay/idempotency/proxy/data/grant/package/object/key wired | `RuntimeProfile`, `ReKeyShareApplication`, `JdbcDataRepository`, `JdbcGrantRepository`, `JdbcReEncryptedPackageRepository`, JDBC/file adapters | `JdbcLiveRepositoryTest`, `ApiIntegrationTest`, `JdbcProxyNodeRepositoryTest`, `ObjectStoreTest` | `deployment.md`, `storage/repository-design.md` |
| P0-04 proxy machine binding | implemented at service boundary; demo transports fixture fingerprint | `SecurityContext`, `ProxyReEncryptionService`, `ProxyNodeService` | `ProxyNodeServiceTest`, `ApiIntegrationTest` | `security/proxy-governance.md` |
| P0-05 legacy downgrade | implemented | `ConversionProofService.verifyLegacyDemo`, `PackageVerifier` | proof/package tests | `security/proof-replay.md` |
| P0-06 enumeration protection | implemented at HTTP mapper with structural oracle test | `ReKeyShareApplication`, `ErrorResponseMapper` | `ApiIntegrationTest.enumerationOracleResponsesHaveStableStatusCodeMessageAndSchema` | `api/error-model.md` |
| P0-07 durable idempotency | implemented in secure-local | `JdbcIdempotencyRepository`, `IdempotencyService`, `schema.sql` | `JdbcIdempotencyRepositoryTest`, `ApiIntegrationTest` | `storage/repository-design.md` |
| P0-08 tenant audit | implemented through authorization denial and HTTP query paths | `AuditEvent`, `AuditRepository`, `JdbcAuditRepository`, `ObjectAuthorizationService`, `ReKeyShareApplication` | `JdbcAuditRepositoryTest`, `AuditHashChainTest`, `TenantAuthorizationTest` | `multi-tenant-isolation.md` |
| P0-09 local KMS replacement | implemented for secure-local | `LocalKeyManagementProvider` | `LocalKeyManagementProviderTest` | `security/key-lifecycle.md` |
| P1-14 attack matrix CI | implemented at 40-case target | `AttackDatasetFactory`, `AttackMatrixRunner` | `AttackMatrixRunnerTest` | `security/ATTACK_MATRIX.md` |
| P1-17 object storage | implemented for secure-local | `FileObjectStore` | `ObjectStoreTest` | `storage/repository-design.md` |
| P1-19 atomic counters | implemented at JDBC boundary | `JdbcGovernanceRepository`, `schema.sql` | `JdbcGovernanceRepositoryTest` | `security/access-counter.md` |
| P1-01 threshold session replay | implemented for durable consumed sessions; independent process cluster remains bounded | `ThresholdSessionService`, `JdbcThresholdSessionConsumptionRepository`, `schema.sql` | `ThresholdContextBindingTest` | `algorithms/threshold-prototype.md` |
| P1-04 HPKE positioning | complete as HPKE-style only; no RFC 9180 claim | `HpkeStyleEnvelopeProvider`, `AlgorithmSuite` | `EnvelopeProviderNegativeTest` | `crypto/HPKE_STYLE_ENVELOPE_V1.md` |
| P1-16 manifest versions | implemented | `PackageManifest`, `PackageVerifier` | `PackageVerifierTest`, `ApiIntegrationTest` | `package-format/v2.md` |
| P1-20 token fixture boundary | implemented for profile separation; external IdP still boundary | `ReKeyShareApplication`, `IdentityProviderAdapter` | `ApiIntegrationTest` | `deployment.md` |
| P1-03 JWKS identity adapter | local fixture implemented; remote HTTP composition pending | `IdentityProviderAdapter`, `LocalJwksIdentityProviderAdapter` | `LocalJwksIdentityProviderAdapterTest` | `security/identity-provider.md`, `known-limitations.md` |
| P2-28 verification CLI | implemented for built-in fixtures | `VerificationCli` | `VerificationCliTest` | `cli-verification.md` |
| P2-29/P2-36 identifiers/RNG | implemented | `SecureRandomUtil.randomId` and model/service callers | `SecureRandomUtilTest` | `reports/SECOND_ITERATION_REPORT.md` |
| P2-30 schema versions | implemented through V005 | `JdbcSchemaInitializer`, `schema_migrations` | `JdbcGovernanceRepositoryTest`, `JdbcLiveRepositoryTest`, `ThresholdContextBindingTest` | `database-migration-v2.md` |
| P2-31 auditor separation | implemented for audit/proxy administration | `UserRole`, `ReKeyShareApplication` | `ApiIntegrationTest` | `api/authorization-matrix.md` |
| P2-32 local audit anchor | implemented | `AuditAnchorService` | `AuditAnchorServiceTest` | `security/AUDIT_MODEL.md` |
| P2-34 secure-local config fail-fast | implemented | `ReKeyShareApplication.ApiState` | `ApiIntegrationTest` | `deployment.md` |
| P2-33 stable wire errors | implemented | `ErrorResponseMapper` | `ErrorResponseMapperTest`, `ApiIntegrationTest` | `api/error-model.md` |
| P2-35 bounded executor | implemented | `ReKeyShareApplication` | API tests | `reports/SECOND_ITERATION_REPORT.md` |
| P2-26/P2-38 documentation authority/glossary | implemented | n/a | documentation link gate | `doc-index.md`, `glossary.md` |
| P1-23/P3-42 dependency and artifact evidence | implemented in CI | `.github/workflows/backend-ci.yml`, `pom.xml` | CI release gate | `ops/dependency-license-policy.md`, `quality/quality-gates.md` |
| P2-39 fixed security dataset | implemented | `AttackDatasetFactory`, `AttackEvidenceWriter` | `AttackMatrixRunnerTest` | `testing/security-fixtures-v2.md` |
