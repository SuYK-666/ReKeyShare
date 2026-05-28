import type { ApiTrace } from "@/lib/api/traces";

export type ReKeyShareRoute =
  | "/api/data/upload-encrypted"
  | "/api/grants"
  | "/api/proxy/transform"
  | "/api/shared-packages/{packageId}"
  | "/api/shared-packages/{packageId}/verify"
  | "/api/proofs/verify"
  | "/api/audit/verify"
  | "/api/grants/{grantId}/revoke"
  | "/api/evidence/summary";

export type ClientResult<T> = {
  data: T;
  trace: ApiTrace;
};

export type RequestContext = {
  tenantId: string;
  role: string;
  idempotencyKey?: string;
};

export async function rekeyshareRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  route: ReKeyShareRoute | string,
  body: Record<string, unknown>,
  context: RequestContext,
): Promise<ClientResult<T>> {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  const response = await fetch(`/api/rekeyshare${route}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-tenant-id": context.tenantId,
      "x-role": context.role,
      "x-idempotency-key": context.idempotencyKey ?? crypto.randomUUID(),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  const data = parseBody<T>(text);
  const record = typeof data === "object" && data !== null ? data as Record<string, unknown> : { body: String(data) };
  return {
    data,
    trace: {
      traceId: `trace_${requestId}`,
      method,
      path: route,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      requestId: response.headers.get("x-request-id") ?? requestId,
      auditEventId: typeof record.auditEventId === "string" ? record.auditEventId : "-",
      source: "backend",
      request: maskBody(body),
      response: maskBody(record),
    },
  };
}

function parseBody<T>(text: string): T {
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { body: text } as T;
  }
}

function maskBody(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (/token|secret|private|plaintext/i.test(key)) {
        return [key, "[masked]"];
      }
      return [key, item];
    }),
  );
}
