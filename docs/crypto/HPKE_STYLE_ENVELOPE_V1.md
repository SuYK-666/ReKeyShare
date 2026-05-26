# HPKE-Style Envelope V1

## Scope

`HPKE_STYLE_ENVELOPE_V1` is a direct-recipient envelope provider built from
P-256 ECDH, HKDF-SHA256 and AES-256-GCM. It is an engineering comparison path;
it is not proxy re-encryption and it cannot transform an existing capsule.

## Context Binding

The authenticated header binds `tenantId`, `dataId`, `recipientId`,
`policyHash`, `contentKeyVersion`, `algorithmSuite`, version, recipient key id
and issuance time. Opening rejects an altered header, altered context, a wrong
recipient private key or a PRE suite substituted into the header.

## Evidence

`EnvelopeProviderNegativeTest` proves valid opening, wrong recipient rejection,
AAD/context rejection, key-version rejection and suite-confusion rejection.
