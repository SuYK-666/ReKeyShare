# Performance Summary

Source: `../raw/e02-algorithm-benchmark.csv`

Formal experiment settings: warmup=20 and measurement=100 per algorithm/file size; JUnit may override these values for schema smoke checks.

| Algorithm | File Size | Avg Total Ms | P50 | P95 | P99 | Stddev | Throughput B/s | Avg AES Encrypt Ms | Avg AES Decrypt Ms | Avg ReEncrypt Ms | Capsule Bytes | Success |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| RSA-PRE | 1024 | 18.2787 | 17.6687 | 22.0641 | 24.9010 | 1.8032 | 56021.56 | 0.6941 | 0.0627 | 7.2988 | 444 | PASS |
| RSA-PRE | 102400 | 18.4684 | 18.2836 | 20.3190 | 21.1122 | 1.0705 | 5544605.02 | 1.5431 | 1.0364 | 6.7264 | 444 | PASS |
| RSA-PRE | 1048576 | 19.7208 | 19.6188 | 20.8835 | 21.7567 | 0.8022 | 53170968.35 | 2.2907 | 1.8912 | 6.5754 | 444 | PASS |
| RSA-PRE | 10485760 | 21.8648 | 21.6076 | 23.2657 | 26.6398 | 1.1735 | 479572163.91 | 3.5820 | 2.8872 | 6.4449 | 444 | PASS |
| ECC-PRE | 1024 | 22.1593 | 22.0887 | 23.0085 | 23.5607 | 0.5656 | 46210.80 | 0.4939 | 0.0060 | 3.5073 | 125 | PASS |
| ECC-PRE | 102400 | 22.0786 | 21.9578 | 23.1390 | 24.9177 | 0.7312 | 4637982.17 | 0.5055 | 0.0403 | 3.5238 | 125 | PASS |
| ECC-PRE | 1048576 | 22.8723 | 22.7098 | 24.0521 | 26.8990 | 1.0261 | 45844829.23 | 0.8181 | 0.3173 | 3.5745 | 125 | PASS |
| ECC-PRE | 10485760 | 27.6169 | 27.4710 | 29.0822 | 31.6851 | 1.0811 | 379686131.50 | 3.4425 | 2.9147 | 3.5212 | 125 | PASS |

The CSV remains the source of truth; this summary is generated from the same rows.

## Analysis

Correctness passed for every measured row. On a warmed JVM with CPU AES acceleration, AES-GCM throughput can be faster than the conservative planning interval; lower latency is not a regression when authentication and recovery checks remain successful. RSA/ECC values are baseline comparison data only and do not change their experimental security status.
