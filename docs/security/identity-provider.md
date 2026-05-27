# Identity Provider Boundary

`IdentityProviderAdapter` defines the external bearer-token boundary:
`verify(...)`, `keys()` and `metadata()`. `LocalJwksIdentityProviderAdapter`
is an offline Ed25519 JWKS fixture implementation for tests and controlled
local composition.

The adapter rejects an unknown `kid`, bad signature, expired JWT, wrong issuer,
wrong audience, missing tenant claim or invalid role claim. Key rotation is
represented by replacing the trusted JWKS snapshot: a newly trusted key
validates and a removed key is rejected.

Evidence is provided by `LocalJwksIdentityProviderAdapterTest`.

The current HTTP bootstrap still uses its built-in token issuer for demo and
local route fixtures. Wiring a remotely refreshed JWKS adapter into HTTP
authentication is required before claiming enterprise IAM integration.
