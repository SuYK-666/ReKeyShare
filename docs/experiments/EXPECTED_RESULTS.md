# Expected Security Results

## Scope

Security correctness, not throughput, is the current acceptance axis.

| Experiment | Acceptance target |
| --- | --- |
| E-01 plaintext/key exposure | leak count `0` |
| E-02 AAD binding | false accept `0` |
| E-03 proof binding and signer trust | false accept/replay `0` |
| E-04 revocation/key freshness | accepted stale package `0` |
| E-05 IDOR/BOLA/tenant isolation | accepted unauthorized access `0` |
| E-06 HPKE-style envelope | wrong recipient/AAD/header acceptance `0` |
| E-07 threshold context | invalid share acceptance `0` |
| E-08 nonce uniqueness | duplicate nonce acceptance `0` |
| E-09 audit tamper | detection rate `100%` |
| E-10 restart persistence | decision consistency `100%` |
| E-11 idempotency/error stability | conflicts detected `100%` |
| E-12 traceability | mapped requirements `100%` |
