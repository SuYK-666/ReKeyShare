# Third Iteration Progress

This progress record captures the upgrade work implemented and locally
verified on 2026-05-27.

## Completed

| Item | Result | Evidence |
| --- | --- | --- |
| P0-01 live persistence | `SECURE_LOCAL` wires JDBC data/grant/package repositories with V004 complete payload/state columns | `JdbcLiveRepositoryTest` |
| P0-02 / P1-07 tenant authorization and audit | Domain objects and formal authorization paths carry tenant identity; mismatch is externally hidden and internally audited | `TenantAuthorizationTest`, `ApiIntegrationTest` |
| P0-03 proof replay composition | Non-demo profiles fail on in-memory replay; JDBC replay concurrency/restart retained | `ConversionProofServiceTest`, `JdbcProofReplayRepositoryTest` |
| P0-04 proxy identity binding | Registered fingerprint must match presented machine credential in addition to token subject/tenant/scheme/quota | `ProxyNodeServiceTest` |
| P0-05 enumeration schema | Missing and unauthorized data/grant/package HTTP responses match on status/code/message/schema | `ApiIntegrationTest.enumerationOracleResponsesHaveStableStatusCodeMessageAndSchema` |
| P1-04 HPKE positioning | Retained `HPKE_STYLE_ENVELOPE_V1` as non-RFC, non-PRE envelope with negative tests | `EnvelopeProviderNegativeTest` |
| P1-06 formatting | Spotless formatter runs during `verify`; Java sources formatted | `mvn verify` |

## Partially Completed

| Item | Delivered | Remaining |
| --- | --- | --- |
| P1-01 threshold | V005 durable consumed sessions reject replay after aggregator restart | Separate proxy-a/b/c endpoints and externally held signing keys |
| P1-03 identity | Local Ed25519 JWKS adapter validates `kid`, issuer, audience, tenant, expiry, role and rotation | Remote JWKS refresh and HTTP authentication composition |
| P1-05 coverage | Enforced branch regression floors on key security classes | Raise floors to the requested 80-90% targets with more negative-path tests |
| P1-08 evidence | Workflow checksum includes SBOM and attack-matrix artifacts before upload | A real green GitHub Actions run URL and retained download artifacts |

## Not Yet Implemented

| Item | Reason/next engineering boundary |
| --- | --- |
| P1-02 route registry/OpenAPI generation | Existing handwritten dispatcher needs a dedicated registry/filter extraction without changing route behavior |

## Local Verification

`mvn -q verify` passed after all implemented changes, including JUnit,
JaCoCo configured gates, SpotBugs, Spotless and backend SBOM generation.
