import { rekeyshareRequest } from "@/lib/api/openapi-client";
import type { ApiTrace } from "@/lib/api/traces";

export type RunnerMode = "backend" | "mock";

export const demoSteps = [
  "初始化租户与角色",
  "Owner 选择样例文件",
  "客户端侧 AES-GCM 加密并上传密文",
  "创建对象级授权策略",
  "选择受治理代理节点",
  "代理生成策略绑定转换证明",
  "Recipient 获取可验证共享包",
  "Recipient 本地验证并解密",
  "Auditor 校验审计链",
  "Owner 撤销授权并触发轮换",
  "旧共享包访问失败",
  "攻击实验与 CI 证据总结",
];

export const scenarioRequests = [
  { method: "POST", path: "/api/demo/init", request: { tenantId: "tenantA", roles: ["Owner", "Recipient", "Proxy", "Auditor"] } },
  { method: "POST", path: "/api/demo/files/select", request: { fileName: "salary.xlsx", ownerId: "alice" } },
  { method: "POST", path: "/api/data/upload-encrypted", request: { dataId: "data_salary_2026", ciphertext: "b64:8d12...9fa0", aadHash: "sha256:32ca...7d11", manifestHash: "sha256:8cc3...e91a" } },
  { method: "POST", path: "/api/grants", request: { dataId: "data_salary_2026", recipientId: "bob", actions: ["read", "download", "verify"], idempotencyKey: "idem_grant_20260528_001" } },
  { method: "GET", path: "/api/proxies/proxy-east-01", request: { proxyId: "proxy-east-01" } },
  { method: "POST", path: "/api/proxy/transform", request: { grantId: "grant_bob_q2", proxyId: "proxy-east-01", policyHash: "sha256:9a3d...4b19" } },
  { method: "GET", path: "/api/shared-packages/pkg_2026_05_28_001", request: { packageId: "pkg_2026_05_28_001" } },
  { method: "POST", path: "/api/shared-packages/pkg_2026_05_28_001/verify", request: { packageId: "pkg_2026_05_28_001", aadHash: "sha256:32ca...7d11" } },
  { method: "GET", path: "/api/audit/verify", request: { tenantId: "tenantA", checkpoint: "latest" } },
  { method: "POST", path: "/api/grants/grant_bob_q2/revoke", request: { grantId: "grant_bob_q2", reason: "owner revoke" } },
  { method: "GET", path: "/api/shared-packages/pkg_2026_05_28_001", request: { packageId: "pkg_2026_05_28_001", expect: "denied-after-revoke" } },
  { method: "GET", path: "/api/evidence/summary", request: { include: ["attack-matrix", "ci", "audit"] } },
] satisfies Array<{ method: string; path: string; request: Record<string, unknown> }>;

export async function runScenarioStep(index: number, mode: RunnerMode): Promise<ApiTrace> {
  if (mode === "mock") {
    return mockScenarioTrace(index);
  }
  const scenario = scenarioRequests[index];
  const result = await rekeyshareRequest<Record<string, unknown>>(
    scenario.method as "GET" | "POST",
    scenario.path,
    scenario.request,
    {
      tenantId: "tenantA",
      role: "Owner",
      idempotencyKey: typeof scenario.request.idempotencyKey === "string" ? scenario.request.idempotencyKey : `idem_step_${index + 1}`,
    },
  );
  return { ...result.trace, traceId: `trace-step-${index + 1}`, stepId: `step-${index + 1}` };
}

export function mockScenarioTrace(index: number): ApiTrace {
  const scenario = scenarioRequests[index];
  const deniedOldPackage = index === 10;
  return {
    traceId: `trace-step-${index + 1}-mock`,
    stepId: `step-${index + 1}`,
    method: scenario.method,
    path: scenario.path,
    status: deniedOldPackage ? 403 : 200,
    durationMs: 18 + index * 3,
    requestId: `mock_req_${index + 1}`,
    auditEventId: `mock_audit_${index + 1}`,
    source: "mock",
    request: scenario.request,
    response: deniedOldPackage
      ? { externalCode: "ACCESS_DENIED", internalReason: "GRANT_REVOKED", packageId: "pkg_2026_05_28_001" }
      : { ok: true, dataId: "data_salary_2026", grantId: "grant_bob_q2", packageId: "pkg_2026_05_28_001" },
  };
}
