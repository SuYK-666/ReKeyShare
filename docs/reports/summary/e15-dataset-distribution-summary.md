# E15 Dataset Distribution Comparison

- Commit: `628cb38`
- JDK: `25.0.2`
- OS: `Windows 11 10.0`
- Generated: `2026-05-26T16:34:06.968539400Z`

Five reproducible plaintext distributions were measured at 1 MB for 30 samples each. AES-GCM does not compress input, so this evidence measures distribution sensitivity without treating compressibility as a security gain.

| Distribution | Samples | Mean Encrypt Ms | Mean Decrypt Ms | Success |
| --- | ---: | ---: | ---: | --- |
| deterministic-random | 30 | 1.3874 | 0.8427 | PASS |
| zero-heavy | 30 | 0.9812 | 0.3587 | PASS |
| text-json | 30 | 0.6857 | 0.2900 | PASS |
| binary-image-like | 30 | 0.6653 | 0.2871 | PASS |
| compressible | 30 | 0.6894 | 0.4325 | PASS |

Raw data: `../raw/e15-dataset-distribution-results.csv`

Result: **PASS** (all distributions recovered correctly).
