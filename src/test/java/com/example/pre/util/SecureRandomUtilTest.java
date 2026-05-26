package com.example.pre.util;

import org.junit.jupiter.api.Test;

import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecureRandomUtilTest {
    @Test
    void generatesBase64UrlIdentifiersWithAtLeast128BitsAndNoSampleCollision() {
        var values = new HashSet<String>();
        for (int i = 0; i < 2_000; i++) {
            String value = SecureRandomUtil.randomId();
            assertTrue(value.matches("[A-Za-z0-9_-]{22}"));
            values.add(value);
        }
        assertEquals(2_000, values.size());
    }
}
