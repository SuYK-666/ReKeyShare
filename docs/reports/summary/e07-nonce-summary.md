# E07 Nonce and Replay Boundary

- Commit: `22bc6b5`
- JDK: `25.0.2`
- OS: `Windows 11 10.0`
- Generated: `2026-05-27T01:53:44.149677200Z`

The runner reserved 100 unique nonces and rejected a deliberate duplicate; the JUnit concurrency case additionally proves 100 contenders for one nonce produce exactly one accepted reservation.

Raw data: `../raw/e07-nonce-results.json`

Result: **PASS**.
