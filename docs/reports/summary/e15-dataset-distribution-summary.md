# E15 Dataset Distribution Comparison

- Commit: `22bc6b5`
- JDK: `25.0.2`
- OS: `Windows 11 10.0`
- Generated: `2026-05-27T01:53:43.611493600Z`

Five reproducible plaintext distributions were measured at 1 MB for 30 samples each. AES-GCM does not compress input, so this evidence measures distribution sensitivity without treating compressibility as a security gain.

| Distribution | Samples | Mean Encrypt Ms | Mean Decrypt Ms | Success |
| --- | ---: | ---: | ---: | --- |
| deterministic-random | 30 | 1.3616 | 0.8351 | PASS |
| zero-heavy | 30 | 0.7690 | 0.3551 | PASS |
| text-json | 30 | 0.7086 | 0.2911 | PASS |
| binary-image-like | 30 | 0.7166 | 0.2964 | PASS |
| compressible | 30 | 0.6924 | 0.4543 | PASS |

Raw data: `../raw/e15-dataset-distribution-results.csv`

Result: **PASS** (all distributions recovered correctly).
