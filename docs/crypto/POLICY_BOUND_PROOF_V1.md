# Policy-Bound Proof V1

## Scope

`POLICY_BOUND_PROOF_V1` authenticates a proxy transformation result and its
authorization context. It does not claim that a teaching PRE primitive becomes a
production-reviewed cryptographic scheme.

## Bound Payload

| Field | Security binding |
| --- | --- |
| `tenantId`, `dataId`, `packageId` | Prevent cross-tenant/object/package reuse |
| `grantId`, `ownerId`, `recipientId` | Bind authorization principals |
| `policyHash`, `contentKeyVersion` | Prevent policy replacement and stale-key use |
| `capsuleHash`, `ciphertextHash`, `aadHash`, `manifestHash` | Bind cryptographic material and package integrity |
| `proxyId`, `keyId`, `keyEpoch` | Bind trusted signer registry identity |
| `issuedAt`, `expiresAt`, `proofNonce` | Enforce time window and replay control |
| `algorithmSuite` | Prevent provider confusion |

## Verification

The signature input is UTF-8 canonical JSON in deterministic lexical field order.
Validation rebuilds the payload, resolves `keyId` in `ProxySigningKeyRegistry`,
checks key state/time, verifies Ed25519, and registers the nonce when processing a
new proof submission. A stored package may be downloaded more than once subject
to grant policy; that is not a new proof submission.

## Evidence

`PolicyBoundProofTamperTest` covers 11 field mutations, key revocation, expiry
and replay rejection. `ConversionProofServiceTest` covers service integration.
