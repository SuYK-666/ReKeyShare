package com.example.pre.experiment.attack;

public interface AttackCase {
    String id();

    String title();

    String mutatedField();

    String requirementId();

    String externalErrorCode();

    String internalAuditReason();

    boolean rejected();
}
