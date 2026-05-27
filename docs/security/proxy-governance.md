# Proxy Governance

A proxy token is not sufficient authority to transform a grant.
`ProxyReEncryptionService.reEncrypt(SecurityContext, grantId)` calls
`ProxyNodeService.assertCanProxy(...)` before transformation. Direct service
invocation is therefore subject to the same node admission rule as HTTP.

The admission decision enforces token subject-to-`proxyId` lookup, the
`PROXY` role, registered `ACTIVE` state, tenant scope, the presented machine
credential fingerprint matching `certificateFingerprint`, scheme allowlist
and quota. Formal proofs additionally bind proxy signing `keyId` and
`keyEpoch`.

`ProxyNodeServiceTest` covers correct/wrong fingerprint, scheme, quota and
revoked-node rejection. `SECURE_LOCAL` wires durable proxy registry/quota
state through `JdbcProxyNodeRepository`. Deployment should populate
`credentialFingerprint` from authenticated mTLS termination or an equivalent
signed machine-identity adapter; the demo HTTP request field is fixture-only.
