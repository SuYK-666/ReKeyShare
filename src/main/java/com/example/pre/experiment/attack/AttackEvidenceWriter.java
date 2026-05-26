package com.example.pre.experiment.attack;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class AttackEvidenceWriter {
    public void write(Path output, List<AttackCaseResult> results) throws IOException {
        Path raw = output.resolve("raw");
        Files.createDirectories(raw);
        Files.writeString(output.resolve("attack-results.json"), json(results), StandardCharsets.UTF_8);
        Files.writeString(output.resolve("attack-results.csv"), csv(results), StandardCharsets.UTF_8);
        Files.writeString(output.resolve("attack-results.md"), markdown(results), StandardCharsets.UTF_8);
        for (AttackCaseResult result : results) {
            Files.writeString(raw.resolve(result.attackId() + ".json"), json(List.of(result)), StandardCharsets.UTF_8);
        }
    }

    private static String json(List<AttackCaseResult> results) {
        StringBuilder out = new StringBuilder("[\n");
        for (int i = 0; i < results.size(); i++) {
            AttackCaseResult r = results.get(i);
            out.append("  {\"experimentId\":\"").append(r.experimentId()).append("\",\"caseId\":\"")
                    .append(r.attackId()).append("\",\"requirementId\":\"").append(r.requirementId())
                    .append("\",\"mutatedField\":\"").append(r.mutatedField()).append("\",\"expectedDecision\":\"")
                    .append(r.expectedDecision()).append("\",\"actualDecision\":\"").append(r.actualDecision())
                    .append("\",\"externalErrorCode\":\"").append(r.externalErrorCode())
                    .append("\",\"internalAuditReason\":\"").append(r.internalAuditReason())
                    .append("\",\"auditEventId\":\"").append(r.auditEventId()).append("\",\"evidencePath\":\"")
                    .append(r.evidencePath().replace("\\", "/")).append("\",\"passed\":").append(r.passed()).append("}");
            out.append(i == results.size() - 1 ? "\n" : ",\n");
        }
        return out.append("]\n").toString();
    }

    private static String csv(List<AttackCaseResult> results) {
        StringBuilder out = new StringBuilder("experimentId,caseId,requirementId,mutatedField,expectedDecision,actualDecision,externalErrorCode,internalAuditReason,auditEventId,evidencePath,passed\n");
        for (AttackCaseResult r : results) {
            out.append(String.join(",", r.experimentId(), r.attackId(), r.requirementId(), r.mutatedField(),
                    r.expectedDecision(), r.actualDecision(), r.externalErrorCode(), r.internalAuditReason(),
                    r.auditEventId(), r.evidencePath().replace("\\", "/"), Boolean.toString(r.passed()))).append('\n');
        }
        return out.toString();
    }

    private static String markdown(List<AttackCaseResult> results) {
        StringBuilder out = new StringBuilder("# Attack Matrix Results\n\n| Case | Requirement | Mutation | Expected | Actual | Error | Pass |\n| --- | --- | --- | --- | --- | --- | --- |\n");
        for (AttackCaseResult r : results) {
            out.append("| ").append(r.attackId()).append(" | ").append(r.requirementId()).append(" | ")
                    .append(r.mutatedField()).append(" | ").append(r.expectedDecision()).append(" | ")
                    .append(r.actualDecision()).append(" | ").append(r.externalErrorCode()).append(" | ")
                    .append(r.passed() ? "PASS" : "FAIL").append(" |\n");
        }
        return out.toString();
    }
}
