# Package Format V2

## Scope

`SharedPackageV2` carries encrypted payload and `PackageManifest`; it never
carries plaintext or a recipient private key.

The manifest binds ciphertext, AAD, capsule, policy and grant context hashes.
The formal policy-bound proof additionally binds tenant, identities, package id,
content key version and trusted proxy key identity. Package validation combines
integrity proof with current authorization freshness.
