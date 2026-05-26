# Proxy Governance

A proxy token is not sufficient authority to transform a grant.
`ProxyReEncryptionService.reEncrypt(SecurityContext, grantId)` calls
`ProxyNodeService.assertCanProxy(...)` before transformation. Direct service
invocation is therefore subject to the same node admission rule as HTTP.

The admission decision enforces the `PROXY` role, registered `ACTIVE` state,
tenant scope, scheme allowlist and quota. Formal proofs additionally bind proxy
signing `keyId` and `keyEpoch`.

`ProxyNodeServiceTest` covers scheme, quota and revoked-node rejection. Durable
proxy registry/quota schema exists; full HTTP wiring to a persistent proxy
adapter remains a runtime completion item.
