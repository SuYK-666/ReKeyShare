# Audit Model

## Scope

Security-relevant allow and reject decisions form a hash chain. An
`AuditAnchorProvider` exports signed checkpoints so an external immutable system
can preserve roots outside the application database.

Local hash-chain verification detects event modification, removal or reordering.
The local file anchor is suitable only for development evidence, not an
independent production trust anchor.
