package com.example.pre.app;

public enum RuntimeProfile {
	PRODUCTION, SECURE_LOCAL, DEMO;

	public static RuntimeProfile fromProperty() {
		String value = System.getProperty("rekeyshare.profile",
				System.getenv().getOrDefault("REKEYSHARE_PROFILE", "production"));
		if ("demo".equalsIgnoreCase(value)) {
			return DEMO;
		}
		if ("secure-local".equalsIgnoreCase(value) || "secure_local".equalsIgnoreCase(value)) {
			return SECURE_LOCAL;
		}
		return PRODUCTION;
	}

	public boolean demoFeaturesEnabled() {
		return this == DEMO;
	}

	public boolean durableLocalSecurityStores() {
		return this == SECURE_LOCAL;
	}
}
