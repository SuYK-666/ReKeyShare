package com.example.pre.app;

public final class ConfigurationValidator {
    private ConfigurationValidator() {
    }

    public static void validate(RuntimeProfile profile) {
        if (profile == RuntimeProfile.PRODUCTION) {
            rejectEnabled("rekeyshare.production.inMemoryGovernance", "production cannot use in-memory governance");
            rejectEnabled("rekeyshare.production.demoTokenSecret", "production cannot use a demo token secret");
            rejectEnabled("rekeyshare.production.demoPrivateKeys", "production cannot use demo private keys");
        }
    }

    private static void rejectEnabled(String property, String message) {
        if (Boolean.parseBoolean(System.getProperty(property, "false"))) {
            throw new IllegalStateException(message);
        }
    }
}
