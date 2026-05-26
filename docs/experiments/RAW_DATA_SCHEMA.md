# Raw Data Schema

## Scope

Attack and final evidence files use one result row per executable security case.

| Field | Meaning |
| --- | --- |
| `experimentId` | Evidence family |
| `caseId` | Stable test/attack identifier |
| `requirementId` | Traceability key |
| `mutatedField` | Security context field altered |
| `expectedDecision` / `actualDecision` | `ACCEPT` or `REJECT` |
| `externalErrorCode` | Stable caller-facing code |
| `internalAuditReason` | Auditable control reason |
| `auditEventId` | Event correlation key |
| `evidencePath` | Raw JSON path |
| `passed` | Equality of expected and actual behavior |
