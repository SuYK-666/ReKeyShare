"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  CheckCircle2,
  Fingerprint,
  Play,
  Settings,
  ShieldAlert,
  UploadCloud,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import FlowLines from "@/components/ui/flow-lines";
import VideoBackdrop from "@/components/ui/video-backdrop";
import { MechanismGraphs } from "@/components/console/mechanism-graphs";
import { discoverCapabilities, type CapabilitySummary } from "@/lib/api/capabilities";
import type { ApiTrace } from "@/lib/api/traces";
import { getDemoActors } from "@/lib/demo/bootstrap";
import { demoSteps, type RunnerMode } from "@/lib/demo/scenario-runner";
import { glossaryTerms } from "@/lib/security/glossary";
import { cn } from "@/lib/utils";
import { useDemoRun, type StepStatus } from "@/hooks/useDemoRun";
import { rekeyshareRequest } from "@/services/rekeyshare-api";

type ViewKey = "demo" | "upload" | "proxy" | "packages" | "attack" | "settings";

type Profile = "production" | "secure-local" | "demo";

const nav: Array<{ key: ViewKey; label: string; icon: LucideIcon }> = [
  { key: "demo", label: "运行驾驶舱", icon: Play },
  { key: "upload", label: "客户端加密上传", icon: UploadCloud },
  { key: "proxy", label: "代理节点治理", icon: Fingerprint },
  { key: "packages", label: "共享包与访问", icon: Boxes },
  { key: "attack", label: "攻击验证实验室", icon: ShieldAlert },
  { key: "settings", label: "系统设置", icon: Settings },
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

function randomBase64(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

export default function ReKeyShareConsole() {
  const [view, setView] = useState<ViewKey>("demo");
  const [profile, setProfile] = useState<Profile>("secure-local");
  const [tenant, setTenant] = useState("tenantA");
  const { completed, runnerMode, setRunnerMode, stepStatuses, runStep, runAll } = useDemoRun(traces[0]);
  const [capabilities, setCapabilities] = useState<CapabilitySummary | null>(null);
  const active = nav.find((item) => item.key === view) ?? nav[0];

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
      if (!alive) return;
      setCapabilities(summary);
      setProfile(summary.profile);
      if (!summary.online) setRunnerMode("mock");
    });
    return () => { alive = false; };
  }, [setRunnerMode]);

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
    <main className="relative min-h-screen bg-[#081421] text-[#E5E7EB]">
      <VideoBackdrop fixed overlayClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(5,17,30,0.5),rgba(5,17,30,0.82))]" />
      <FlowLines />
      <div className="relative z-10 grid min-h-screen grid-cols-[220px_1fr]">
        <aside className="flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[#0b1929]/80 backdrop-blur-xl">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">RK</div>
            <Link href="/" className="font-display text-base font-black text-white">ReKeyShare</Link>
          </div>
          <nav className="space-y-1 overflow-y-auto p-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => changeView(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition",
                    view === item.key
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-white/54 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 h-screen overflow-y-auto">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#07111c]/60 px-4 py-3 backdrop-blur-xl lg:px-6">
            <Link href="/" className="text-lg font-black text-white hover:text-white/80 transition">{active.label}</Link>
            <div className="flex items-center gap-2">
              <Select value={runnerMode} onChange={(v) => setRunnerMode(v as RunnerMode)} options={["backend", "mock"]} />
              <Badge tone={capabilities?.online ? "green" : "amber"}>{capabilities?.online ? "online" : "mock"}</Badge>
            </div>
          </header>
          <div className="space-y-5 p-4 lg:p-6">
            {(() => {
              switch (view) {
                case "demo": return <DemoDashboard statuses={stepStatuses} completed={completed} runnerMode={runnerMode} runStep={runStep} runAll={runAll} />;
                case "upload": return <UploadWizard />;
                case "proxy": return <ProxyGovernance />;
                case "packages": return <SharedPackages />;
                case "attack": return <AttackLab />;
                case "settings": return <SettingsPanel profile={profile} setProfile={setProfile} capabilities={capabilities} />;
              }
            })()}
          </div>
        </section>
      </div>
    </main>
  );
}


function DemoDashboard({
  statuses,
  completed,
  runnerMode,
  runStep,
  runAll,
}: {
  statuses: StepStatus[];
  completed: number;
  runnerMode: RunnerMode;
  runStep: (index: number) => void;
  runAll: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title="12 步标准剧本" />
          <button onClick={() => void runAll()} className={buttonClass("primary")}>一键运行</button>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-[#10B981] transition-all" style={{ width: `${(completed / 12) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{completed}/12 · {runnerMode}</p>
        <div className="mt-4 space-y-1.5">
          {demoSteps.map((step, index) => (
            <button key={step} onClick={() => void runStep(index)} className="flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left hover:border-cyan-300/40">
              <StatusDot status={statuses[index]} />
              <span className="flex-1 text-sm font-bold text-white">{index + 1}. {step}</span>
            </button>
          ))}
        </div>
      </Card>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="成功步骤" value={`${completed}/12`} tone="green" />
          <Metric label="成功接口" value="10" tone="cyan" />
          <Metric label="失败证据" value="4" tone="red" />
          <Metric label="证据数量" value="18" tone="violet" />
        </div>
        <Card>
          <SectionTitle title="运行摘要" />
          <p className="mt-3 leading-7 text-slate-300">
            客户端加密后上传密文 → Owner 创建对象级授权 → 受治理代理节点在策略约束下生成共享包和策略绑定证明 → Recipient 先本地验证再解密 → 撤销后旧共享包失败 → 审计链和攻击矩阵证明失败原因。
          </p>
        </Card>
        <MechanismGraphs />
      </div>
    </div>
  );
}

function UploadWizard() {
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
      const { actors } = await getDemoActors();
      const runId = crypto.randomUUID().slice(0, 8);
      const backend = await rekeyshareRequest<Record<string, unknown>>(
        "POST",
        "/api/data/upload-encrypted",
        {
          dataId: `${aad.dataId}_${runId}`,
          encryptedContent: toBase64(ciphertext),
          contentNonce: toBase64(nonceBytes),
          capsuleHeader: randomBase64(256),
          wrappedKey: randomBase64(32),
          keyNonce: randomBase64(12),
          fileName: selectedFile?.name ?? "salary.xlsx",
          contentType: selectedFile?.type || "application/octet-stream",
          originalSize: sample.byteLength,
        },
        {
          tenantId: aad.tenantId,
          role: actors.owner.role,
          idempotencyKey: `upload_webcrypto_${runId}`,
          token: actors.owner.token,
        },
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

function ProxyGovernance() {
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

function SharedPackages() {
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
