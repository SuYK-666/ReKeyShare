# CLI Verification

The offline verifier provides JSON results without starting the HTTP server:

```powershell
mvn -q -DskipTests compile
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="crypto verify-envelope" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="audit verify" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="attack-matrix check" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="verify-package" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="verify-proof" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="verify-audit" exec:java
mvn -q -Dexec.mainClass=com.example.pre.app.VerificationCli -Dexec.args="verify-threshold" exec:java
```

`crypto verify-envelope` performs a formal `SECURE_ENVELOPE_V1` round trip and
an authenticated-context tamper rejection. `audit verify` checks a hash chain
and Ed25519 checkpoint proof. `attack-matrix check` ensures the maintained
security mapping contains at least 30 scenarios.

`verify-package` validates a package manifest and rejects a modified payload.
`verify-proof` validates a formal signed proof and rejects replay.
`verify-audit` validates a hash chain and signed checkpoint. `verify-threshold`
validates a quorum result and rejects an insufficient set. All commands print
machine-readable JSON.

The CLI is an offline verification entry point; importing externally provisioned
KMS signing keys or production database exports remains deployment integration.
