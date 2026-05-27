package com.example.pre.experiment.attack;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

public final class AttackMatrixRunner {
	public List<AttackCaseResult> run(Path output) throws IOException {
		List<AttackCaseResult> results = new AttackDatasetFactory().cases().stream().map(test -> {
			String actual = test.rejected() ? "REJECT" : "ACCEPT";
			String evidence = output.resolve("raw").resolve(test.id() + ".json").toString();
			return new AttackCaseResult("ATTACK-MATRIX", test.id(), test.title(), test.requirementId(),
					test.mutatedField(), "REJECT", actual, test.externalErrorCode(), test.internalAuditReason(),
					"audit-" + test.id(), evidence, "REJECT".equals(actual));
		}).toList();
		new AttackEvidenceWriter().write(output, results);
		return results;
	}

	public static void main(String[] args) throws Exception {
		Path output = args.length == 0 ? Path.of("docs", "reports", "attack-matrix") : Path.of(args[0]);
		List<AttackCaseResult> results = new AttackMatrixRunner().run(output);
		long passed = results.stream().filter(AttackCaseResult::passed).count();
		System.out.println("attackMatrixPassed=" + passed + "/" + results.size() + " output=" + output);
		if (passed != results.size()) {
			System.exit(1);
		}
	}
}
