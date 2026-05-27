# Second Iteration Verification Report

## Measurement Metadata

| Field | Value |
| --- | --- |
| Status | measured |
| Date | 2026-05-27 |
| Command | `mvn -q test -DskipTests=false`; `mvn -q verify -DskipTests=false` |
| Profile | unit/integration test profiles |
| Dataset | repository fixtures and JDBC H2 file restart fixture |

## Completed In This Run

| Requirement | Implementation Evidence | Test Evidence | Result |
| --- | --- | --- | --- |
| P0-01 replay consume | `ProofReplayRepository`, `JdbcProofReplayRepository`, replay unique primary key | `ConversionProofServiceTest`, `PolicyBoundProofTamperTest`, `JdbcProofReplayRepositoryTest` | PASS |
| P0-02 proof tenant input | Proof issue receives `SecurityContext.tenantId()` | `ConversionProofServiceTest` cross-tenant rejection | PASS for formal proof boundary |
| P0-04 proxy admission | Re-encrypt service invokes `ProxyNodeService` | proxy/API regression suite | PASS for wired service |
| P0-05 downgrade boundary | Legacy method is named `verifyLegacyDemo`; formal package uses trusted verifier | package/proof suite | PASS |
| P0-06 enumeration response | Stable external inaccessible-object response | `ApiIntegrationTest` | PASS |
| P0-08 tenant audit model | `AuditEvent.tenantId`, JDBC column/index and tenant query | `JdbcAuditRepositoryTest` | PASS at repository boundary |
| P0-07 durable idempotency | JDBC response repository and secure-local HTTP wiring | `JdbcIdempotencyRepositoryTest`, `ApiIntegrationTest` restart flow | PASS for secure-local |
| P0-09 local key provider | `LocalKeyManagementProvider` sign/wrap/rotate/revoke | `LocalKeyManagementProviderTest` | PASS for secure-local |
| P1-14 attack matrix CI size | `AttackDatasetFactory` has 40 machine-readable rejection cases | `AttackMatrixRunnerTest` asserts exactly 40 cases | PASS |
| P1-17 local ciphertext store | `FileObjectStore` tenant/path/digest boundary | `ObjectStoreTest` | PASS for secure-local |
| P2-28 offline verifier commands | four JSON verification commands | `VerificationCliTest` | PASS for built-in verification fixtures |
| P2-29/P2-36 random IDs | `SecureRandomUtil.randomId()` centralized 128-bit IDs | `SecureRandomUtilTest` | PASS |
| P2-30 migrations | `schema_migrations` records V001/V002/V003 and idempotent upgrades | `JdbcGovernanceRepositoryTest`, `JdbcProxyNodeRepositoryTest` | PASS |
| P2-31 auditor isolation | Read/verify audit role separated from proxy administration | `ApiIntegrationTest` | PASS for exposed routes |
| P2-32 file audit anchor | Append-only signed local checkpoint provider | `AuditAnchorServiceTest` | PASS |
| P2-34 local config guard | Secure-local requires configured token signing secret | `ApiIntegrationTest` | PASS |
| P2-35 bounded HTTP workers | Bounded `ThreadPoolExecutor` and queue | API regression suite | PASS |
| P1-16 manifest versions | Version-bound manifest and fail-closed downgrade handling | `PackageVerifierTest`, `ApiIntegrationTest` | PASS |
| P2-33 stable external errors | Centralized `ErrorResponseMapper` | `ErrorResponseMapperTest`, API suite | PASS |
| P0-03 proxy durable state increment | `JdbcProxyNodeRepository`, V003 migration, atomic quota | `JdbcProxyNodeRepositoryTest` | PASS for proxy state |
| P1-20 production demo-secret isolation | Random per-process production token boundary; configured secure-local secret | profile/API suite | PASS for fixture isolation |
| P1-23/P3-42 release evidence gates | Dependency-Check, backend/frontend SBOM and checksums in CI | workflow declaration | CONFIGURED; CI execution required |
| P2-39 fixed security dataset | Versioned 40-case dataset emitted in raw results | `AttackMatrixRunnerTest` | PASS |

## Verified Commands

`mvn test` passed after the second-iteration edits. `mvn verify` passed with
the configured JaCoCo 80 percent line gate, SpotBugs check and CycloneDX SBOM
generation.

## Not Yet Claimed Complete

`secure-local` persists audit, replay, idempotency and proxy node/quota state
and supplies file object/key providers. The live HTTP data/grant/package
repositories are still in-memory; their full durable wiring and externally supplied CLI input
formats remain required before claiming every acceptance item.

## Remaining Acceptance Gaps

| Requirement | Missing Evidence Before It Can Be Marked Complete |
| --- | --- |
| P0-03 / G-05 | Live HTTP `data`/`grant`/`package` repositories are not yet wired to transactional durable storage; a full revoke/package restart flow is still required. |
| P1-11 / G-08 | Threshold code remains a same-process governance prototype; independent proxy endpoints/keys and durable consumed sessions are not implemented. |
| P1-12 / P1-21 | The HTTP application still contains a hand-written routing switch rather than a validated route registry that generates OpenAPI. |
| P1-20 | Demo-secret use is isolated from formal profiles, but a JWKS/OIDC-backed `IdentityProviderAdapter` is not provisioned. |
| P1-24 / Q-03 | Bundle line coverage is gated; a 75-percent branch gate scoped to proof/auth/policy/package/audit is not configured. |
| P2-27 | Newly executed experiment summaries are measured, but legacy report families have not all been normalized to one metadata schema. |

Accordingly, this report records meaningful completed work and passing local
gates, but does not mark the entire second-iteration acceptance checklist as
complete.
