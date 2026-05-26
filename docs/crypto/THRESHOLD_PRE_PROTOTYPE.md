# Threshold PRE Governance Prototype

## Scope

This module demonstrates k-of-n proxy governance around scoped transformation
shares. It is a backend governance prototype and does not claim production-grade
collusion resistance or a reviewed threshold PRE construction.

## Binding

`ThresholdSession` binds tenant, data, grant, recipient, policy hash, key
version, capsule hash, proxy group and epoch. Every `SignedThresholdShareV2`
signs a digest over this context plus its share. Aggregation rejects insufficient
shares, duplicate proxy identities, changed context, stale epochs, expired
sessions and replayed sessions.

## Transcript

A successful quorum emits `ThresholdTranscript`, whose digest can be checked
offline by `ThresholdTranscriptVerifier`.

## Evidence

`ThresholdContextBindingTest` covers valid 2-of-3 aggregation, insufficient
quorum, duplicate submission, wrong recipient/policy/epoch and session replay.
