package com.example.pre.storage;

import com.example.pre.model.ShareGrant;

import java.util.Collection;
import java.util.Optional;

public interface GrantRepository {
	void save(ShareGrant grant);

	Optional<ShareGrant> findById(String grantId);

	Collection<ShareGrant> findAll();

	Collection<ShareGrant> findByDataId(String dataId);

	default Optional<ShareGrant> findByTenantAndId(String tenantId, String grantId) {
		return findById(grantId).filter(grant -> tenantId.equals(grant.tenantId()));
	}

	default Collection<ShareGrant> findByTenantAndDataId(String tenantId, String dataId) {
		return findByDataId(dataId).stream().filter(grant -> tenantId.equals(grant.tenantId())).toList();
	}

	default Collection<ShareGrant> findByTenant(String tenantId) {
		return findAll().stream().filter(grant -> tenantId.equals(grant.tenantId())).toList();
	}
}
