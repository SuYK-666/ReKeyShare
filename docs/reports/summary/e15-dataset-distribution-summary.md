# E15 Dataset Distribution Comparison

- Commit: `172f38c`
- JDK: `25.0.2`
- OS: `Windows 11 10.0`
- Generated: `2026-05-26T15:36:25.830032100Z`

Five reproducible plaintext distributions were measured at 1 MB for 30 samples each. AES-GCM does not compress input, so this evidence measures distribution sensitivity without treating compressibility as a security gain.

| Distribution | Samples | Mean Encrypt Ms | Mean Decrypt Ms | Success |
| --- | ---: | ---: | ---: | --- |
| deterministic-random | 30 | 1.3700 | 0.8363 | PASS |
| zero-heavy | 30 | 0.8373 | 0.3643 | PASS |
| text-json | 30 | 0.6818 | 0.2850 | PASS |
| binary-image-like | 30 | 0.7677 | 0.3085 | PASS |
| compressible | 30 | 0.7567 | 0.4210 | PASS |

Raw data: `../raw/e15-dataset-distribution-results.csv`

Result: **PASS** (all distributions recovered correctly).
