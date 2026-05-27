package com.example.pre.storage;

import com.example.pre.model.EncryptedDataPackage;

import java.util.Collection;
import java.util.Optional;

public interface DataRepository {
	void save(EncryptedDataPackage dataPackage);

	Optional<EncryptedDataPackage> findById(String dataId);

	Collection<EncryptedDataPackage> findAll();

	default Optional<EncryptedDataPackage> findByTenantAndId(String tenantId, String dataId) {
		return findById(dataId).filter(data -> tenantId.equals(data.tenantId()));
	}
}
