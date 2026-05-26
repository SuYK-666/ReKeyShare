package com.example.pre.experiment.attack;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AttackMatrixRunnerTest {
    @Test
    void emitsJsonCsvMarkdownAndRawEvidenceForAllSecurityCases(@TempDir Path output) throws Exception {
        var results = new AttackMatrixRunner().run(output);
        assertEquals(40, results.size());
        assertTrue(results.stream().allMatch(AttackCaseResult::passed));
        assertTrue(Files.exists(output.resolve("attack-results.json")));
        assertTrue(Files.exists(output.resolve("attack-results.csv")));
        assertTrue(Files.exists(output.resolve("attack-results.md")));
        for (AttackCaseResult result : results) {
            assertTrue(Files.exists(output.resolve("raw").resolve(result.attackId() + ".json")));
        }
    }
}
