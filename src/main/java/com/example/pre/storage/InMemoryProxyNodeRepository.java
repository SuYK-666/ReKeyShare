package com.example.pre.storage;

import com.example.pre.model.ProxyNode;
import com.example.pre.model.ProxyNodeStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemoryProxyNodeRepository implements ProxyNodeRepository {
	private final ConcurrentHashMap<String, ProxyNode> nodes = new ConcurrentHashMap<>();

	@Override
	public void save(ProxyNode node) {
		nodes.put(node.proxyId(), node);
	}

	@Override
	public Optional<ProxyNode> findById(String proxyId) {
		return Optional.ofNullable(nodes.get(proxyId));
	}

	@Override
	public Collection<ProxyNode> findAll() {
		return List.copyOf(nodes.values());
	}

	@Override
	public synchronized boolean consumeUse(String proxyId) {
		ProxyNode node = nodes.get(proxyId);
		if (node == null || node.status() != ProxyNodeStatus.ACTIVE || node.usageCount() >= node.quota()) {
			return false;
		}
		nodes.put(proxyId, node.recordUse());
		return true;
	}
}
