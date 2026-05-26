# Multi-Tenant Isolation

The deployable persistence boundary uses `tenant_id` in compound identifiers and every
`JdbcGovernanceRepository` query/update. Two tenants may hold identical object, grant and
package identifiers without revoke or counter mutations crossing the tenant boundary;
`JdbcGovernanceRepositoryTest` verifies this case.

Cryptographic isolation is independent of storage filtering: `tenantId` is one of the 12
canonical AAD fields in `CapsuleContext`, and `CryptoProviderTest` verifies that replacing
it prevents DEK recovery.

Formal conversion proof issuance receives tenant identity from `SecurityContext`,
not proof request data. Trusted verification can require an expected tenant and
rejects a mismatched proof before replay consumption.

`AuditEvent` now contains a hash-bound `tenantId`; `AuditRepository.findByTenant(...)`
and the JDBC tenant index provide a query/storage boundary. Altering an event tenant
invalidates its audit hash chain.

The lightweight HTTP composition is not yet wired to tenant-scoped JDBC repositories,
and baseline/demo event emitters without trusted tenant input use public scope.
Production multi-tenant claims still require durable HTTP repository wiring and
tenant-scoped authorization on audit API queries.
