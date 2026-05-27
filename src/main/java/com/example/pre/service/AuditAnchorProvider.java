package com.example.pre.service;

import com.example.pre.model.AuditEvent;

import java.util.List;

public interface AuditAnchorProvider {
	AuditProofService.AuditProof anchor(List<AuditEvent> events);
}
