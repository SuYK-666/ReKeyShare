import { useState } from "react";

import type { ApiTrace } from "@/lib/api/traces";
import { demoSteps, runScenarioStep, type RunnerMode } from "@/lib/demo/scenario-runner";

export type StepStatus = "idle" | "running" | "success" | "error";

export function useDemoRun(initialTrace: ApiTrace) {
  const [runnerMode, setRunnerMode] = useState<RunnerMode>("backend");
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(demoSteps.map(() => "idle"));
  const [selectedTrace, setSelectedTrace] = useState(initialTrace);
  const completed = stepStatuses.filter((item) => item === "success").length;

  async function runStep(index: number) {
    setStepStatuses((current) => current.map((item, i) => (i === index ? "running" : item)));
    try {
      const trace = await runScenarioStep(index, runnerMode);
      const expectedDenied = index === 10;
      const success = expectedDenied ? trace.status >= 400 : trace.status < 400;
      setStepStatuses((current) => current.map((item, i) => (i === index ? (success ? "success" : "error") : item)));
      setSelectedTrace(trace);
      return trace;
    } catch (error) {
      const failedTrace: ApiTrace = {
        traceId: `trace-step-${index + 1}-network-error`,
        stepId: `step-${index + 1}`,
        method: "GET",
        path: "scenario-runner",
        status: 0,
        durationMs: 0,
        requestId: `local_${index + 1}`,
        auditEventId: "-",
        source: "backend",
        request: { step: index + 1 },
        response: { externalCode: "BACKEND_UNAVAILABLE", message: error instanceof Error ? error.message : "request failed" },
      };
      setStepStatuses((current) => current.map((item, i) => (i === index ? "error" : item)));
      setSelectedTrace(failedTrace);
      return failedTrace;
    }
  }

  async function runAll() {
    for (let index = 0; index < demoSteps.length; index += 1) {
      await runStep(index);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
  }

  return {
    completed,
    demoSteps,
    runnerMode,
    selectedTrace,
    setRunnerMode,
    setSelectedTrace,
    stepStatuses,
    runStep,
    runAll,
  };
}
