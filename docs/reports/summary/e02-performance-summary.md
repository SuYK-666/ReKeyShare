# Performance Summary

Source: `../raw/e02-algorithm-benchmark.csv`

Formal experiment settings: warmup=20 and measurement=100 per algorithm/file size; JUnit may override these values for schema smoke checks.

| Algorithm | File Size | Avg Total Ms | P50 | P95 | P99 | Stddev | Throughput B/s | Avg AES Encrypt Ms | Avg AES Decrypt Ms | Avg ReEncrypt Ms | Capsule Bytes | Success |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| RSA-PRE | 1024 | 17.2316 | 16.6613 | 20.3975 | 22.8391 | 1.7505 | 59425.57 | 0.6517 | 0.0654 | 6.9217 | 444 | PASS |
| RSA-PRE | 102400 | 17.8039 | 17.7280 | 19.0075 | 20.9942 | 0.8973 | 5751541.39 | 1.4752 | 1.0188 | 6.4802 | 444 | PASS |
| RSA-PRE | 1048576 | 19.2632 | 19.0364 | 20.2386 | 23.1811 | 0.9716 | 54434151.42 | 2.3151 | 1.8861 | 6.3892 | 444 | PASS |
| RSA-PRE | 10485760 | 21.4345 | 21.1084 | 23.0758 | 27.4719 | 1.3602 | 489199117.09 | 3.5881 | 2.8132 | 6.3557 | 444 | PASS |
| ECC-PRE | 1024 | 22.1437 | 22.0087 | 23.4344 | 24.9234 | 0.9013 | 46243.50 | 0.5009 | 0.0061 | 3.5386 | 125 | PASS |
| ECC-PRE | 102400 | 22.0862 | 21.9724 | 23.1076 | 23.6135 | 1.0458 | 4636371.09 | 0.5096 | 0.0408 | 3.5077 | 125 | PASS |
| ECC-PRE | 1048576 | 22.5789 | 22.4185 | 23.5460 | 24.3799 | 0.9615 | 46440563.35 | 0.8476 | 0.2950 | 3.5619 | 125 | PASS |
| ECC-PRE | 10485760 | 27.5163 | 27.4207 | 29.0103 | 29.2054 | 0.7410 | 381074005.68 | 3.4228 | 2.8739 | 3.5237 | 125 | PASS |

The CSV remains the source of truth; this summary is generated from the same rows.

## Analysis

Correctness passed for every measured row. On a warmed JVM with CPU AES acceleration, AES-GCM throughput can be faster than the conservative planning interval; lower latency is not a regression when authentication and recovery checks remain successful. RSA/ECC values are baseline comparison data only and do not change their experimental security status.
