# Database Migration V002

`JdbcSchemaInitializer` records applied schema versions in
`schema_migrations`. The current secure-local bootstrap records:

| Version | Purpose |
| --- | --- |
| `V001` | Base governance records: user, data, grant, package and audit baseline |
| `V002` | Proof replay consumption, durable idempotency and tenant-aware audit indexing |

All DDL uses idempotent `CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS`
and migration records use `MERGE`, so secure-local restart does not recreate or
erase state. Destructive downgrade is intentionally unsupported: rollback must
restore a reviewed database backup because replay and audit records are
security evidence.
