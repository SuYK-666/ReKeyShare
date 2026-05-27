# Multi-Tenant Isolation

The deployable persistence boundary uses `tenant_id` in compound identifiers.
Live `JdbcDataRepository`, `JdbcGrantRepository` and
`JdbcReEncryptedPackageRepository` expose tenant-scoped lookups used by the
HTTP authorization path. The metadata governance adapter continues to verify
that identical object IDs do not cross tenant boundaries.

Cryptographic isolation is independent of storage filtering: `tenantId` is one of the 12
canonical AAD fields in `CapsuleContext`, and `CryptoProviderTest` verifies that replacing
it prevents DEK recovery.

Formal conversion proof issuance receives tenant identity from `SecurityContext`,
not proof request data. Trusted verification can require an expected tenant and
rejects a mismatched proof before replay consumption.

`AuditEvent` contains a hash-bound `tenantId`; `AuditRepository.findByTenant(...)`
and the JDBC tenant index provide a query/storage boundary. Altering an event tenant
invalidates its audit hash chain.

`ObjectAuthorizationService` formal entry points receive `SecurityContext` for
data, grant and package actions. A wrong-tenant object is externally reported
using the stable inaccessible-object error while the internal audit event
records `TENANT_MISMATCH_*` under the attacking tenant. Audit event listing and
per-data count APIs filter by the authenticated tenant.

Compatibility overloads used by local demo/scenario fixtures bind to the
`default` tenant; integrations must use the `SecurityContext` overloads.
