# Repository Design

## Profile Mapping

| Profile | Audit | Proof replay | Idempotency | Ciphertext store | Local key provider |
| --- | --- | --- | --- | --- | --- |
| `DEMO` | memory | memory | memory | memory boundary | none |
| `PRODUCTION` | external deployment boundary | external deployment boundary | external deployment boundary | external deployment boundary | KMS/HSM boundary |
| `SECURE_LOCAL` | H2 file JDBC | H2 file JDBC | H2 file JDBC | `FileObjectStore` | `LocalKeyManagementProvider` |

`SECURE_LOCAL` is the reproducible durable local security-state profile. It
does not claim an external identity provider, KMS/HSM or immutable audit
anchor. The current domain object repositories for live data/grant/package
API operations remain in-memory while `JdbcGovernanceRepository` supplies
restart/revoke/counter evidence at the governance persistence boundary.

## Durable Controls

`schema.sql` contains:

- tenant-scoped governance records for users, data, grants, packages and proxy nodes;
- unique nonce allocation records;
- `proof_replay_consumptions`, whose primary key atomically rejects duplicate formal proof consumption;
- `idempotency_requests`, which retains response bodies across local restarts;
- tenant-bearing audit events with indexed tenant queries.

Evidence is provided by `JdbcGovernanceRepositoryTest`,
`JdbcProofReplayRepositoryTest`, `JdbcIdempotencyRepositoryTest`,
`JdbcAuditRepositoryTest`, `ObjectStoreTest` and the `SECURE_LOCAL` HTTP
restart scenario in `ApiIntegrationTest`.
