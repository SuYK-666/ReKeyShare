# Repository Design

## Profile Mapping

| Profile | Audit | Replay/idempotency | Data/grant/package | Ciphertext store | Local key provider |
| --- | --- | --- | --- | --- | --- |
| `DEMO` | memory | memory | memory | memory boundary | none |
| `PRODUCTION` | external deployment boundary | external deployment boundary | external deployment boundary | external deployment boundary | KMS/HSM boundary |
| `SECURE_LOCAL` | H2 file JDBC | H2 file JDBC | H2 file JDBC | `FileObjectStore` | `LocalKeyManagementProvider` |

`SECURE_LOCAL` is the reproducible durable local security-state profile. It
does not claim an external identity provider, KMS/HSM or immutable audit
anchor. Live HTTP domain state is wired to `JdbcDataRepository`,
`JdbcGrantRepository` and `JdbcReEncryptedPackageRepository`; these adapters
persist the encrypted payload/capsule, grant policy and counters, package
status, and conversion proof required for restart-time authorization.
Proxy node admission and quota state is wired to `JdbcProxyNodeRepository`.

## Durable Controls

`schema.sql` contains:

- tenant-scoped governance records for users, data, grants, packages and proxy nodes;
- unique nonce allocation records;
- `proof_replay_consumptions`, whose primary key atomically rejects duplicate formal proof consumption;
- `idempotency_requests`, which retains response bodies across local restarts;
- `proxy_nodes`, whose conditional usage update preserves quota and revocation
  state across local restarts;
- tenant-bearing audit events with indexed tenant queries.
- complete live encrypted data, grant and package payload/status columns,
  including key version and conversion proof bindings.

Evidence is provided by `JdbcGovernanceRepositoryTest`,
`JdbcLiveRepositoryTest`,
`JdbcProofReplayRepositoryTest`, `JdbcIdempotencyRepositoryTest`,
`JdbcAuditRepositoryTest`, `JdbcProxyNodeRepositoryTest`, `ObjectStoreTest` and the `SECURE_LOCAL` HTTP
restart scenario in `ApiIntegrationTest`.
