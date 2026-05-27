# Security Fixtures V2

## Fixed Principals

| Principal | Tenant | Role | Expected Scope |
| --- | --- | --- | --- |
| Alice | tenant-a | OWNER | Own data and issue tenant-a grants |
| Bob | tenant-a | RECIPIENT | Read packages explicitly granted to Bob |
| Charlie | tenant-a | RECIPIENT | Cannot read Bob packages |
| ProxyA | tenant-a | PROXY | Transform only while active and within quota |
| Mallory | tenant-b | OWNER | Cannot read or transform tenant-a artifacts |

## Fixed Attack Mapping

The machine-readable attack dataset is versioned as
`security-fixtures-v2`. `AT-01` through `AT-40` are stable case identifiers
defined by `AttackDatasetFactory`; all expect rejection. The data/grant/package
identifier oracle cases use one absent identifier and one existing
unauthorized artifact and require the same external `ACCESS_DENIED` class.

Proof tamper samples cover replay, tenant replacement, version downgrade,
expiry and signer changes. Audit samples cover edited and deleted events plus
tenant replacement. Raw exports include `datasetVersion` so reports remain
traceable when fixtures change.
