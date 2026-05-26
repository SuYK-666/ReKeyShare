# Proof Schema

## Scope

This schema describes `POLICY_BOUND_PROOF_V1`.

## Encoding Rules

Required textual fields are non-empty UTF-8 JSON strings. Time fields use UTC
ISO-8601 `Instant` values. Hashes are encoded as `sha256-b64u:<base64url>` for
canonical payload hashes; stored package digests retained from the existing
format are hexadecimal SHA-256 until a package format migration is executed.

The canonical payload excludes `signature` and `canonicalPayloadHash` itself and
uses the field sequence implemented by `ProofPayloadCanonicalizer`.

## Trust Rule

A verifier must resolve `proxyId` plus `keyId` through a trusted registry. It must
never authenticate a formal proof from a public key embedded in the proof.
