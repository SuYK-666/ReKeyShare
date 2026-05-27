package com.example.pre.storage;

import com.example.pre.model.AuditEvent;

import java.util.List;

public interface AuditRepository {
	void record(AuditEvent event);

	List<AuditEvent> findAll();

	default List<AuditEvent> findByTenant(String tenantId) {
		return findAll().stream().filter(event -> tenantId.equals(event.tenantId())).toList();
	}
}
