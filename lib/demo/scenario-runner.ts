import { rekeyshareRequest } from "@/lib/api/openapi-client";
import type { ApiTrace } from "@/lib/api/traces";
import { getDemoActors, resetDemoActors, type DemoActor } from "@/lib/demo/bootstrap";

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

type RunState = {
  runNonce: string;
  dataId: string;
  grantId: string;
  packageId: string;
  certificateFingerprint: string;
};

function freshRunState(): RunState {
  const runNonce = crypto.randomUUID().slice(0, 8);
  return {
    runNonce,
    dataId: `data_salary_${runNonce}`,
    grantId: "grant_bob_q2",
    packageId: "pkg_2026_05_28_001",
    certificateFingerprint: "cert_fp_proxy_east_01",
  };
}

let runState: RunState = freshRunState();

export function resetScenarioState() {
  runState = freshRunState();
  resetDemoActors();
}

function randomBase64(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function idem(index: number) {
  return `idem_step_${index + 1}_${runState.runNonce}_${crypto.randomUUID().slice(0, 8)}`;
}

async function call(
  index: number,
  method: "GET" | "POST",
  path: string,
  request: Record<string, unknown>,
  actor: DemoActor,
): Promise<ApiTrace> {
  let result = await rekeyshareRequest<Record<string, unknown>>(method, path, request, {
    tenantId: "tenantA",
    role: actor.role,
    idempotencyKey: idem(index),
    token: actor.token,
  });
  if (result.trace.status === 401) {
    resetDemoActors();
    const { actors } = await getDemoActors();
    const refreshedActor = actors[actor.key];
    result = await rekeyshareRequest<Record<string, unknown>>(method, path, request, {
      tenantId: "tenantA",
      role: refreshedActor.role,
      idempotencyKey: idem(index),
      token: refreshedActor.token,
    });
  }
  return { ...result.trace, traceId: `trace-step-${index + 1}`, stepId: `step-${index + 1}` };
}

export async function runScenarioStep(index: number, mode: RunnerMode): Promise<ApiTrace> {
  if (mode === "mock") {
    return mockScenarioTrace(index);
  }

  switch (index) {
    case 0: {
      const { trace } = await getDemoActors();
      return trace;
    }
    case 1:
      return mockScenarioTrace(index);
    case 2: {
      const { actors } = await getDemoActors();
      const trace = await call(
        index,
        "POST",
        "/api/data/upload-encrypted",
        {
          dataId: runState.dataId,
          encryptedContent: randomBase64(48),
          contentNonce: randomBase64(12),
          capsuleHeader: randomBase64(256),
          wrappedKey: randomBase64(32),
          keyNonce: randomBase64(12),
          fileName: "salary.xlsx",
          contentType: "application/octet-stream",
          originalSize: 2048,
        },
        actors.owner,
      );
      const response = trace.response as Record<string, unknown>;
      if (typeof response.dataId === "string") {
        runState.dataId = response.dataId;
      }
      return trace;
    }
    case 3: {
      const { actors } = await getDemoActors();
      const trace = await call(
        index,
        "POST",
        "/api/grants",
        {
          dataId: runState.dataId,
          recipientId: actors.recipient.userId,
          allowedActions: "download,decrypt",
          maxAccessCount: 5,
          expiresInSeconds: 604800,
          purpose: "demo-share",
        },
        actors.owner,
      );
      const response = trace.response as Record<string, unknown>;
      if (typeof response.grantId === "string") {
        runState.grantId = response.grantId;
      }
      return trace;
    }
    case 4: {
      const { actors } = await getDemoActors();
      return call(
        index,
        "POST",
        "/api/proxy-nodes",
        {
          proxyId: actors.proxy.userId,
          certificateFingerprint: runState.certificateFingerprint,
          allowedTenantIds: "*",
          allowedSchemeIds: "RSA_PRE",
          quota: 1000,
        },
        actors.admin,
      );
    }
    case 5: {
      const { actors } = await getDemoActors();
      const trace = await call(
        index,
        "POST",
        "/api/proxy/re-encrypt",
        {
          grantId: runState.grantId,
          certificateFingerprint: runState.certificateFingerprint,
        },
        actors.proxy,
      );
      const response = trace.response as Record<string, unknown>;
      if (typeof response.packageId === "string") {
        runState.packageId = response.packageId;
      }
      return trace;
    }
    case 6: {
      const { actors } = await getDemoActors();
      return call(
        index,
        "GET",
        `/api/shared-packages/${runState.packageId}`,
        { packageId: runState.packageId },
        actors.recipient,
      );
    }
    case 7:
      return mockScenarioTrace(index);
    case 8: {
      const { actors } = await getDemoActors();
      return call(index, "GET", "/api/audit/verify", { tenantId: "tenantA", checkpoint: "latest" }, actors.admin);
    }
    case 9: {
      const { actors } = await getDemoActors();
      return call(
        index,
        "POST",
        `/api/grants/${runState.grantId}/revoke`,
        { grantId: runState.grantId, reason: "owner revoke" },
        actors.owner,
      );
    }
    case 10: {
      const { actors } = await getDemoActors();
      return call(
        index,
        "GET",
        `/api/shared-packages/${runState.packageId}`,
        { packageId: runState.packageId, expect: "denied-after-revoke" },
        actors.recipient,
      );
    }
    case 11: {
      const { actors } = await getDemoActors();
      return call(index, "GET", "/api/benchmark/summary", { include: ["attack-matrix", "ci", "audit"] }, actors.admin);
    }
    default:
      return mockScenarioTrace(index);
  }
}

const mockPaths = [
  "/api/demo/init",
  "/api/demo/files/select",
  "/api/data/upload-encrypted",
  "/api/grants",
  "/api/proxy-nodes",
  "/api/proxy/re-encrypt",
  "/api/shared-packages/pkg_2026_05_28_001",
  "/api/demo/local-verify",
  "/api/audit/verify",
  "/api/grants/grant_bob_q2/revoke",
  "/api/shared-packages/pkg_2026_05_28_001",
  "/api/benchmark/summary",
];

const mockMethods: Array<"GET" | "POST"> = [
  "POST",
  "POST",
  "POST",
  "POST",
  "POST",
  "POST",
  "GET",
  "POST",
  "GET",
  "POST",
  "GET",
  "GET",
];

export function mockScenarioTrace(index: number): ApiTrace {
  const deniedOldPackage = index === 10;
  return {
    traceId: `trace-step-${index + 1}-mock`,
    stepId: `step-${index + 1}`,
    method: mockMethods[index],
    path: mockPaths[index],
    status: deniedOldPackage ? 403 : 200,
    durationMs: 18 + index * 3,
    requestId: `mock_req_${index + 1}`,
    auditEventId: `mock_audit_${index + 1}`,
    source: "mock",
    request: { step: index + 1 },
    response: deniedOldPackage
      ? { externalCode: "ACCESS_DENIED", internalReason: "GRANT_REVOKED", packageId: "pkg_2026_05_28_001" }
      : { ok: true, dataId: "data_salary_2026", grantId: "grant_bob_q2", packageId: "pkg_2026_05_28_001" },
  };
}
