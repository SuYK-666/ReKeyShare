# Trust Boundary

## Scope

Validated identity supplies actor and tenant scope. Request body owner/tenant
claims are never sufficient authority. AAD, proofs, object URIs and audit events
must carry tenant context.

## Deployment Boundary

The built-in token and in-memory adapters are reproducible development fixtures.
Production deployment requires OIDC/mTLS, KMS/HSM, durable repositories, an
external object store and an independent audit anchor.
