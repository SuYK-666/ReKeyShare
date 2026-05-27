package com.example.pre.storage;

import com.example.pre.model.ProxyNode;

import java.util.Collection;
import java.util.Optional;

public interface ProxyNodeRepository {
	void save(ProxyNode node);

	Optional<ProxyNode> findById(String proxyId);

	Collection<ProxyNode> findAll();

	boolean consumeUse(String proxyId);
}
