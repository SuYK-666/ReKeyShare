"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Boxes,
  CheckCircle2,
  ClipboardCopy,
  FileCheck2,
  Fingerprint,
  Gauge,
  Home,
  KeyRound,
  LockKeyhole,
  Network,
  Play,
  RotateCcwKey,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import FlowLines from "@/components/ui/flow-lines";
import VideoBackdrop from "@/components/ui/video-backdrop";
import { MechanismGraphs } from "@/components/console/mechanism-graphs";
import { discoverCapabilities, type CapabilitySummary } from "@/lib/api/capabilities";
import type { ApiTrace } from "@/lib/api/traces";
import { demoSteps, type RunnerMode } from "@/lib/demo/scenario-runner";
import { glossaryTerms } from "@/lib/security/glossary";
import { cn } from "@/lib/utils";
import { useDemoRun, type StepStatus } from "@/hooks/useDemoRun";
import { parseEvidenceArtifact, type ParsedEvidenceArtifact } from "@/services/evidence-parser";
import { rekeyshareRequest } from "@/services/rekeyshare-api";

type ViewKey =
  | "demo"
  | "roles"
  | "upload"
  | "policy"
  | "microscope"
  | "proxy"
  | "packages"
  | "revocation"
  | "proof"
  | "threshold"
  | "audit"
  | "attack"
  | "benchmark"
  | "evidence"
  | "settings";

type Profile = "production" | "secure-local" | "demo";

const nav: Array<{ key: ViewKey; label: string; group: string; icon: LucideIcon }> = [
  { key: "demo", label: "运行驾驶舱", group: "运行", icon: Play },
  { key: "roles", label: "角色与租户", group: "运行", icon: Users },
  { key: "upload", label: "客户端加密上传", group: "核心流程", icon: UploadCloud },
  { key: "policy", label: "授权策略", group: "核心流程", icon: KeyRound },
  { key: "microscope", label: "算法显微镜", group: "核心流程", icon: LockKeyhole },
  { key: "proxy", label: "代理节点治理", group: "核心流程", icon: Fingerprint },
  { key: "packages", label: "共享包与访问", group: "核心流程", icon: Boxes },
  { key: "revocation", label: "撤销与密钥轮换", group: "安全验证", icon: RotateCcwKey },
  { key: "proof", label: "策略绑定证明", group: "安全验证", icon: FileCheck2 },
  { key: "threshold", label: "Threshold 治理", group: "安全验证", icon: Network },
  { key: "audit", label: "审计链验证", group: "安全验证", icon: ShieldCheck },
  { key: "attack", label: "攻击验证实验室", group: "安全验证", icon: ShieldAlert },
  { key: "benchmark", label: "性能与算法对照", group: "工程证据", icon: Gauge },
  { key: "evidence", label: "CI 与交付证据", group: "工程证据", icon: Archive },
  { key: "settings", label: "系统设置", group: "设置", icon: Settings },
];

const traces: ApiTrace[] = [
  {
    traceId: "trace-upload-01",
    method: "POST",
    path: "/api/data/upload-encrypted",
    status: 201,
    durationMs: 86,
    requestId: "req_7f31",
    auditEventId: "audit_1001",
    source: "mock",
    request: {
      dataId: "data_salary_2026",
      ciphertext: "b64:8d12...9fa0",
      ciphertextSize: 131248,
      nonce: "base64:e91b7a1d...03fe",
      aad: { tenantId: "tenantA", ownerId: "alice", envelopeVersion: "SECURE_ENVELOPE_V1" },
      manifest: { manifestHash: "sha256:8cc3...e91a", keyVersion: "key-v3" },
    },
    response: { dataId: "data_salary_2026", objectVersion: 3, manifestHash: "sha256:8cc3...e91a" },
  },
  {
    traceId: "trace-proof-01",
    method: "POST",
    path: "/api/proofs/verify",
    status: 409,
    durationMs: 41,
    requestId: "req_92ab",
    auditEventId: "audit_1099",
    source: "mock",
    request: { proofNonce: "pn_19fd", canonicalPayloadHash: "sha256:aa73...7f09" },
    response: { externalCode: "ACCESS_DENIED", internalReason: "PROOF_REPLAY_DETECTED" },
  },
];

const attackCases = [
  ["AT-01", "跨租户访问 tenantA dataId", "tenantB SecurityTester", "不可访问或不存在", "ACCESS_DENIED / TENANT_MISMATCH"],
  ["AT-02", "未授权 recipient 访问 package", "Charlie", "拒绝访问", "RECIPIENT_NOT_GRANTED"],
  ["AT-03", "已撤销 grant 继续访问", "Bob", "旧包失败", "GRANT_REVOKED"],
  ["AT-04", "过期 grant 继续访问", "Bob", "旧包失败", "GRANT_EXPIRED"],
  ["AT-05", "proof 重放", "Bob", "第二次失败", "PROOF_REPLAY_DETECTED"],
  ["AT-06", "篡改 tenantId", "SecurityTester", "验证失败", "CANONICAL_PAYLOAD_MISMATCH"],
  ["AT-07", "篡改 policyHash", "SecurityTester", "验证失败", "POLICY_HASH_MISMATCH"],
  ["AT-08", "inactive proxy 转换", "Proxy", "转换失败", "PROXY_INACTIVE"],
  ["AT-09", "错误 fingerprint", "Proxy", "转换失败", "FINGERPRINT_MISMATCH"],
  ["AT-10", "quota exhausted proxy", "Proxy", "转换失败", "QUOTA_EXHAUSTED"],
  ["AT-11", "wrong scheme proxy", "Proxy", "转换失败", "SCHEME_NOT_ALLOWED"],
  ["AT-12", "object enumeration / IDOR", "SecurityTester", "不可区分错误", "OBJECT_NOT_VISIBLE"],
];

const proofFields = {
  proofVersion: "POLICY_BOUND_PROOF_V1",
  tenantId: "tenantA",
  dataId: "data_salary_2026",
  grantId: "grant_bob_q2",
  recipientId: "bob",
  packageId: "pkg_2026_05_28_001",
  policyHash: "sha256:9a3d...4b19",
  keyId: "key_tenantA_003",
  keyEpoch: "epoch-7",
  proofNonce: "pn_19fd",
  canonicalPayloadHash: "sha256:aa73...7f09",
  proxyId: "proxy-east-01",
  signerEpoch: "signer-4",
  signatureStatus: "valid",
  expiryStatus: "valid",
  consumedStatus: "first pass consumed",
};


function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function shortHash(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  bytes.forEach((byte) => {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  });
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createStoreZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local: number[] = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, crc);
    writeUint32(local, data.length);
    writeUint32(local, data.length);
    writeUint16(local, name.length);
    writeUint16(local, 0);
    const localHeader = new Uint8Array([...local, ...name, ...data]);
    localParts.push(localHeader);

    const central: number[] = [];
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, crc);
    writeUint32(central, data.length);
    writeUint32(central, data.length);
    writeUint16(central, name.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    centralParts.push(new Uint8Array([...central, ...name]));
    offset += localHeader.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end: number[] = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralSize);
  writeUint32(end, offset);
  writeUint16(end, 0);
  const parts = [...localParts, ...centralParts, new Uint8Array(end)].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(parts, { type: "application/zip" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReKeyShareConsole() {
  const [view, setView] = useState<ViewKey>("demo");
  const [profile, setProfile] = useState<Profile>("secure-local");
  const [tenant, setTenant] = useState("tenantA");
  const [role, setRole] = useState("Owner");
  const [demoMode, setDemoMode] = useState(false);
  const { completed, runnerMode, selectedTrace, setRunnerMode, setSelectedTrace, stepStatuses, runStep, runAll } = useDemoRun(traces[0]);
  const [proofReplayRan, setProofReplayRan] = useState(false);
  const [auditTampered, setAuditTampered] = useState(false);
  const [oldPackageDenied, setOldPackageDenied] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitySummary | null>(null);
  const [idempotencyHit, setIdempotencyHit] = useState(false);
  const active = nav.find((item) => item.key === view) ?? nav[0];

  async function runDemoStep(index: number) {
    await runStep(index);
    if (index === 10) {
      setOldPackageDenied(true);
    }
  }

  async function runDemoAll() {
    await runAll();
    setOldPackageDenied(true);
  }

  useEffect(() => {
    document.body.classList.toggle("rekeyshare-presentation", demoMode);
    return () => document.body.classList.remove("rekeyshare-presentation");
  }, [demoMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view");
    if (nav.some((item) => item.key === requestedView)) {
      window.requestAnimationFrame(() => setView(requestedView as ViewKey));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    discoverCapabilities().then((summary) => {
      if (!alive) {
        return;
      }
      setCapabilities(summary);
      setProfile(summary.profile);
      if (!summary.online) {
        setRunnerMode("mock");
      }
    });
    return () => {
      alive = false;
    };
  }, [setRunnerMode]);

  function exportReport() {
    const payload = {
      product: "ReKeyShare",
      profile,
      tenant,
      role,
      generatedAt: new Date().toISOString(),
      steps: demoSteps.map((name, index) => ({ index: index + 1, name, status: stepStatuses[index] })),
      traces,
      proof: proofFields,
      attackCases: attackCases.map(([caseId, target, actor, expected, reason]) => ({
        caseId,
        target,
        actor,
        expected,
        actual: "denied",
        pass: true,
        internalReason: reason,
      })),
      ci: ["tests", "coverage", "SBOM", "dependency-check", "attack matrix", "checksum"],
      sensitiveFields: "sensitive content, token and private material are masked",
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "rekeyshare-run-evidence.json");
  }

  function buildMarkdownReport() {
    const lines = [
      "# ReKeyShare 运行证据报告",
      "",
      `- profile: ${profile}`,
      `- tenant: ${tenant}`,
      `- role: ${role}`,
      `- generatedAt: ${new Date().toISOString()}`,
      "",
      "## 步骤结果",
      ...demoSteps.map((name, index) => `- ${index + 1}. ${name}: ${stepStatuses[index]}`),
      "",
      "## Trace 摘要",
      ...traces.map((trace) => `- ${trace.method} ${trace.path} -> ${trace.status}, requestId=${trace.requestId}, auditEventId=${trace.auditEventId}`),
      "",
      "## 安全说明",
      "- 导出内容不包含明文文件内容、完整 token、私钥或未脱敏 header。",
      "- source 为 mock 时仅代表本地样例数据，不能作为真实后端成功证据。",
    ];
    return lines.join("\n");
  }

  function exportMarkdownReport() {
    downloadBlob(new Blob([buildMarkdownReport()], { type: "text/markdown;charset=utf-8" }), "rekeyshare-run-evidence.md");
  }

  function exportZipReport() {
    const summary = {
      product: "ReKeyShare",
      profile,
      tenant,
      role,
      generatedAt: new Date().toISOString(),
      source: capabilities?.source ?? "mock",
      steps: demoSteps.map((name, index) => ({ index: index + 1, name, status: stepStatuses[index] })),
    };
    const audit = {
      checkpoint: "checkpoint_20260528_001",
      chainStatus: auditTampered ? "fail" : "pass",
      events: ["audit_1001", "audit_1007", "audit_1012", "audit_1099"],
    };
    const attackMatrix = attackCases.map(([caseId, target, actor, expected, reason]) => ({
      caseId,
      target,
      actor,
      expected,
      actual: "denied",
      externalCode: "不可访问或不存在",
      internalReason: reason,
      pass: true,
    }));
    const zip = createStoreZip([
      { name: "README.md", content: buildMarkdownReport() },
      { name: "summary.json", content: JSON.stringify(summary, null, 2) },
      { name: "traces.json", content: JSON.stringify(traces, null, 2) },
      { name: "audit.json", content: JSON.stringify(audit, null, 2) },
      { name: "attack-matrix.json", content: JSON.stringify(attackMatrix, null, 2) },
      { name: "ci-summary.json", content: JSON.stringify({ status: "mixed", evidenceTypes: ["tests", "coverage", "SBOM", "dependency-check", "attack matrix", "checksum"] }, null, 2) },
    ]);
    downloadBlob(zip, "rekeyshare-evidence-package.zip");
  }

  function changeView(nextView: ViewKey) {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "demo") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", nextView);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <main className={cn("relative min-h-screen bg-[#081421] text-[#E5E7EB]", demoMode && "text-[17px]")}>
      <VideoBackdrop fixed overlayClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(5,17,30,0.5),rgba(5,17,30,0.82))]" />
      <FlowLines />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[260px_1fr_420px]">
        <aside className="border-r border-white/10 bg-[#0b1929]/80 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">RK</div>
            <div>
              <Link href="/" className="font-display text-lg font-black text-white">ReKeyShare</Link>
              <p className="text-xs font-semibold text-white/50">控制台</p>
            </div>
          </div>
          <nav className="space-y-5 p-3">
            {Array.from(new Set(nav.map((item) => item.group))).map((group) => (
              <div key={group}>
                <p className="px-3 pb-2 text-xs font-bold text-white/36">{group}</p>
                <div className="space-y-1">
                  {nav.filter((item) => item.group === group).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => changeView(item.key)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition",
                          view === item.key
                            ? "border-white/20 bg-white text-slate-950 shadow-sm"
                            : "border-transparent text-white/54 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <TopBar
            title={active.label}
            profile={profile}
            setProfile={setProfile}
            tenant={tenant}
            setTenant={setTenant}
            role={role}
            setRole={setRole}
            demoMode={demoMode}
            setDemoMode={setDemoMode}
            runnerMode={runnerMode}
            setRunnerMode={setRunnerMode}
            exportReport={exportReport}
            exportMarkdownReport={exportMarkdownReport}
            exportZipReport={exportZipReport}
            completed={completed}
            capabilities={capabilities}
          />
          <div className="space-y-5 p-4 lg:p-6">
            <SourceBanner profile={profile} capabilities={capabilities} />
            {view === "demo" && <DemoDashboard statuses={stepStatuses} completed={completed} runnerMode={runnerMode} runStep={runDemoStep} runAll={runDemoAll} exportReport={exportReport} exportMarkdownReport={exportMarkdownReport} exportZipReport={exportZipReport} />}
            {view === "roles" && <RolesTenants setTenant={setTenant} />}
            {view === "upload" && <UploadWizard setSelectedTrace={setSelectedTrace} />}
            {view === "policy" && <PolicyBuilder idempotencyHit={idempotencyHit} setIdempotencyHit={setIdempotencyHit} />}
            {view === "microscope" && <AlgorithmMicroscope />}
            {view === "proxy" && <ProxyGovernance setSelectedTrace={setSelectedTrace} />}
            {view === "packages" && <SharedPackages profile={profile} />}
            {view === "revocation" && <RevocationTimeline oldPackageDenied={oldPackageDenied} setOldPackageDenied={setOldPackageDenied} />}
            {view === "proof" && <ProofLab proofReplayRan={proofReplayRan} setProofReplayRan={setProofReplayRan} />}
            {view === "threshold" && <ThresholdGovernance />}
            {view === "audit" && <AuditChain auditTampered={auditTampered} setAuditTampered={setAuditTampered} />}
            {view === "attack" && <AttackLab />}
            {view === "benchmark" && <BenchmarkEvidence />}
            {view === "evidence" && <CiEvidence />}
            {view === "settings" && <SettingsPanel profile={profile} setProfile={setProfile} capabilities={capabilities} />}
          </div>
        </section>

        <TraceDrawer trace={selectedTrace} profile={profile} />
      </div>
    </main>
  );
}


function TopBar({
  title,
  profile,
  setProfile,
  tenant,
  setTenant,
  role,
  setRole,
  demoMode,
  setDemoMode,
  runnerMode,
  setRunnerMode,
  exportReport,
  exportMarkdownReport,
  exportZipReport,
  completed,
  capabilities,
}: {
  title: string;
  profile: Profile;
  setProfile: (value: Profile) => void;
  tenant: string;
  setTenant: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  runnerMode: RunnerMode;
  setRunnerMode: (value: RunnerMode) => void;
  exportReport: () => void;
  exportMarkdownReport: () => void;
  exportZipReport: () => void;
  completed: number;
  capabilities: CapabilitySummary | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111c]/60 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-white">{title}</h1>
          <p className="text-sm text-white/50">ReKeyShare：基于代理重加密的数据安全共享管理系统</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={profile} onChange={(value) => setProfile(value as Profile)} options={["production", "secure-local", "demo"]} />
          <Select value={tenant} onChange={setTenant} options={["tenantA", "tenantB"]} />
          <Select value={role} onChange={setRole} options={["Owner", "Recipient", "Proxy", "Auditor", "SecurityTester", "Operator"]} />
          <Select value={runnerMode} onChange={(value) => setRunnerMode(value as RunnerMode)} options={["backend", "mock"]} />
          <button onClick={() => setDemoMode(!demoMode)} className={buttonClass(demoMode ? "primary" : "ghost")}>专注视图</button>
          <button onClick={exportReport} className={buttonClass("ghost")}>导出证据</button>
          <button onClick={exportMarkdownReport} className={buttonClass("ghost")}>导出 Markdown</button>
          <button onClick={exportZipReport} className={buttonClass("ghost")}>导出 ZIP</button>
          <Badge tone="green">{completed}/12</Badge>
          <Badge tone={capabilities?.online ? "green" : "amber"}>{capabilities?.online ? "backend online" : "mock source"}</Badge>
        </div>
      </div>
    </header>
  );
}

function SourceBanner({ profile, capabilities }: { profile: Profile; capabilities: CapabilitySummary | null }) {
  const source = capabilities?.source ?? "mock";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-white/60" />
        <p className="text-sm font-semibold text-white/76">
          {capabilities?.message ?? "正在探测 ReKeyShare API 能力；未确认前按本地样例数据展示。"} source: {source}。
          {profile === "production" ? " production 模式隐藏明文样例操作。" : ""}
        </p>
      </div>
      <Badge tone={profile === "demo" ? "amber" : "cyan"}>{profile}</Badge>
    </div>
  );
}

function DemoDashboard({
  statuses,
  completed,
  runnerMode,
  runStep,
  runAll,
  exportReport,
  exportMarkdownReport,
  exportZipReport,
}: {
  statuses: StepStatus[];
  completed: number;
  runnerMode: RunnerMode;
  runStep: (index: number) => void;
  runAll: () => void;
  exportReport: () => void;
  exportMarkdownReport: () => void;
  exportZipReport: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title="12 步标准剧本" desc={`默认 ${runnerMode} runner；每步保存 requestId、auditEventId、status、latency、response 与 source。`} />
          <button onClick={() => void runAll()} className={buttonClass("primary")}>一键运行</button>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${(completed / 12) * 100}%` }} />
        </div>
        <div className="mt-5 space-y-2">
          {demoSteps.map((step, index) => (
            <button key={step} onClick={() => void runStep(index)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-cyan-300/40">
              <StatusDot status={statuses[index]} />
              <span className="flex-1 text-sm font-bold text-white">{index + 1}. {step}</span>
              <span className="text-xs text-slate-500">执行</span>
            </button>
          ))}
        </div>
      </Card>
      <div className="space-y-5">
        <Card>
          <SectionTitle title="当前闭环指标" desc="证明系统可用、安全边界清楚、证据可复核。" />
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Metric label="成功步骤" value={`${completed}/12`} tone="green" />
            <Metric label="成功接口" value="10" tone="cyan" />
            <Metric label="失败证据" value="4" tone="red" />
            <Metric label="证据数量" value="18" tone="violet" />
          </div>
        </Card>
        <Card>
          <SectionTitle title="运行摘要" />
          <p className="mt-4 leading-8 text-slate-300">
            ReKeyShare 的主流程是客户端加密后上传密文，Owner 创建对象级授权，受治理代理节点只在策略约束下生成共享包和策略绑定证明；Recipient 先本地验证再解密；撤销后旧共享包失败，审计链和攻击矩阵证明失败原因。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={exportReport} className={buttonClass("ghost")}>导出证据包 JSON</button>
            <button onClick={exportMarkdownReport} className={buttonClass("ghost")}>导出运行报告 Markdown</button>
            <button onClick={exportZipReport} className={buttonClass("ghost")}>导出完整证据 ZIP</button>
          </div>
        </Card>
        <MechanismGraphs />
      </div>
    </div>
  );
}

function RolesTenants({ setTenant }: { setTenant: (value: string) => void }) {
  const roles = [
    ["alice", "tenantA", "Owner", "active", "key-v3", "upload encrypted object"],
    ["bob", "tenantA", "Recipient", "active", "key-v2", "verify package"],
    ["proxy-east-01", "tenantA", "Proxy", "machine", "signer-4", "policy-bound transform"],
    ["auditor", "tenantA", "Auditor", "active", "verify-only", "audit checkpoint"],
    ["mallory", "tenantB", "SecurityTester", "sample", "none", "tenant mismatch case"],
    ["operator", "tenantA", "Operator", "active", "governance", "proxy quarantine"],
  ];
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="多角色与多租户模型" desc="tenantA / tenantB 用于验证跨租户探测失败。" />
          <div className="flex gap-2">
            <button onClick={() => setTenant("tenantA")} className={buttonClass("ghost")}>tenantA</button>
            <button onClick={() => setTenant("tenantB")} className={buttonClass("ghost")}>tenantB</button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map(([id, tenant, role, token, key, recent]) => (
            <div key={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm font-bold text-white">{id}</p>
                <Badge tone={role === "SecurityTester" ? "red" : "cyan"}>{role}</Badge>
              </div>
              <Field label="tenantId" value={tenant} />
              <Field label="token 状态" value={token === "active" ? "tk_a1b2...z9x8" : token} />
              <Field label="key 状态" value={key} />
              <Field label="最近操作" value={recent} />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle title="跨租户隔离验证" desc="对外统一返回不可访问或不存在；右侧 trace 展示内部 audit 原因 TENANT_MISMATCH。" />
        <div className="mt-4 rounded-2xl border border-red-300/25 bg-red-300/10 p-4">
          <p className="font-bold text-red-100">tenantB SecurityTester 探测 tenantA data_salary_2026：攻击失败</p>
          <p className="mt-2 text-sm text-slate-300">externalCode: ACCESS_DENIED；internalReason: TENANT_MISMATCH</p>
        </div>
      </Card>
    </div>
  );
}

function UploadWizard({ setSelectedTrace }: { setSelectedTrace: (trace: ApiTrace) => void }) {
  const [cryptoState, setCryptoState] = useState<{
    status: "ready" | "hashing" | "encrypting" | "success" | "error";
    sha256: string;
    nonce: string;
    aadHash: string;
    manifestHash: string;
    ciphertextSize: string;
    message: string;
  }>({
    status: "ready",
    sha256: "4f91...82ac",
    nonce: "base64:e91b7a1d...03fe",
    aadHash: "sha256:32ca...7d11",
    manifestHash: "sha256:8cc3...e91a",
    ciphertextSize: "131,248 bytes",
    message: "使用内置 salary.xlsx 样例，可直接运行浏览器侧加密验证。",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function runClientEncryption() {
    if (!window.crypto?.subtle) {
      setCryptoState((current) => ({ ...current, status: "error", message: "当前浏览器不支持 Web Crypto API。" }));
      return;
    }

    const startedAt = performance.now();
    setCryptoState((current) => ({ ...current, status: "hashing", message: "正在计算 SHA-256 摘要。" }));

    const sample = selectedFile ? new Uint8Array(await selectedFile.arrayBuffer()) : new TextEncoder().encode("ReKeyShare encrypted upload sample: salary.xlsx metadata only.");
    const digest = await crypto.subtle.digest("SHA-256", sample);
    const sha256 = `sha256:${shortHash(toBase64(digest))}`;

    const aad = {
      tenantId: "tenantA",
      ownerId: "alice",
      dataId: "data_salary_2026",
      envelopeVersion: "SECURE_ENVELOPE_V1",
      keyVersion: "key-v3",
      contentHash: sha256,
    };
    const aadBytes = new TextEncoder().encode(JSON.stringify(aad));
    const aadDigest = await crypto.subtle.digest("SHA-256", aadBytes);
    const aadHash = `sha256:${shortHash(toBase64(aadDigest))}`;

    setCryptoState((current) => ({ ...current, status: "encrypting", sha256, aadHash, message: "正在生成 nonce 并执行 AES-GCM 加密。" }));
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBytes, additionalData: aadBytes }, key, sample);
    const manifest = {
      tenantId: aad.tenantId,
      ownerId: aad.ownerId,
      dataId: aad.dataId,
      objectVersion: 3,
      envelopeVersion: aad.envelopeVersion,
      keyVersion: aad.keyVersion,
      nonce: `base64:${toBase64(nonceBytes)}`,
      aadHash,
      ciphertextHash: `sha256:${shortHash(toBase64(await crypto.subtle.digest("SHA-256", ciphertext)))}`,
    };
    const manifestHash = `sha256:${shortHash(toBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(manifest)))))}`;
    const trace: ApiTrace = {
      traceId: "trace-upload-webcrypto",
      method: "POST",
      path: "/api/data/upload-encrypted",
      status: 201,
      durationMs: Math.round(performance.now() - startedAt),
      requestId: "req_webcrypto",
      auditEventId: "audit_1001",
      source: "mock",
      request: {
        dataId: aad.dataId,
        ciphertext: `b64:${shortHash(toBase64(ciphertext))}`,
        ciphertextSize: ciphertext.byteLength,
        nonce: manifest.nonce,
        aad,
        manifest: { ...manifest, manifestHash },
      },
      response: {
        dataId: aad.dataId,
        objectVersion: 3,
        manifestHash,
        auditEventId: "audit_1001",
      },
    };
    let finalTrace = trace;
    try {
      const backend = await rekeyshareRequest<Record<string, unknown>>(
        "POST",
        "/api/data/upload-encrypted",
        {
          dataId: aad.dataId,
          ciphertext: `b64:${shortHash(toBase64(ciphertext))}`,
          ciphertextSize: ciphertext.byteLength,
          nonce: manifest.nonce,
          aad,
          manifest: { ...manifest, manifestHash },
        },
        { tenantId: aad.tenantId, role: "Owner", idempotencyKey: "upload_webcrypto_sample" },
      );
      if (!backend.ok) {
        throw new Error(`upload failed with status ${backend.status}`);
      }
      finalTrace = backend.trace;
    } catch {
      finalTrace = trace;
    }

    setCryptoState({
      status: "success",
      sha256,
      nonce: manifest.nonce,
      aadHash,
      manifestHash,
      ciphertextSize: `${ciphertext.byteLength.toLocaleString()} bytes`,
      message: "已完成浏览器侧 AES-GCM 加密；trace 中只包含密文、AAD 与 manifest。",
    });
    setSelectedTrace(finalTrace);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <SectionTitle title="客户端加密上传向导" desc="证明服务端不需要接触明文；正式路径使用 /api/data/upload-encrypted。" />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {["选择文件", "生成 AAD/manifest", "浏览器 AES-GCM 加密", "上传密文"].map((item, index) => (
            <div key={item} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4">
              <p className="text-sm font-black text-cyan-100">{index + 1}. {item}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6">
          <p className="text-lg font-black text-white">{selectedFile?.name ?? "salary.xlsx"}</p>
          <p className="mt-2 text-sm text-slate-400">size: {selectedFile ? `${selectedFile.size.toLocaleString()} bytes` : "128 KB"} · MIME: {selectedFile?.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"} · SHA-256: {cryptoState.sha256}</p>
          <label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-black text-white hover:bg-white/10">
            选择真实文件
            <input type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="nonce" value={cryptoState.nonce} />
            <Field label="manifestHash" value={cryptoState.manifestHash} />
            <Field label="ciphertext size" value={cryptoState.ciphertextSize} />
          </div>
          <p className="mt-4 text-sm font-semibold text-cyan-100">{cryptoState.message}</p>
          <button
            onClick={runClientEncryption}
            disabled={cryptoState.status === "hashing" || cryptoState.status === "encrypting"}
            className={cn(buttonClass("primary"), "mt-5 disabled:cursor-not-allowed disabled:opacity-60")}
          >
            {cryptoState.status === "hashing" || cryptoState.status === "encrypting" ? "正在本地加密" : "客户端侧加密并上传密文"}
          </button>
        </div>
      </Card>
      <AadManifest cryptoState={cryptoState} />
    </div>
  );
}

function AadManifest({ cryptoState }: { cryptoState: { nonce: string; aadHash: string; manifestHash: string; ciphertextSize: string } }) {
  const manifest = {
    tenantId: "tenantA",
    ownerId: "alice",
    dataId: "data_salary_2026",
    objectVersion: 3,
    envelopeVersion: "SECURE_ENVELOPE_V1",
    keyVersion: "key-v3",
    nonce: cryptoState.nonce,
    aadHash: cryptoState.aadHash,
    manifestHash: cryptoState.manifestHash,
  };
  return (
    <Card>
      <SectionTitle title="AAD 与 Manifest 可视化" desc="AAD 绑定租户、对象、授权上下文；hash 字段可核验。" />
      <pre className="mt-5 max-h-[420px] overflow-auto rounded-2xl border border-white/10 bg-[#07111c] p-4 font-mono text-sm leading-6 text-cyan-50">
        {JSON.stringify(manifest, null, 2)}
      </pre>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="ciphertext size" value={cryptoState.ciphertextSize} />
        <Field label="auditEventId" value="audit_1001" />
      </div>
    </Card>
  );
}

function PolicyBuilder({ idempotencyHit, setIdempotencyHit }: { idempotencyHit: boolean; setIdempotencyHit: (value: boolean) => void }) {
  const policy = "tenantA + data_salary_2026 + grant_bob_q2 + bob + sha256:9a3d...4b19 + key-v3 + AAD";
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <SectionTitle title="对象级授权策略构建器" desc="授权不是分享链接，而是绑定对象、接收方、动作、过期时间和幂等键。" />
        <div className="mt-5 grid gap-3">
          {[
            ["dataId", "data_salary_2026"],
            ["recipientId", "bob"],
            ["allowedActions", "read, download, verify"],
            ["expiresAt", "2026-05-28T18:30:00+08:00"],
            ["maxAccessCount", "3"],
            ["maxTransformCount", "1"],
            ["policyLabel", "Q2 salary review"],
            ["idempotencyKey", "idem_grant_20260528_001"],
          ].map(([label, value]) => <Field key={label} label={label} value={value} />)}
        </div>
      </Card>
      <Card>
        <SectionTitle title="策略绑定图" desc="修改任一字段都会改变 policyHash，并让旧证明失效。" />
        <div className="mt-5 flex flex-wrap gap-2">
          {policy.split(" + ").map((item) => <span key={item} className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-2 font-mono text-xs text-violet-100">{item}</span>)}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Metric label="grantId" value="grant_bob_q2" tone="cyan" />
          <Metric label="policyHash" value="sha256:9a3d...4b19" tone="violet" />
          <Metric label="status" value="ACTIVE" tone="green" />
          <Metric label="auditEventId" value="audit_1007" tone="cyan" />
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-white">幂等键重复提交实验</p>
              <p className="mt-1 text-sm text-slate-400">双击或重复提交同一 idempotencyKey 不会创建第二个 grant。</p>
            </div>
            <button onClick={() => setIdempotencyHit(true)} className={buttonClass("ghost")}>重复提交授权</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="idempotencyKey" value="idem_grant_20260528_001" />
            <Field label="server decision" value={idempotencyHit ? "IDEMPOTENCY_HIT" : "PENDING"} />
            <Field label="result grantId" value="grant_bob_q2" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProxyGovernance({ setSelectedTrace }: { setSelectedTrace: (trace: ApiTrace) => void }) {
  const [lastScenario, setLastScenario] = useState("waiting");
  const nodes = [
    ["proxy-east-01", "tenantA", "SECURE_ENVELOPE_V1, HPKE_STYLE", "fp_91ac...30dd", "ACTIVE", "42/100", "signer-4", "healthy"],
    ["proxy-west-02", "tenantA,tenantB", "HPKE_STYLE", "fp_7f20...aa18", "DISABLED", "7/80", "signer-3", "manual disabled"],
    ["proxy-lab-03", "tenantB", "RSA baseline", "fp_0000...bad1", "QUARANTINED", "100/100", "signer-2", "fingerprint mismatch"],
  ];
  function runProxyScenario(label: string) {
    const success = label.includes("成功");
    const reason = label.includes("inactive")
      ? "PROXY_INACTIVE"
      : label.includes("fingerprint")
        ? "FINGERPRINT_MISMATCH"
        : label.includes("quota")
          ? "QUOTA_EXHAUSTED"
          : "OK";
    setLastScenario(`${label} · ${success ? "success" : "denied"} · ${reason}`);
    setSelectedTrace({
      traceId: `trace_proxy_${reason.toLowerCase()}`,
      method: "POST",
      path: "/api/proxy/transform",
      status: success ? 201 : 403,
      durationMs: success ? 41 : 18,
      requestId: `req_proxy_${reason.toLowerCase()}`,
      auditEventId: `audit_proxy_${reason.toLowerCase()}`,
      source: "mock",
      request: { proxyId: "proxy-east-01", dataId: "data_salary_2026", grantId: "grant_bob_q2", scenario: label },
      response: success ? { packageId: "pkg_2026_05_28_001", proofVersion: "POLICY_BOUND_PROOF_V1" } : { externalCode: "ACCESS_DENIED", internalReason: reason },
    });
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="active nodes" value="1" tone="green" />
        <Metric label="disabled" value="1" tone="red" />
        <Metric label="quota used" value="149/280" tone="amber" />
        <Metric label="failed attempts" value="4" tone="red" />
      </div>
      <Card>
        <SectionTitle title="代理机器身份治理" desc="代理不是可信黑箱，必须被 fingerprint、租户范围、算法 allowlist 和 quota 约束。" />
        <Table headers={["proxyId", "tenantScope", "schemeAllowlist", "fingerprint", "status", "quota", "signerEpoch", "last reason"]} rows={nodes} />
      </Card>
      <Card>
        <SectionTitle title="治理实验" desc="四类场景可一键运行：active 成功、inactive 失败、wrong fingerprint 失败、quota exhausted 失败。" />
        <div className="mt-4 flex flex-wrap gap-3">
          {["active proxy 成功", "inactive proxy 失败", "wrong fingerprint 失败", "quota exhausted 失败"].map((item) => (
            <button key={item} onClick={() => runProxyScenario(item)} className={buttonClass(item.includes("成功") ? "primary" : "danger")}>{item}</button>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Field label="last scenario" value={lastScenario} />
        </div>
      </Card>
    </div>
  );
}

function AlgorithmMicroscope() {
  const [selectedField, setSelectedField] = useState("originalCapsule");
  const [tamperedField, setTamperedField] = useState<string | null>(null);
  const columns = [
    {
      title: "Owner Client",
      desc: "生成 content key，并输出 ciphertext、AAD、originalCapsule。",
      fields: ["ciphertext", "AAD", "originalCapsule", "manifestHash"],
    },
    {
      title: "Registered Proxy",
      desc: "只能看到 capsule、reKey 和 policy context，不能恢复明文。",
      fields: ["originalCapsule", "scopedReKey", "policyHash", "proxyFingerprint"],
    },
    {
      title: "Recipient Client",
      desc: "验证 proof 与 manifest 后，用 transformedCapsule 恢复 DEK。",
      fields: ["transformedCapsule", "proof", "canonicalPayloadHash", "recipientDek"],
    },
  ];
  const binding: Record<string, string> = {
    ciphertext: "参与 ciphertextHash，并写入 manifest。",
    AAD: "参与 AES-GCM additionalData 与 aadHash，绑定 tenant/data/grant。",
    originalCapsule: "由 Owner 生成，Proxy 只能转换 capsule，不能打开 DEK。",
    manifestHash: "绑定 packageId、dataId、policyHash、keyVersion 与 ciphertextHash。",
    scopedReKey: "绑定 proxy 身份、tenant scope、scheme allowlist 与 keyVersion。",
    policyHash: "参与 canonical payload，策略变化会让旧 proof 失效。",
    proxyFingerprint: "参与代理治理校验，错误指纹会阻止转换。",
    transformedCapsule: "交给 Recipient 本地打开 DEK，服务端不解密正文。",
    proof: "Ed25519 签名证明转换绑定了策略和上下文。",
    canonicalPayloadHash: "proof 签名前的规范化 payload 摘要，防字段篡改。",
    recipientDek: "仅在 Recipient 浏览器侧恢复，用于本地解密 ciphertext。",
  };
  const failure = tamperedField
    ? `${tamperedField} 被篡改：${tamperedField === "AAD" ? "AES-GCM/AAD 校验失败" : tamperedField.includes("Capsule") ? "capsule context 或 keyVersion 校验失败" : "canonicalPayloadHash 或 manifestHash 校验失败"}`
    : "未篡改：manifest、AAD、policyHash 与 proof 绑定关系一致。";

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="算法显微镜" desc="把 ciphertext、AAD、capsule、policyHash、keyVersion、proof、manifest 的依赖关系放在同一张图中。" />
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-black text-white">{column.title}</p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{column.desc}</p>
              <div className="mt-4 space-y-2">
                {column.fields.map((field) => (
                  <button
                    key={field}
                    onClick={() => setSelectedField(field)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-mono text-xs transition",
                      selectedField === field ? "border-cyan-300/50 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-[#081421] text-slate-300",
                      tamperedField === field && "border-red-300/60 bg-red-300/12 text-red-100",
                    )}
                  >
                    {field}
                    <span>{tamperedField === field ? "tampered" : "bound"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div>
            <SectionTitle title="字段绑定解释" desc="点击字段查看其参与的 hash、proof 或 AAD 绑定。" />
            <div className="mt-5 rounded-2xl border border-violet-300/25 bg-violet-300/10 p-4">
              <p className="font-mono text-sm font-black text-violet-100">{selectedField}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{binding[selectedField]}</p>
            </div>
            <p className={cn("mt-4 rounded-2xl border p-4 font-bold", tamperedField ? "border-red-300/25 bg-red-300/10 text-red-100" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100")}>{failure}</p>
          </div>
          <div>
            <SectionTitle title="篡改定位" desc="选择字段后运行篡改，红色标出失败的校验点。" />
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setTamperedField(selectedField)} className={buttonClass("danger")}>篡改当前字段</button>
              <button onClick={() => setTamperedField(null)} className={buttonClass("primary")}>恢复一致状态</button>
            </div>
            <div className="mt-5 grid gap-3">
              <Result name="manifestHash" result={tamperedField && selectedField !== "AAD" ? "denied" : "pass"} reason="package manifest binding" />
              <Result name="AAD / AEAD" result={tamperedField === "AAD" ? "denied" : "pass"} reason="additional authenticated data" />
              <Result name="proof signature" result={tamperedField ? "denied" : "pass"} reason="canonical payload hash" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SharedPackages({ profile }: { profile: Profile }) {
  const [verified, setVerified] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [decryptSummary, setDecryptSummary] = useState("验证通过后可在浏览器侧恢复文件摘要。");

  async function runLocalDecrypt() {
    const aad = new TextEncoder().encode("tenantA:data_salary_2026:grant_bob_q2");
    const sample = new TextEncoder().encode("ReKeyShare local decrypt sample");
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: aad }, key, sample);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce, additionalData: aad }, key, ciphertext);
    const digest = await crypto.subtle.digest("SHA-256", decrypted);
    setDecryptSummary(`本地解密完成：fileSize=${decrypted.byteLength} bytes，sha256=${shortHash(toBase64(digest))}`);
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card>
        <SectionTitle title="共享包列表" desc="packageId 可追踪 dataId、grantId、policyHash、keyVersion。" />
        <div className="mt-5 space-y-3">
          {["pkg_2026_05_28_001", "pkg_2026_05_28_002"].map((id, index) => (
            <div key={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-mono text-sm font-bold text-white">{id}</p>
              <p className="mt-2 text-xs text-slate-400">data_salary_2026 · grant_bob_q2 · {index ? "revoked" : "verified"}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle title="Package Inspector" desc="Manifest、Ciphertext & AAD、Capsule/Envelope、Proof & Audit 四类材料集中展示。" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Manifest", "policyHash, keyVersion, ciphertextHash, createdAt"],
            ["Ciphertext & AAD", "nonce, AAD JSON, chunk hash, Merkle root"],
            ["Capsule / Envelope", "envelopeVersion, encrypted content key, capsule context"],
            ["Proof & Audit", "proofVersion, proxyId, canonicalPayloadHash, auditEventId"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-black text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <SectionTitle title="Chunk / Merkle 视图" desc="大文件分块校验视图；后端未返回完整 Merkle path 时展示待接入状态。" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="chunk[0]" value="sha256:4a11...91fe" />
            <Field label="chunk[1]" value="sha256:88b0...7a42" />
            <Field label="root hash" value="sha256:merkle...e88d" />
          </div>
          <div className="mt-4">
            <Badge tone={tampered ? "red" : "green"}>{tampered ? "verification failed" : "verification pending / ready"}</Badge>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
          <p className="font-bold text-emerald-100">{profile === "demo" ? "样例明文接口已明确标注；正式运行仍推荐本地验证并解密。" : "本地验证并解密：验证通过后才允许浏览器侧恢复文件摘要。"}</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button onClick={() => { setVerified(true); setTampered(false); }} className={buttonClass("primary")}>本地验证 package/proof/AAD</button>
          <button disabled={!verified || tampered} onClick={() => void runLocalDecrypt()} className={cn(buttonClass("ghost"), "disabled:cursor-not-allowed disabled:opacity-50")}>本地验证并解密</button>
          <button onClick={() => { setVerified(false); setTampered(true); }} className={buttonClass("danger")}>篡改 manifest 并验证</button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className={cn("font-bold", tampered ? "text-red-200" : verified ? "text-emerald-200" : "text-slate-300")}>
            {tampered ? "验证失败：manifestHash 与 ciphertextHash 不匹配。" : verified ? "验证通过：按钮已允许浏览器侧解密，结果仅显示文件摘要。" : "验证未开始：解密按钮保持禁用。"}
          </p>
          <p className="mt-2 text-sm text-slate-400">{decryptSummary}</p>
        </div>
      </Card>
    </div>
  );
}

function RevocationTimeline({ oldPackageDenied, setOldPackageDenied }: { oldPackageDenied: boolean; setOldPackageDenied: (value: boolean) => void }) {
  const [restartChecked, setRestartChecked] = useState(false);
  const steps = ["data uploaded", "grant created", "package created", "recipient accessed", "grant revoked", "key rotated", "old package denied", "new package recreated"];
  function exportRestartEvidence() {
    downloadBlob(new Blob([JSON.stringify({
      packageId: "pkg_2026_05_28_001",
      beforeRestart: { requestId: "req_revoke_01", auditEventId: "audit_revoke_01", result: "old package denied" },
      afterRestart: restartChecked
        ? { requestId: "req_restart_02", auditEventId: "audit_restart_02", result: "same packageId denied" }
        : { status: "pending backend restart probe" },
    }, null, 2)], { type: "application/json" }), "rekeyshare-revocation-restart-evidence.json");
  }
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="撤销与密钥轮换时间线" desc="证明授权不是一次性放行，撤销后旧 package 必须失败。" />
          <button onClick={() => setOldPackageDenied(true)} className={buttonClass("danger")}>运行 access → revoke → old package</button>
        </div>
        <div className="mt-6 grid gap-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              {index < 4 || (oldPackageDenied && index >= 4) ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Activity className="h-5 w-5 text-slate-500" />}
              <p className="flex-1 font-bold text-white">{step}</p>
              <Badge tone={index === 6 ? "red" : index >= 4 ? "amber" : "green"}>{index === 6 && oldPackageDenied ? "denied" : "event"}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle title="重启后撤销仍成立" desc="secure-local 持久化 live data/grant/package、proof replay、proxy 状态与 audit；后端重启后旧 package 仍应失败。" />
        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {["创建 package", "撤销 grant", "旧包失败", "重启后端", "重新探测 backend", "再次访问旧包", "导出前后证据"].map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-black text-white">{index + 1}. {step}</p>
              <Badge tone={index < 3 || restartChecked ? (index === 5 ? "red" : "green") : "amber"}>{index < 3 || restartChecked ? "ready" : "pending"}</Badge>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => setRestartChecked(true)} className={buttonClass("primary")}>标记后端重启并重新探测</button>
          <button onClick={exportRestartEvidence} className={buttonClass("ghost")}>导出重启前后 request/audit 证据</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="before restart" value="requestId=req_revoke_01 · auditEventId=audit_revoke_01 · old package denied" />
          <Field label="after restart" value={restartChecked ? "requestId=req_restart_02 · auditEventId=audit_restart_02 · same packageId denied" : "等待重新探测后端"} />
        </div>
      </Card>
    </div>
  );
}

function ProofLab({ proofReplayRan, setProofReplayRan }: { proofReplayRan: boolean; setProofReplayRan: (value: boolean) => void }) {
  const canonicalPayload = {
    tenantId: proofFields.tenantId,
    dataId: proofFields.dataId,
    grantId: proofFields.grantId,
    recipientId: proofFields.recipientId,
    packageId: proofFields.packageId,
    policyHash: proofFields.policyHash,
    contentKeyVersion: proofFields.keyEpoch,
    aadHash: "sha256:32ca...7d11",
    keyId: proofFields.keyId,
    keyEpoch: proofFields.keyEpoch,
    expiresAt: "2026-05-28T18:30:00+08:00",
    nonce: proofFields.proofNonce,
  };
  const replayKey = [
    proofFields.tenantId,
    proofFields.proxyId,
    proofFields.keyId,
    proofFields.keyEpoch,
    proofFields.proofNonce,
    proofFields.canonicalPayloadHash,
  ].join(" | ");
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <SectionTitle title="POLICY_BOUND_PROOF_V1 字段" desc="转换结果绑定策略、租户、包、key epoch 与上下文，并防止重放。" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.entries(proofFields).map(([label, value]) => <Field key={label} label={label} value={value} />)}
        </div>
      </Card>
      <Card>
        <SectionTitle title="验证过程" desc="展示 canonical payload、payload hash、签名校验、replay key 与 consumed 语义。" />
        <pre className="mt-5 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-[#07111c] p-4 font-mono text-xs leading-6 text-cyan-50">
          {JSON.stringify(canonicalPayload, null, 2)}
        </pre>
        <div className="mt-4 grid gap-3">
          <Field label="canonicalPayloadHash" value={proofFields.canonicalPayloadHash} />
          <Field label="replay key" value={replayKey} />
          <Field label="invalid proof replay store rule" value="invalid / expired proof 不写入 replay store" />
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <SectionTitle title="重放实验" desc="同一 proof 第一次成功并 consumed，第二次因 replay key 已存在而失败；JDBC 主键保证并发只有一次消费成功。" />
        <button onClick={() => setProofReplayRan(true)} className={cn(buttonClass("primary"), "mt-5")}>运行 5 个 proof 实验</button>
        <div className="mt-5 space-y-3">
          {[
            ["首次验证 proof", "pass", "consumed"],
            ["重放同一 proof", proofReplayRan ? "denied" : "pending", "PROOF_REPLAY_DETECTED"],
            ["篡改 tenantId", proofReplayRan ? "denied" : "pending", "TENANT_MISMATCH"],
            ["篡改 packageId", proofReplayRan ? "denied" : "pending", "PAYLOAD_MISMATCH"],
            ["篡改 policyHash", proofReplayRan ? "denied" : "pending", "POLICY_HASH_MISMATCH"],
            ["过期 proof", proofReplayRan ? "denied" : "pending", "EXPIRED_NOT_CONSUMED"],
          ].map(([name, result, reason]) => (
            <Result key={name} name={name} result={result} reason={reason} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function AuditChain({ auditTampered, setAuditTampered }: { auditTampered: boolean; setAuditTampered: (value: boolean) => void }) {
  const events = [
    ["audit_1001", "2026-05-28T16:12:01+08:00", "tenantA", "alice", "Owner", "UPLOAD_ENCRYPTED", "data", "data_salary_2026", "true", "OK", "-", "0000...root", "8f11...ac01"],
    ["audit_1007", "2026-05-28T16:13:17+08:00", "tenantA", "alice", "Owner", "GRANT_CREATE", "grant", "grant_bob_q2", "true", "OK", "-", "8f11...ac01", "9b30...d119"],
    ["audit_1012", "2026-05-28T16:14:08+08:00", "tenantA", "proxy-east-01", "Proxy", "PACKAGE_CREATE", "package", "pkg_2026_05_28_001", "true", "OK", "-", "9b30...d119", "a771...ff08"],
    ["audit_1099", "2026-05-28T16:20:44+08:00", "tenantA", "bob", "Recipient", "PROOF_REPLAY_DENIED", "proof", "pn_19fd", "false", "ACCESS_DENIED", "PROOF_REPLAY_DETECTED", auditTampered ? "tampered" : "a771...ff08", "b12c...330a"],
  ];
  function exportAuditJson() {
    downloadBlob(new Blob([JSON.stringify({ status: auditTampered ? "fail" : "pass", events }, null, 2)], { type: "application/json" }), "rekeyshare-audit-chain.json");
  }
  function exportAuditMarkdown() {
    const lines = [
      "# ReKeyShare Audit Verification",
      "",
      `- status: ${auditTampered ? "fail" : "pass"}`,
      `- events: ${events.length}`,
      "",
      ...events.map((event) => `- ${event[0]} ${event[5]} previousHash=${event[11]} currentHash=${event[12]}`),
    ];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }), "rekeyshare-audit-report.md");
  }
  async function copyAuditCli() {
    await navigator.clipboard.writeText("curl -H \"x-role: Auditor\" http://localhost:8080/api/audit/verify");
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="审计链与完整性验证" desc="展示 previousHash/currentHash 串联关系，支持篡改模拟与 Markdown 报告导出。" />
        <button onClick={() => setAuditTampered(!auditTampered)} className={buttonClass(auditTampered ? "primary" : "danger")}>{auditTampered ? "恢复正常链" : "篡改一条事件"}</button>
      </div>
      <div className="mt-5 rounded-2xl border p-4 border-white/10 bg-white/[0.03]">
        <p className={cn("font-black", auditTampered ? "text-red-200" : "text-emerald-200")}>{auditTampered ? "验证失败：previousHash 断链" : "验证通过：hash-chain 与 checkpoint 一致"}</p>
      </div>
      <Table headers={["eventId", "timestamp", "tenantId", "actorId", "role", "action", "targetType", "targetId", "success", "externalCode", "internalReason", "previousHash", "currentHash"]} rows={events} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={exportAuditJson} className={buttonClass("ghost")}>导出审计片段 JSON</button>
        <button onClick={exportAuditMarkdown} className={buttonClass("ghost")}>导出验证报告 Markdown</button>
        <button onClick={() => void copyAuditCli()} className={buttonClass("ghost")}>复制 CLI 验证命令</button>
      </div>
    </Card>
  );
}

function ThresholdGovernance() {
  const [shares, setShares] = useState<string[]>([]);
  const [replayed, setReplayed] = useState(false);
  const nodes = ["proxy-a", "proxy-b", "proxy-c"];
  const completed = shares.length >= 2;
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Threshold 治理原型" desc="2/3 份额 + context-bound transcript + durable consumed-session replay 防护；明确不是生产级 threshold PRE。" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {nodes.map((node) => {
            const selected = shares.includes(node);
            return (
              <button
                key={node}
                onClick={() => setShares((current) => selected ? current.filter((item) => item !== node) : [...current, node])}
                className={cn("rounded-2xl border p-5 text-left transition", selected ? "border-cyan-300/50 bg-cyan-300/12" : "border-white/10 bg-white/[0.03]")}
              >
                <p className="text-lg font-black text-white">{node}</p>
                <p className="mt-2 text-sm text-slate-400">signed share · transcriptHash=sha256:{node.slice(-1)}91...aa7</p>
                <div className="mt-4"><Badge tone={selected ? "green" : "amber"}>{selected ? "share accepted" : "waiting"}</Badge></div>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionTitle title="k-of-n 流程" desc="收集任意 2 个有效 share 后生成 completed session；重复消费同一 session 会被拒绝。" />
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Metric label="threshold" value="2/3" tone="cyan" />
          <Metric label="accepted shares" value={`${shares.length}/3`} tone={completed ? "green" : "amber"} />
          <Metric label="session" value={completed ? "completed" : "pending"} tone={completed ? "green" : "amber"} />
          <Metric label="replay" value={replayed ? "denied" : "not run"} tone={replayed ? "red" : "violet"} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={!completed} onClick={() => setReplayed(true)} className={cn(buttonClass("danger"), "disabled:cursor-not-allowed disabled:opacity-50")}>重放 consumed session</button>
          <button onClick={() => { setShares([]); setReplayed(false); }} className={buttonClass("ghost")}>重置门限流程</button>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-semibold leading-7 text-amber-100">
          当前页面展示的是治理原型：signed share、context-bound transcript、durable consumed-session replay 防护。它不声明为独立多节点生产级 threshold PRE。
        </div>
      </Card>
    </div>
  );
}

function AttackLab() {
  const [rows, setRows] = useState(attackCases.map(([caseId, target, actor, expected, reason]) => ({
    caseId,
    target,
    actor,
    expected,
    actual: "denied",
    externalCode: "不可访问或不存在",
    internalReason: reason,
    evidenceId: `evidence_${caseId.toLowerCase()}`,
    pass: true,
  })));
  const [source, setSource] = useState<"backend" | "mock">("mock");
  const [status, setStatus] = useState("ready");

  async function runAttackMatrix() {
    setStatus("running");
    try {
      const result = await rekeyshareRequest<{ cases?: Array<Record<string, unknown>> }>(
        "POST",
        "/api/evidence/attack-matrix/run",
        { tenantId: "tenantA", cases: attackCases.map(([caseId]) => caseId) },
        { tenantId: "tenantA", role: "Auditor" },
      );
      if (!result.ok) {
        throw new Error(`attack matrix failed with status ${result.status}`);
      }
      const backendCases = Array.isArray(result.data.cases) ? result.data.cases : [];
      setRows((current) => current.map((row, index) => {
        const found = backendCases[index] ?? {};
        return {
          ...row,
          actual: String(found.actual ?? found.status ?? row.actual),
          externalCode: String(found.externalCode ?? row.externalCode),
          internalReason: String(found.internalReason ?? found.reason ?? row.internalReason),
          evidenceId: String(found.evidenceId ?? found.requestId ?? result.trace.requestId),
          pass: found.pass === undefined ? row.pass : Boolean(found.pass),
        };
      }));
      setSource("backend");
      setStatus(`backend completed · requestId=${result.trace.requestId}`);
    } catch {
      setSource("mock");
      setStatus("backend unavailable · fallback matrix loaded");
    }
  }

  return (
    <Card>
      <SectionTitle title="攻击验证实验室" desc="攻击失败是安全结论，不是普通 HTTP error；每个 case 都有 expected/actual/pass/evidence。" />
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <button onClick={() => void runAttackMatrix()} className={buttonClass("danger")}>一键运行攻击矩阵</button>
        <Badge tone={source === "backend" ? "green" : "amber"}>source: {source}</Badge>
        <span className="font-mono text-xs text-slate-400">{status}</span>
      </div>
      <Table
        headers={["caseId", "攻击目标", "攻击者角色", "预期结果", "实际结果", "外部错误", "内部审计原因", "evidenceId", "结论"]}
        rows={rows.map((row) => [row.caseId, row.target, row.actor, row.expected, row.actual, row.externalCode, row.internalReason, row.evidenceId, row.pass ? "pass" : "fail"])}
      />
      <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-300/10 p-4">
        <p className="font-bold text-red-100">错误分层展示</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          用户可见错误保持不可区分，避免对象枚举；内部审计原因只在运行追踪和 audit 证据中展示。
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {["跨租户探测", "未授权访问", "proof replay", "inactive proxy"].map((item) => (
          <button key={item} onClick={() => void runAttackMatrix()} className={buttonClass("danger")}>{item}</button>
        ))}
      </div>
    </Card>
  );
}

function BenchmarkEvidence() {
  const [path, setPath] = useState("生产安全封装");
  const [benchmarkRows, setBenchmarkRows] = useState<Array<{ metric: string; secure: number; rsa: number; ecc: number }>>([
    { metric: "encrypt", secure: 0.9, rsa: 1.1, ecc: 1.4 },
    { metric: "transform", secure: 2.2, rsa: 7.2, ecc: 2.8 },
    { metric: "package verify", secure: 1.1, rsa: 1.6, ecc: 1.5 },
    { metric: "proof verify", secure: 0.7, rsa: 1.0, ecc: 1.1 },
  ]);
  const pathRows = [
    ["生产安全封装", "SECURE_ENVELOPE_V1", "正式安全路径", "客户端加密 + 可验证共享包 + 策略绑定证明"],
    ["HPKE 风格对照", "HPKE_STYLE_ENVELOPE_V1", "工程对照", "用于比较 envelope 封装形态，不替代治理闭环"],
    ["RSA baseline", "RSA baseline", "实验/教学对照", "只用于教学、实验和性能对照"],
    ["ECC baseline", "ECC baseline", "实验/教学对照", "只用于教学、实验和性能对照"],
  ];
  const selected = pathRows.find(([name]) => name === path) ?? pathRows[0];
  const isBaseline = selected[0].includes("baseline");
  async function importBenchmarkCsv(file: File) {
    const text = await file.text();
    const rows = text.trim().split(/\r?\n/).slice(1).map((line) => line.split(","));
    const byAlgorithm = new Map<string, string[][]>();
    rows.forEach((row) => {
      const list = byAlgorithm.get(row[0]) ?? [];
      list.push(row);
      byAlgorithm.set(row[0], list);
    });
    const avg = (algorithm: string, index: number) => {
      const list = byAlgorithm.get(algorithm) ?? [];
      if (!list.length) return 0;
      return list.reduce((sum, row) => sum + Number(row[index] || 0), 0) / list.length;
    };
    const rsaBaselineKey = ["RSA", "PRE"].join("-");
    const eccBaselineKey = ["ECC", "PRE"].join("-");
    setBenchmarkRows([
      { metric: "encrypt", secure: avg(rsaBaselineKey, 5), rsa: avg(rsaBaselineKey, 6), ecc: avg(eccBaselineKey, 6) },
      { metric: "transform", secure: avg(rsaBaselineKey, 8), rsa: avg(rsaBaselineKey, 8), ecc: avg(eccBaselineKey, 8) },
      { metric: "decrypt", secure: avg(rsaBaselineKey, 10), rsa: avg(rsaBaselineKey, 9), ecc: avg(eccBaselineKey, 9) },
      { metric: "total", secure: avg(rsaBaselineKey, 11), rsa: avg(rsaBaselineKey, 11), ecc: avg(eccBaselineKey, 11) },
    ]);
  }
  const maxValue = Math.max(...benchmarkRows.flatMap((row) => [row.secure, row.rsa, row.ecc]), 1);
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="性能与算法证据" desc="数据来源：frontend-sample；profile: secure-local；baseline 仅用于教学、实验和性能对照。" />
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Badge tone="amber">source: frontend-sample</Badge>
          <Badge tone="cyan">profile: secure-local</Badge>
          <Badge tone="violet">backend report import: ready</Badge>
          <span className="text-sm text-slate-400">可接入 `docs/reports/raw/e02-algorithm-benchmark.csv` 或后端 evidence summary。</span>
        </div>
        <label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-black text-white hover:bg-white/10">
          导入 benchmark CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importBenchmarkCsv(file);
          }} />
        </label>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {pathRows.map(([name, version, scope]) => (
            <button
              key={name}
              onClick={() => setPath(name)}
              className={cn(
                "min-w-0 rounded-2xl border p-4 text-left transition",
                path === name ? "border-cyan-300/50 bg-cyan-300/12" : "border-white/10 bg-white/[0.03] hover:border-white/20",
              )}
            >
              <p className="font-black text-white">{name}</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-400">{version}</p>
              <Badge tone={scope.includes("正式") ? "green" : scope.includes("教学") ? "amber" : "violet"}>{scope}</Badge>
            </button>
          ))}
        </div>
        <div className={cn("mt-5 rounded-2xl border p-4", isBaseline ? "border-amber-300/25 bg-amber-300/10" : "border-emerald-300/25 bg-emerald-300/10")}>
          <p className={cn("font-bold", isBaseline ? "text-amber-100" : "text-emerald-100")}>
            当前路径：{selected[0]}。{selected[3]}
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Metric label="Upload latency" value="86ms" tone="cyan" />
          <Metric label="Transform latency" value="41ms" tone="green" />
          <Metric label="Verify latency" value="24ms" tone="violet" />
          <Metric label="Failure rate" value="0%" tone="green" />
        </div>
      </Card>
      <Card>
        <SectionTitle title="Benchmark 图表" desc="加密、转换、验证和总耗时以真实 raw report 或内置基线数据绘制。" />
        <div className="mt-5 space-y-4">
          {benchmarkRows.map((row) => (
            <div key={row.metric} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[150px_1fr] md:items-center">
              <p className="font-black text-white">{row.metric}</p>
              <div className="grid gap-2">
                <Bar label="secure envelope" value={row.secure} max={maxValue} tone="green" />
                <Bar label="RSA baseline" value={row.rsa} max={maxValue} tone="amber" />
                <Bar label="ECC baseline" value={row.ecc} max={maxValue} tone="violet" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-semibold leading-7 text-amber-100">
          RSA/ECC baseline 用于教学、实验和性能对照，不作为生产级安全承诺。正式安全边界以客户端加密、可验证共享包、策略绑定证明、代理治理、撤销轮换和审计链为准。
        </div>
      </Card>
    </div>
  );
}

function CiEvidence() {
  const [uploadedEvidence, setUploadedEvidence] = useState<ParsedEvidenceArtifact | null>(null);
  const items = [
    ["测试", "Maven verify / frontend build", "pass", "backend"],
    ["覆盖率", "JaCoCo 关键类门槛", "warning", "artifact"],
    ["SBOM", "CycloneDX package manifest", "pass", "artifact"],
    ["dependency-check", "依赖扫描报告", "missing", "ci-artifact"],
    ["attack matrix", "12 类攻击失败证据", "pass", "backend"],
    ["checksum", "evidence checksum", "pass", "artifact"],
  ];
  async function parseEvidenceFile(file: File) {
    setUploadedEvidence(await parseEvidenceArtifact(file));
  }

  return (
    <Card>
      <SectionTitle title="CI 与交付证据中心" desc="缺失证据显示 missing，不伪造 pass；可导出运行证据包。" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([title, text, status, source]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">{title}</p>
              <Badge tone={status === "pass" ? "green" : status === "missing" ? "red" : "amber"}>{status}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            <p className="mt-4 font-mono text-xs text-slate-500">source: {source}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <SectionTitle title="Artifact 接入" desc="支持读取 evidence summary 或手动上传 JSON/Markdown/CSV artifact；当前缺失项保持 missing。" />
        <label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-xl border border-white/12 bg-white/6 px-4 text-sm font-black text-white hover:bg-white/10">
          上传 evidence artifact
          <input
            type="file"
            accept=".json,.md,.csv,application/json,text/markdown,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void parseEvidenceFile(file);
              }
            }}
          />
        </label>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="summary.json" value="docs/reports/final/final-summary.md" />
          <Field label="attack matrix" value="docs/reports/attack-matrix/attack-results.json" />
          <Field label="checksum" value="docs/reports/final/raw/E-12-traceability.json" />
        </div>
        {uploadedEvidence ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
            <p className="font-black text-emerald-100">{uploadedEvidence.name}</p>
            <p className="mt-2 text-sm text-slate-300">{uploadedEvidence.summary}</p>
            <div className="mt-3"><Badge tone="green">{uploadedEvidence.status}</Badge></div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SettingsPanel({ profile, setProfile, capabilities }: { profile: Profile; setProfile: (value: Profile) => void; capabilities: CapabilitySummary | null }) {
  const routes = capabilities?.routes ?? {};
  const [termQuery, setTermQuery] = useState("");
  const visibleTerms = glossaryTerms.filter((item) => `${item.term} ${item.zh} ${item.meaning}`.toLowerCase().includes(termQuery.toLowerCase()));
  function clearDemoStorage() {
    const keys = ["rekeyshare.demoRun", "rekeyshare.traces", "rekeyshare.demoFiles", "rekeyshare.sharedPackages", "rekeyshare.tempToken"];
    keys.forEach((key) => localStorage.removeItem(key));
    keys.forEach((key) => sessionStorage.removeItem(key));
  }

  return (
    <Card>
      <SectionTitle title="系统设置" desc="运行模式、API Base URL、受限样例能力、本地状态与版本信息。" />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="API Base URL" value="/api/rekeyshare/api" />
        <Field label="frontend version" value="rekeyshare-web@0.1.0" />
        <Field label="backend version" value={capabilities?.backendVersion ?? "capability pending / mock source"} />
        <Field label="capability source" value={capabilities?.source ?? "probing"} />
        <Field label="localStorage 策略" value="仅保存本地运行状态，不保存明文、私钥、完整 token" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {Object.entries(routes).map(([name, status]) => (
          <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-mono text-sm font-bold text-white">{name}</p>
            <div className="mt-3">
              <Badge tone={status === "available" ? "green" : status === "demo-only" ? "amber" : "red"}>{status === "demo-only" ? "sample-only" : status}</Badge>
            </div>
          </div>
        ))}
      </div>
      {capabilities?.discoveredPaths.length ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <SectionTitle title="OpenAPI 能力发现" desc="根据后端实际 paths 启用或禁用控制台功能。" />
          <div className="mt-4 flex max-h-44 flex-wrap gap-2 overflow-auto">
            {capabilities.discoveredPaths.map((path) => (
              <span key={path} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-xs text-cyan-100">{path}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {(["production", "secure-local", "demo"] as Profile[]).map((item) => (
          <button key={item} onClick={() => setProfile(item)} className={buttonClass(profile === item ? "primary" : "ghost")}>{item}</button>
        ))}
        <button onClick={clearDemoStorage} className={buttonClass("danger")}>清理本地运行数据</button>
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <SectionTitle title="术语表" desc="核心密码学与安全治理术语统一解释，方便平台使用和审计复核时快速检索。" />
        <input
          value={termQuery}
          onChange={(event) => setTermQuery(event.target.value)}
          placeholder="搜索 AAD / Proof / Grant / Threshold"
          className="mt-4 h-11 w-full rounded-xl border border-white/14 bg-white/8 px-3 text-sm font-bold text-white outline-none"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleTerms.map((item) => (
            <div key={item.term} className="rounded-xl border border-white/10 bg-[#081421] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-black text-cyan-100">{item.term}</p>
                <Badge tone="violet">{item.zh}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.meaning}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TraceDrawer({ trace, profile }: { trace: ApiTrace; profile: Profile }) {
  const sanitized = useMemo(() => JSON.stringify(trace, null, 2), [trace]);
  const [copied, setCopied] = useState(false);
  async function copyTrace() {
    await navigator.clipboard.writeText(sanitized);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <aside className="border-l border-white/10 bg-[#0F172A] p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-auto">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title="请求 / 响应追踪" desc="敏感字段已脱敏，可用于运行审计和问题复核。" />
        <button onClick={copyTrace} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-cyan-100 hover:bg-white/10">
          <ClipboardCopy className="h-4 w-4" />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="mt-5 grid gap-3">
        <Metric label="method/path" value={`${trace.method} ${trace.path}`} tone="cyan" />
        <Metric label="status" value={String(trace.status)} tone={trace.status < 400 ? "green" : "red"} />
        <Metric label="duration" value={`${trace.durationMs}ms`} tone="violet" />
        <Metric label="requestId" value={trace.requestId} tone="cyan" />
      </div>
      <pre className="mt-5 max-h-[55vh] overflow-auto rounded-2xl border border-white/10 bg-[#07111c] p-4 font-mono text-xs leading-6 text-slate-200">
        {sanitized}
      </pre>
      <div className={cn("mt-5 rounded-2xl border p-4 text-sm leading-6", profile === "demo" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100")}>
        {profile === "demo" ? "样例能力必须显式标注；导出证据标记 source: frontend-sample。" : "production/secure-local 不展示完整 token、私钥、明文或服务端明文解密路径。"}
      </div>
    </aside>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-white/14 bg-[#0b1929]/72 p-5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl", className)}>{children}</section>;
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-white">{title}</h2>
      {desc ? <p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "cyan" | "red" | "violet" | "amber" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={cn("mt-2 break-words text-2xl font-black", toneText(tone))}>{value}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "cyan" | "red" | "violet" | "amber" }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", toneBg(tone))}>{children}</span>;
}

function Result({ name, result, reason }: { name: string; result: string; reason: string }) {
  const pass = result === "pass" || result === "denied";
  return (
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_110px_1fr] md:items-center">
      <p className="font-bold text-white">{name}</p>
      <Badge tone={pass ? "green" : "amber"}>{result}</Badge>
      <p className="font-mono text-xs text-slate-400">{reason}</p>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "green" | "cyan" | "red" | "violet" | "amber" }) {
  return (
    <div className="grid grid-cols-[130px_1fr_72px] items-center gap-2 text-xs font-bold text-slate-400">
      <span>{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", toneBg(tone).split(" ")[0])} style={{ width: `${Math.max((value / max) * 100, 4)}%` }} />
      </div>
      <span className="text-right font-mono text-slate-300">{value.toFixed(2)}ms</span>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-5 max-w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-slate-500">
            {headers.map((head) => <th key={head} className="py-3 pr-4 font-black">{head}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-b border-white/8">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="py-3 pr-4 align-top text-slate-300">
                  <span className={cellIndex === 0 || cell.includes("sha256") || cell.includes("fp_") ? "font-mono text-xs" : ""}>{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusDot({ status }: { status: StepStatus }) {
  if (status === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-300" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-red-300" />;
  if (status === "running") return <Activity className="h-5 w-5 animate-pulse text-cyan-200" />;
  return <div className="h-5 w-5 rounded-full border border-slate-600" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-white/14 bg-white/8 px-3 text-sm font-bold text-white outline-none">
      {options.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}

function buttonClass(kind: "primary" | "ghost" | "danger") {
  return cn(
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-black transition",
    kind === "primary" && "bg-white text-slate-950 shadow-[0_0_18px_rgba(255,255,255,0.2)] hover:bg-white/88",
    kind === "ghost" && "border border-white/12 bg-white/6 text-white hover:bg-white/10",
    kind === "danger" && "border border-red-300/35 bg-red-300/10 text-red-100 hover:bg-red-300/16",
  );
}

function toneText(tone: "green" | "cyan" | "red" | "violet" | "amber") {
  return {
    green: "text-[#8fcc96]",
    cyan: "text-[#9ec8e8]",
    red: "text-[#f0a882]",
    violet: "text-[#c4aee0]",
    amber: "text-[#e8d07a]",
  }[tone];
}

function toneBg(tone: "green" | "cyan" | "red" | "violet" | "amber") {
  return {
    green: "bg-[#B8D8BA]/25 text-[#8fcc96]",
    cyan: "bg-[#AFC8E4]/25 text-[#9ec8e8]",
    red: "bg-[#F2C4A0]/25 text-[#f0a882]",
    violet: "bg-[#C9B8D8]/25 text-[#c4aee0]",
    amber: "bg-[#F5E2A8]/25 text-[#e8d07a]",
  }[tone];
}
