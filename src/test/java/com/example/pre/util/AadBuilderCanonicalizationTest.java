package com.example.pre.util;

import com.example.pre.model.AlgorithmType;
import com.example.pre.model.CapsuleContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AadBuilderCanonicalizationTest {
    @Test
    void distinguishesEmptyValueNumericValueAndDelimiterTextWithoutMapOrdering() {
        CapsuleContext complete = context("tenant-a", "grant-a", 1);
        CapsuleContext missingGrantValue = context("tenant-a", "", 1);
        CapsuleContext typeDifferentVersion = context("tenant-a", "grant-a", 10);
        CapsuleContext delimiterValue = context("tenant-a|dataId=data-b", "grant-a", 1);

        String canonical = AadBuilder.buildString(complete);
        assertTrue(canonical.startsWith("8:tenantId=8:tenant-a;"));
        assertNotEquals(canonical, AadBuilder.buildString(missingGrantValue));
        assertNotEquals(canonical, AadBuilder.buildString(typeDifferentVersion));
        assertNotEquals(canonical, AadBuilder.buildString(delimiterValue));
    }

    private static CapsuleContext context(String tenant, String grant, int version) {
        return new CapsuleContext("data-a", "owner", "recipient", AlgorithmType.SECURE_ENVELOPE, "key-a",
                version, "policy-a", tenant, grant, "SECURE_ENVELOPE_V1", "proxy-a", "DOWNLOAD");
    }
}
