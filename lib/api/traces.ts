export type ApiTrace = {
  traceId: string;
  stepId?: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string;
  auditEventId: string;
  source: "backend" | "mock";
  request: Record<string, unknown>;
  response: Record<string, unknown>;
};
