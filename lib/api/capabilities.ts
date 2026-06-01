export type CapabilitySource = "backend" | "mock";

export type CapabilitySummary = {
  source: CapabilitySource;
  online: boolean;
  profile: "production" | "secure-local" | "demo";
  backendVersion: string;
  openApi: "available" | "missing";
  routes: Record<string, "available" | "missing" | "demo-only">;
  discoveredPaths: string[];
  message: string;
};

const fallbackCapabilities: CapabilitySummary = {
  source: "mock",
  online: false,
  profile: "secure-local",
  backendVersion: "unavailable",
  openApi: "missing",
  routes: {
    encryptedUpload: "available",
    sharedPackage: "available",
    proofVerify: "available",
    auditVerify: "available",
    proxyGovernance: "available",
    demoDecrypt: "demo-only",
  },
  discoveredPaths: [],
  message: "后端能力端点暂不可用，当前展示本地样例数据。",
};

export async function discoverCapabilities(): Promise<CapabilitySummary> {
  try {
    const [actuator, openApi] = await Promise.all([
      fetchCapabilityJson("/api/rekeyshare/actuator"),
      fetchCapabilityJson("/api/rekeyshare/openapi.json").catch(() => fetchCapabilityJson("/api/rekeyshare/api/openapi")),
    ]);

    if (!actuator && !openApi) {
      return fallbackCapabilities;
    }

    const data = actuator ?? {};
    const paths = extractOpenApiPaths(openApi);
    const profile = normalizeProfile(data.profile);
    return {
      source: "backend",
      online: true,
      profile,
      backendVersion: typeof data.version === "string" ? data.version : "capability endpoint",
      openApi: paths.length ? "available" : "missing",
      routes: {
        encryptedUpload: hasPath(paths, "/api/data/upload-encrypted") ? "available" : "missing",
        sharedPackage: hasPath(paths, "/api/shared-packages/{packageId}") ? "available" : "missing",
        proofVerify: hasPath(paths, "/api/proofs/verify") ? "available" : "missing",
        auditVerify: hasPath(paths, "/api/audit/verify") ? "available" : "missing",
        proxyGovernance: hasAnyPath(paths, ["/api/proxies", "/api/proxy-nodes"]) ? "available" : "missing",
        demoDecrypt: profile === "demo" && hasPath(paths, "/api/demo/shared-packages/{packageId}/decrypt") ? "demo-only" : "missing",
      },
      discoveredPaths: paths.slice(0, 24),
      message: paths.length ? "已连接 ReKeyShare API 并解析 OpenAPI 能力。" : "已连接 ReKeyShare API；OpenAPI 暂不可用，使用运行状态降级判断。",
    };
  } catch {
    return fallbackCapabilities;
  }
}

async function fetchCapabilityJson(path: string) {
  const response = await fetch(path, {
    cache: "no-store",
    headers: { "x-request-id": crypto.randomUUID() },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

function extractOpenApiPaths(openApi: Record<string, unknown> | null) {
  if (!openApi || typeof openApi.paths !== "object" || openApi.paths === null) {
    return [];
  }
  return Object.keys(openApi.paths as Record<string, unknown>);
}

function hasPath(paths: string[], expected: string) {
  return paths.some((path) => path === expected || path.replace(/\{[^}]+\}/g, "{id}") === expected.replace(/\{[^}]+\}/g, "{id}"));
}

function hasAnyPath(paths: string[], expected: string[]) {
  return expected.some((path) => hasPath(paths, path));
}

function normalizeProfile(value: unknown): CapabilitySummary["profile"] {
  return value === "production" || value === "demo" || value === "secure-local" ? value : "secure-local";
}
