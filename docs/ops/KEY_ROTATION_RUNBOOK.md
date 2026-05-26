# Key Rotation Runbook

## Scope

This runbook covers proxy proof-signing keys and threshold group epochs.

## Proxy Signing Keys

1. Create a new `ACTIVE` key with a higher `keyEpoch` in the configured signing
   key registry or KMS adapter.
2. Mark the former signing key `RETIRED`; retained historical proofs may be
   verified according to retention policy, but it may issue no new proof.
3. For suspected compromise, mark the key `REVOKED`; verification rejects proofs
   signed by it and records a security event.
4. Preserve key identifiers, status changes and operator reason in audit storage.

## Threshold Epoch

Rotating a proxy group increments its epoch. New threshold sessions accept only
shares bound to the new epoch; incomplete prior sessions are discarded.
