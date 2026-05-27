# Canonical Context Binding

`SECURE_ENVELOPE_V1` constructs authenticated data through `AadBuilder` using
length-prefixed UTF-8 fields. Values are never joined by an ambiguous raw
delimiter. Required fields and their order are:

| Field | Security Purpose |
| --- | --- |
| `tenantId` | Isolate tenant scope |
| `dataId` | Bind the ciphertext object |
| `ownerId` | Bind the owner |
| `recipientId` | Bind the authorized recipient |
| `algorithm` | Prevent algorithm substitution |
| `algorithmSuite` | Prevent suite/version downgrade |
| `ownerKeyId` | Bind owner key identity |
| `contentKeyVersion` | Reject old envelope replay |
| `policyHash` | Bind authorization policy |
| `grantId` | Bind grant instance |
| `proofIssuerId` | Bind transformation issuer |
| `operation` | Prevent upload/download/re-encrypt confusion |

All fields are UTF-8 strings; integer versions are canonical base-10 strings.
Binary material is represented as Base64URL at protocol boundaries and hashes
as documented SHA-256 hex or Base64URL values. Implementations must apply the
same Unicode input policy before constructing AAD; no permissive normalization
is performed by the Java builder.

`AadBuilderCanonicalizationTest` covers empty values, numeric differences and
delimiter-containing values. `CryptoProviderTest` and
`DataSecurityUploadEncryptedTest` prove that changed context/AAD is rejected
before storage or decryption.
