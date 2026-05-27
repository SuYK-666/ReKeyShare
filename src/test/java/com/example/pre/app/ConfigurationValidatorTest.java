package com.example.pre.app;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConfigurationValidatorTest {
    @Test
    void productionRejectsDemoOrMemorySecurityConfiguration() {
        assertRejected("rekeyshare.production.inMemoryGovernance");
        assertRejected("rekeyshare.production.demoTokenSecret");
        assertRejected("rekeyshare.production.demoPrivateKeys");
        assertDoesNotThrow(() -> ConfigurationValidator.validate(RuntimeProfile.SECURE_LOCAL));
    }

    private static void assertRejected(String property) {
        String prior = System.getProperty(property);
        try {
            System.setProperty(property, "true");
            assertThrows(IllegalStateException.class,
                    () -> ConfigurationValidator.validate(RuntimeProfile.PRODUCTION));
        } finally {
            if (prior == null) {
                System.clearProperty(property);
            } else {
                System.setProperty(property, prior);
            }
        }
    }
}
