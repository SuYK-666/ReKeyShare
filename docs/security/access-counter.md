# Access Counter Semantics

`maxAccessCount` is a successful recipient-use limit, not an attempted-request
limit. Re-encryption is governed separately and does not consume recipient
download/decrypt access.

The JDBC persistence boundary provides atomic conditional updates for:

| Operation | Counter | Limit | Also Consumes Access |
| --- | --- | --- | --- |
| recipient access | `access_count` | `max_access_count` | n/a |
| download | `download_count` | `max_download_count` | yes |
| decrypt | `decrypt_count` | `max_decrypt_count` | yes |
| proxy transform | `reencrypt_count` | `max_reencrypt_count` | no |

Each update succeeds only for an `ACTIVE` grant below its configured limit,
so concurrent consumers cannot over-issue an authorized effect.

## Evidence

- `ApiIntegrationTest.concurrentDownloadsCannotExceedAccessLimit` validates
  the single-process HTTP path under concurrency.
- `JdbcGovernanceRepositoryTest` validates restart persistence and submits 100
  competing access, download and re-encrypt attempts at the JDBC boundary.
