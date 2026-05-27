# Threshold Prototype

`ThresholdSecretSharing` applies Shamir sharing over GF(256) to experimental
re-key material. At least `k` of `n` signed shares are required to reconstruct
the material. Experiment E13 covers `k=2,n=3` and `k=3,n=5`.

`ThresholdSessionService` validates signed, context-bound submissions and
rejects duplicate proxy shares. A successful session is consumed exactly once.
`JdbcThresholdSessionConsumptionRepository` persists that consumption so an
aggregator restart cannot replay an already completed session.

Evidence is provided by `ThresholdContextBindingTest`, including insufficient
shares, duplicates, wrong context and durable replay-after-restart rejection.

This is a governance simulator, not a reviewed threshold PRE protocol or an
independently deployed proxy cluster. Independent process endpoints and
external private-key custody remain deployment work.
