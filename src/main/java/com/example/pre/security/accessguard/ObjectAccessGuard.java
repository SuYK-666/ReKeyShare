package com.example.pre.security.accessguard;

import com.example.pre.model.ReEncryptedPackage;
import com.example.pre.model.ShareGrant;
import com.example.pre.service.ObjectAuthorizationService;
import com.example.pre.service.SecurityContext;

public final class ObjectAccessGuard {
	private final ObjectAuthorizationService delegate;

	public ObjectAccessGuard(ObjectAuthorizationService delegate) {
		this.delegate = delegate;
	}

	public void assertCanRead(String actorId, String dataId) {
		delegate.assertCanReadData(actorId, dataId);
	}

	public void assertCanWrite(String actorId, String dataId) {
		delegate.assertCanCreateGrant(actorId, dataId);
	}

	public ShareGrant assertCanTransform(SecurityContext proxy, String grantId) {
		return delegate.assertCanReEncryptGrant(proxy, grantId);
	}

	public ReEncryptedPackage assertCanReadPackage(String actorId, String packageId) {
		return delegate.assertCanDownloadPackage(actorId, packageId);
	}
}
