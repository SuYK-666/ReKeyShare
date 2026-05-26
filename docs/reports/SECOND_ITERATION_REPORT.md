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
| P2-30 migrations | `schema_migrations` records V001/V002 and idempotent column upgrades | `JdbcGovernanceRepositoryTest` | PASS |
| P2-31 auditor isolation | Read/verify audit role separated from proxy administration | `ApiIntegrationTest` | PASS for exposed routes |
| P2-32 file audit anchor | Append-only signed local checkpoint provider | `AuditAnchorServiceTest` | PASS |
| P2-34 local config guard | Secure-local requires configured token signing secret | `ApiIntegrationTest` | PASS |
| P2-35 bounded HTTP workers | Bounded `ThreadPoolExecutor` and queue | API regression suite | PASS |

## Verified Commands

`mvn test` passed after the second-iteration edits. `mvn verify` passed with
the configured JaCoCo 80 percent line gate, SpotBugs check and CycloneDX SBOM
generation.

## Not Yet Claimed Complete

`secure-local` persists audit, replay and idempotency state and supplies file
object/key providers. The live HTTP data/grant/package/proxy repositories are
still in-memory; their full durable wiring and externally supplied CLI input
formats remain required before claiming every acceptance item.
