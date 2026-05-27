package com.example.pre.service;

import com.example.pre.model.ProxyNode;
import com.example.pre.model.ProxyNodeStatus;
import com.example.pre.model.AlgorithmType;
import com.example.pre.model.UserRole;
import com.example.pre.storage.AuditRepository;
import com.example.pre.storage.InMemoryProxyNodeRepository;
import com.example.pre.storage.ProxyNodeRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.Set;

public final class ProxyNodeService {
    private final AuditRepository audit;
    private final ProxyNodeRepository nodes;

    public ProxyNodeService(AuditRepository audit) {
        this(audit, new InMemoryProxyNodeRepository());
    }

    public ProxyNodeService(AuditRepository audit, ProxyNodeRepository nodes) {
        this.audit = audit;
        this.nodes = nodes;
    }

    public ProxyNode register(String adminActor, String proxyId, String certificateFingerprint, Set<String> allowedTenantIds) {
        return register(adminActor, proxyId, certificateFingerprint, allowedTenantIds,
                Set.of(AlgorithmType.values()), Long.MAX_VALUE);
    }

    public ProxyNode register(String adminActor, String proxyId, String certificateFingerprint, Set<String> allowedTenantIds,
                              Set<AlgorithmType> allowedSchemeIds, long quota) {
        ProxyNode node = ProxyNode.active(proxyId, certificateFingerprint, allowedTenantIds, allowedSchemeIds, quota);
        nodes.save(node);
        audit.record(new com.example.pre.model.AuditEvent(Instant.now(), adminActor, "PROXY_NODE_REGISTER", proxyId, true, certificateFingerprint));
        return node;
    }

    public ProxyNode revoke(String adminActor, String proxyId) {
        ProxyNode node = nodes.findById(proxyId).orElse(null);
        if (node == null) {
            throw new ReKeyShareException(ErrorCode.INVALID_REQUEST, "proxy node not found");
        }
        ProxyNode revoked = node.revoke();
        nodes.save(revoked);
        audit.record(new com.example.pre.model.AuditEvent(Instant.now(), adminActor, "PROXY_NODE_REVOKE", proxyId, true, "revoked"));
        return revoked;
    }

    public void assertCanProxy(SecurityContext context) {
        assertCanProxy(context, null);
    }

    public synchronized void assertCanProxy(SecurityContext context, AlgorithmType scheme) {
        if (context == null || context.role() != UserRole.PROXY) {
            throw new ReKeyShareException(ErrorCode.ACCESS_DENIED, "proxy role is required");
        }
        ProxyNode node = nodes.findById(context.userId()).orElse(null);
        if (node == null || node.status() != ProxyNodeStatus.ACTIVE) {
            throw new ReKeyShareException(ErrorCode.PROXY_INACTIVE, "proxy node is not active");
        }
        if (!node.allowedTenantIds().contains("*") && !node.allowedTenantIds().contains(context.tenantId())) {
            throw new ReKeyShareException(ErrorCode.ACCESS_DENIED, "proxy node is not allowed for tenant");
        }
        if (scheme != null && !node.allowedSchemeIds().contains(scheme)) {
            throw new ReKeyShareException(ErrorCode.SCHEME_NOT_ALLOWED, "proxy node is not allowed for scheme");
        }
        if (!nodes.consumeUse(context.userId())) {
            throw new ReKeyShareException(ErrorCode.PROXY_QUOTA_EXCEEDED, "proxy node quota exhausted");
        }
    }

    public Collection<ProxyNode> findAll() {
        return nodes.findAll();
    }
}
