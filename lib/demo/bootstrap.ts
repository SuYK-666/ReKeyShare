import { rekeyshareRequest } from "@/lib/api/openapi-client";
import type { ApiTrace } from "@/lib/api/traces";

export type DemoActorKey = "admin" | "owner" | "recipient" | "proxy";

export type DemoActor = {
  key: DemoActorKey;
  userId: string;
  role: string;
  token: string;
};

export type DemoActors = Record<DemoActorKey, DemoActor>;

const ACTOR_DEFS: Array<{ key: DemoActorKey; userId: string; role: string }> = [
  { key: "admin", userId: "admin", role: "ADMIN" },
  { key: "owner", userId: "alice", role: "OWNER" },
  { key: "recipient", userId: "bob", role: "RECIPIENT" },
  { key: "proxy", userId: "proxy-east-01", role: "PROXY" },
];

let cachedActors: DemoActors | null = null;
let cachedTrace: ApiTrace | null = null;
let inflight: Promise<{ actors: DemoActors; trace: ApiTrace }> | null = null;

export async function getDemoActors(): Promise<{ actors: DemoActors; trace: ApiTrace }> {
  if (cachedActors && cachedTrace) {
    return { actors: cachedActors, trace: cachedTrace };
  }
  if (!inflight) {
    inflight = bootstrapActors();
  }
  const result = await inflight;
  cachedActors = result.actors;
  cachedTrace = result.trace;
  inflight = null;
  return result;
}

export function resetDemoActors() {
  cachedActors = null;
  cachedTrace = null;
  inflight = null;
}

async function bootstrapActors(): Promise<{ actors: DemoActors; trace: ApiTrace }> {
  const startedAt = performance.now();
  const created: Partial<DemoActors> = {};
  let lastTrace: ApiTrace | null = null;
  for (const def of ACTOR_DEFS) {
    const result = await rekeyshareRequest<{ userId: string; role: string; token: string }>(
      "POST",
      "/api/users",
      { userId: def.userId, role: def.role },
      { tenantId: "tenantA", role: def.role },
    );
    created[def.key] = { key: def.key, userId: def.userId, role: def.role, token: result.data.token };
    lastTrace = result.trace;
  }
  const actors = created as DemoActors;
  const trace: ApiTrace = {
    traceId: "trace-step-1",
    stepId: "step-1",
    method: "POST",
    path: "/api/users",
    status: lastTrace?.status ?? 201,
    durationMs: Math.round(performance.now() - startedAt),
    requestId: lastTrace?.requestId ?? "bootstrap",
    auditEventId: "-",
    source: "backend",
    request: { actors: ACTOR_DEFS.map((def) => ({ userId: def.userId, role: def.role })) },
    response: {
      created: Object.fromEntries(
        ACTOR_DEFS.map((def) => [actors[def.key].userId, actors[def.key].role]),
      ),
      tokens: "[masked]",
    },
  };
  return { actors, trace };
}
