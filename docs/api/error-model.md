# API Error Model

All HTTP errors use a stable traceable response shape:

```json
{
  "success": false,
  "errorCode": "GRANT_REVOKED",
  "code": "GRANT_REVOKED",
  "message": "GRANT_REVOKED",
  "traceId": "req-...",
  "requestId": "req-...",
  "eventId": "err-...",
  "timestamp": "2026-05-27T00:00:00Z"
}
```

`code` and `requestId` remain compatibility fields. Missing authentication is
`401`; malformed input and integrity format failures are `400`; authorization
and policy decisions are `403`; rate limiting is `429`. Unexpected exceptions
return only a generic internal error response.

## Object Enumeration Boundary

An HTTP caller cannot distinguish an existing-but-unauthorized data, grant or
package identifier from a guessed identifier. Both are mapped to external
`ACCESS_DENIED` with message `object is not accessible`. Internal service
decisions and audit records retain precise reasons for operator investigation.

`ApiIntegrationTest.enumerationOracleResponsesHaveStableStatusCodeMessageAndSchema`
compares inaccessible and missing data, grant and package targets across HTTP
status, external code, message and response-field schema. Timing is not
claimed constant-time; deployments should measure latency distributions under
their database, network and rate-limit configuration.

## Security Codes

| Code | Meaning |
| --- | --- |
| `ACCESS_DENIED` | Caller is not allowed to access an object, or object visibility is hidden |
| `CRYPTO_PROFILE_NOT_ALLOWED` | Active profile forbids the requested suite |
| `CRYPTO_CONTEXT_MISMATCH` | Uploaded AAD differs from canonical context |
| `PROOF_INVALID` | Formal proof is missing, tampered, expired or untrusted |
| `THRESHOLD_NOT_REACHED` | Insufficient valid signed shares |
| `THRESHOLD_SHARE_INVALID` | Share context or signature is invalid |
| `IDEMPOTENCY_CONFLICT` | One key was reused with a different request body |
