package com.example.pre.experiment.attack;

public record AttackCaseResult(
        String experimentId,
        String attackId,
        String title,
        String requirementId,
        String mutatedField,
        String expectedDecision,
        String actualDecision,
        String externalErrorCode,
        String internalAuditReason,
        String auditEventId,
        String evidencePath,
        boolean passed
) {
}
