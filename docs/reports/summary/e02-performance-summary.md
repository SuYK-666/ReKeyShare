# Performance Summary

Source: `../raw/e02-algorithm-benchmark.csv`

Formal experiment settings: warmup=20 and measurement=100 per algorithm/file size; JUnit may override these values for schema smoke checks.

| Algorithm | File Size | Avg Total Ms | P50 | P95 | P99 | Stddev | Throughput B/s | Avg AES Encrypt Ms | Avg AES Decrypt Ms | Avg ReEncrypt Ms | Capsule Bytes | Success |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| RSA-PRE | 1024 | 17.3804 | 17.0340 | 19.8460 | 21.5398 | 1.2395 | 58917.09 | 0.6874 | 0.0601 | 6.8125 | 444 | PASS |
| RSA-PRE | 102400 | 18.1427 | 18.0810 | 19.2354 | 20.4863 | 0.8761 | 5644133.73 | 1.4924 | 1.0272 | 6.5775 | 444 | PASS |
| RSA-PRE | 1048576 | 19.9577 | 19.6959 | 21.9909 | 24.8942 | 1.1331 | 52539792.94 | 2.3851 | 2.0195 | 6.5952 | 444 | PASS |
| RSA-PRE | 10485760 | 21.9447 | 21.6466 | 23.8861 | 26.6473 | 1.2232 | 477826819.77 | 3.5741 | 2.9272 | 6.4774 | 444 | PASS |
| ECC-PRE | 1024 | 23.6563 | 23.4215 | 26.8882 | 30.6894 | 1.6815 | 43286.58 | 0.5425 | 0.0065 | 3.7415 | 125 | PASS |
| ECC-PRE | 102400 | 22.5891 | 22.5302 | 23.5311 | 25.6375 | 0.7458 | 4533165.02 | 0.5298 | 0.0421 | 3.6152 | 125 | PASS |
| ECC-PRE | 1048576 | 23.2749 | 22.9127 | 25.7256 | 31.5401 | 1.7232 | 45051737.86 | 0.8448 | 0.2982 | 3.6106 | 125 | PASS |
| ECC-PRE | 10485760 | 28.1269 | 27.9606 | 29.3477 | 34.7024 | 1.2505 | 372801598.81 | 3.4046 | 2.9148 | 3.6012 | 125 | PASS |

The CSV remains the source of truth; this summary is generated from the same rows.

## Analysis

Correctness passed for every measured row. On a warmed JVM with CPU AES acceleration, AES-GCM throughput can be faster than the conservative planning interval; lower latency is not a regression when authentication and recovery checks remain successful. RSA/ECC values are baseline comparison data only and do not change their experimental security status.
