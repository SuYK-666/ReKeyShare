# Incident Response Runbook

## Scope

For suspected proxy key compromise: revoke the signer key, rotate to a new
epoch, invalidate affected packages, preserve audit evidence and publish a new
external checkpoint. For content-key exposure: rotate the owner-side encrypted
object version and revoke grants bound to the stale version. Never claim
revocation recovers plaintext already obtained offline.
