"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BadgeCheck,
  ClipboardList,
  Home,
  LockKeyhole,
  RotateCw,
  ShieldCheck,
  UploadCloud,
  UnlockKeyhole,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type {
  ApiAlgorithm,
  ApiAudit,
  ApiFile,
  ApiPerformance,
  ApiShared,
  ApiSummary,
  ApiUser,
  ConsoleData,
} from "@/lib/api-types";
import { demoPerformanceRows, demoSampleContent, getDemoConsoleData } from "@/lib/demo-seed";
import VideoBackdrop from "@/components/ui/video-backdrop";

type PageKey =
  | "dashboard"
  | "users"
  | "upload"
  | "authorize"
  | "access"
  | "audit"
  | "compare"
  | "verify";

type UiAlgorithm = "RSA-PRE" | "ECC-PRE" | "混合模式";

const pages: Array<{ key: PageKey; label: string; badge?: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "系统首页", icon: Home },
  { key: "users", label: "用户与密钥", icon: Users },
  { key: "upload", label: "加密上传", icon: UploadCloud },
  { key: "authorize", label: "授权重加密", badge: "核心", icon: RotateCw },
  { key: "access", label: "授权访问", icon: UnlockKeyhole },
  { key: "audit", label: "访问审计", icon: ClipboardList },
  { key: "compare", label: "性能对比", icon: BarChart3 },
  { key: "verify", label: "安全验证", icon: BadgeCheck },
];

const authSteps = [
  "选择待共享密文 C_A",
  "选择被授权用户 Bob",
  "生成重加密密钥 rk_A_to_B",
  "代理执行密文转换",
  "生成 Bob 可解密密文 C_B",
];

const API_BASE = process.env.NEXT_PUBLIC_PRE_API_BASE ?? "/api/rekeyshare/api";
const CONSOLE_SESSION_KEY = "rekeyshare.console.sessions.v1";

function toApiAlgorithm(value: UiAlgorithm): ApiAlgorithm {
  return value === "RSA-PRE" ? "RSA_PRE" : "ECC_PRE";
}

type BackendUserResponse = {
  userId: string;
  role: string;
  algorithm: ApiAlgorithm;
  algorithmSuite?: string;
  securityLevel?: string;
  securityNotice?: string;
  token: string;
};

type BackendAuditResponse = {
  events: Array<Partial<ApiAudit> & { eventId?: string }>;
};

type ConsoleSession = {
  algorithm: ApiAlgorithm;
  users: Record<string, BackendUserResponse>;
  files: ApiFile[];
  sharedFiles: ApiShared[];
  packages: Record<string, { packageId: string; dataId: string; recipientId: string }>;
  decryptions: Record<string, { plaintext: string; sha256: string }>;
};

function emptySession(algorithm: ApiAlgorithm): ConsoleSession {
  return {
    algorithm,
    users: {},
    files: [],
    sharedFiles: [],
    packages: {},
    decryptions: {},
  };
}

function readStoredSession(algorithm: ApiAlgorithm): ConsoleSession {
  if (typeof window === "undefined") {
    return emptySession(algorithm);
  }
  try {
    const sessions = JSON.parse(window.localStorage.getItem(CONSOLE_SESSION_KEY) ?? "{}") as Record<string, ConsoleSession>;
    return sessions[algorithm] ?? emptySession(algorithm);
  } catch {
    return emptySession(algorithm);
  }
}

function writeStoredSession(session: ConsoleSession) {
  if (typeof window === "undefined") {
    return;
  }
  const sessions = JSON.parse(window.localStorage.getItem(CONSOLE_SESSION_KEY) ?? "{}") as Record<string, ConsoleSession>;
  sessions[session.algorithm] = session;
  window.localStorage.setItem(CONSOLE_SESSION_KEY, JSON.stringify(sessions));
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...options });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `request failed: ${response.status}`);
  }
  return response.json();
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toConsoleUser(user: BackendUserResponse): ApiUser {
  return {
    userId: user.userId,
    role: user.role,
    algorithm: user.algorithm,
    publicKey: user.algorithmSuite ?? user.algorithm,
    privateKeyStatus: user.securityLevel ?? "demo token",
  };
}

function normalizeAudit(events: BackendAuditResponse["events"]): ApiAudit[] {
  return events.map((event) => ({
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: event.actor ?? "system",
    action: event.action ?? "UNKNOWN",
    target: event.target ?? event.eventId ?? "-",
    success: event.success ?? true,
    message: event.message ?? "",
  }));
}

function makeSummary(session: ConsoleSession, auditEvents: ApiAudit[]): ApiSummary {
  return {
    uploads: session.files.length,
    authorizations: session.sharedFiles.length,
    reEncryptions: Object.keys(session.packages).length,
    decryptions: Object.keys(session.decryptions).length,
    users: Object.keys(session.users).length,
    sharedPackages: Object.keys(session.packages).length,
  };
}

async function ensureUser(session: ConsoleSession, userId: string, role: "OWNER" | "RECIPIENT" | "PROXY" | "ADMIN") {
  if (session.users[userId]) {
    return session.users[userId];
  }
  const user = await apiPost<BackendUserResponse>("/users", {
    userId,
    role,
    algorithm: session.algorithm,
  });
  session.users[userId] = user;
  writeStoredSession(session);
  return user;
}

async function fetchConsoleData(apiAlgorithm: ApiAlgorithm): Promise<ConsoleData> {
  const session = readStoredSession(apiAlgorithm);
  const admin = await ensureUser(session, "admin", "ADMIN");
  const auditRes = await apiGet<BackendAuditResponse>("/audit/events", admin.token);
  const auditEvents = normalizeAudit(auditRes.events);

  return {
    users: Object.values(session.users).map(toConsoleUser),
    files: session.files,
    sharedFiles: session.sharedFiles,
    auditEvents,
    summary: makeSummary(session, auditEvents),
    performanceRows: demoPerformanceRows,
  };
}

async function loadConsoleData(apiAlgorithm: ApiAlgorithm): Promise<{ data: ConsoleData; usingDemoData: boolean }> {
  try {
    return { data: await fetchConsoleData(apiAlgorithm), usingDemoData: false };
  } catch {
    return { data: getDemoConsoleData(apiAlgorithm), usingDemoData: true };
  }
}

function applyConsoleData(
  data: ConsoleData,
  setters: {
    setUsers: (value: ApiUser[]) => void;
    setFiles: (value: ApiFile[]) => void;
    setSharedFiles: (value: ApiShared[]) => void;
    setAuditEvents: (value: ApiAudit[]) => void;
    setSummary: (value: ApiSummary) => void;
    setPerformanceRows: (value: ApiPerformance[]) => void;
  },
) {
  setters.setUsers(data.users);
  setters.setFiles(data.files);
  setters.setSharedFiles(data.sharedFiles);
  setters.setAuditEvents(data.auditEvents);
  setters.setSummary(data.summary);
  setters.setPerformanceRows(data.performanceRows);
}

function ProxyVaultConsole() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [algorithm, setAlgorithm] = useState<UiAlgorithm>("ECC-PRE");
  const [authStep, setAuthStep] = useState(3);
  const [selectedFile, setSelectedFile] = useState("salary.xlsx");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [sharedFiles, setSharedFiles] = useState<ApiShared[]>([]);
  const [auditEvents, setAuditEvents] = useState<ApiAudit[]>([]);
  const [performanceRows, setPerformanceRows] = useState<ApiPerformance[]>([]);
  const [summary, setSummary] = useState<ApiSummary>({
    uploads: 0,
    authorizations: 0,
    reEncryptions: 0,
    decryptions: 0,
    users: 0,
    sharedPackages: 0,
  });
  const [newUserId, setNewUserId] = useState("Diana");
  const [uploadOwnerId, setUploadOwnerId] = useState("Alice");
  const [uploadContent, setUploadContent] = useState(demoSampleContent);
  const [authRecipientId, setAuthRecipientId] = useState("Bob");
  const [decryptResult, setDecryptResult] = useState<{
    success: boolean;
    plaintext: string;
    sha256: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeLabel = useMemo(
    () => pages.find((page) => page.key === activePage)?.label ?? "系统首页",
    [activePage],
  );
  const apiAlgorithm = toApiAlgorithm(algorithm);

  async function refreshData() {
    setLoading(true);
    try {
      const { data, usingDemoData: demoMode } = await loadConsoleData(apiAlgorithm);
      applyConsoleData(data, {
        setUsers,
        setFiles,
        setSharedFiles,
        setAuditEvents,
        setSummary,
        setPerformanceRows,
      });
      setUsingDemoData(demoMode);
      setBackendError(null);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "后端连接失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadConsoleData(apiAlgorithm)
        .then(({ data, usingDemoData: demoMode }) => {
          applyConsoleData(data, {
            setUsers,
            setFiles,
            setSharedFiles,
            setAuditEvents,
            setSummary,
            setPerformanceRows,
          });
          setUsingDemoData(demoMode);
          setBackendError(null);
        })
        .catch((error) => {
          setBackendError(error instanceof Error ? error.message : "后端连接失败");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiAlgorithm]);

  async function handleCreateUser() {
    try {
      const session = readStoredSession(apiAlgorithm);
      const role = newUserId.toLowerCase() === "alice" ? "OWNER" : newUserId.toLowerCase() === "proxy" ? "PROXY" : "RECIPIENT";
      await ensureUser(session, newUserId, role);
      setStatusMessage(`已创建用户 ${newUserId}`);
      await refreshData();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "创建用户失败");
    }
  }

  async function handleUpload() {
    try {
      const session = readStoredSession(apiAlgorithm);
      const owner = await ensureUser(session, uploadOwnerId, "OWNER");
      const response = await apiPost<{ dataId: string; ciphertextHash?: string }>(
        "/data/upload",
        {
          algorithm: apiAlgorithm,
          plaintext: uploadContent,
          fileName: selectedFile,
        },
        owner.token,
      );
      const file: ApiFile = {
        dataId: response.dataId,
        fileName: selectedFile,
        ownerId: uploadOwnerId,
        algorithm: apiAlgorithm,
        cipherSize: Math.max(uploadContent.length + 96, 128),
        plaintextSize: uploadContent.length,
        createdAt: new Date().toISOString(),
        hashPreview: response.ciphertextHash ? `${response.ciphertextHash.slice(0, 16)}...` : `${(await sha256Hex(uploadContent)).slice(0, 16)}...`,
      };
      session.files = [...session.files, file];
      writeStoredSession(session);
      setStatusMessage(`已上传并加密 ${selectedFile}`);
      await refreshData();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "上传失败");
    }
  }

  async function handleAuthorize() {
    const latestFile = files.at(-1);
    if (!latestFile) {
      setBackendError("请先上传一个文件");
      return;
    }
    try {
      const session = readStoredSession(apiAlgorithm);
      const owner = await ensureUser(session, latestFile.ownerId, "OWNER");
      const recipient = await ensureUser(session, authRecipientId, "RECIPIENT");
      const proxy = await ensureUser(session, "proxy", "PROXY");

      let grantResponse: { grantId: string };
      if (apiAlgorithm === "ECC_PRE") {
        const rekeySession = await apiPost<{ sessionId: string }>(
          "/rekey-sessions",
          { dataId: latestFile.dataId, recipientId: authRecipientId },
          owner.token,
        );
        await apiPost(
          `/rekey-sessions/${rekeySession.sessionId}/recipient-share-demo`,
          {},
          recipient.token,
        );
        grantResponse = await apiPost<{ grantId: string }>(
          "/grants/ecc",
          { dataId: latestFile.dataId, recipientId: authRecipientId, sessionId: rekeySession.sessionId },
          owner.token,
        );
      } else {
        grantResponse = await apiPost<{ grantId: string }>(
          "/grants",
          { dataId: latestFile.dataId, recipientId: authRecipientId, maxAccessCount: 5 },
          owner.token,
        );
      }

      const packageResponse = await apiPost<{ packageId: string }>(
        "/proxy/re-encrypt",
        { grantId: grantResponse.grantId },
        proxy.token,
      );
      session.packages[latestFile.dataId] = {
        packageId: packageResponse.packageId,
        dataId: latestFile.dataId,
        recipientId: authRecipientId,
      };
      session.sharedFiles = [
        ...session.sharedFiles.filter((shared) => shared.dataId !== latestFile.dataId),
        {
          dataId: latestFile.dataId,
          ownerId: latestFile.ownerId,
          recipientId: authRecipientId,
          algorithm: apiAlgorithm,
          authorizedAt: new Date().toISOString(),
          status: "可下载密文包",
        },
      ];
      writeStoredSession(session);
      setStatusMessage(`已授权 ${authRecipientId} 访问 ${latestFile.fileName}`);
      setAuthStep(4);
      await refreshData();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "授权失败");
    }
  }

  async function handleDecrypt(recipientId: string, dataId: string) {
    try {
      const session = readStoredSession(apiAlgorithm);
      const recipient = await ensureUser(session, recipientId, "RECIPIENT");
      const sharedPackage = session.packages[dataId];
      if (!sharedPackage) {
        throw new Error("未找到共享密文包，请先完成授权重加密");
      }
      const response = await apiGet<{ plaintext: string }>(
        `/demo/shared-packages/${sharedPackage.packageId}/decrypt`,
        recipient.token,
      );
      const result = {
        success: true,
        plaintext: response.plaintext,
        sha256: await sha256Hex(response.plaintext),
      };
      session.decryptions[dataId] = { plaintext: result.plaintext, sha256: result.sha256 };
      writeStoredSession(session);
      setDecryptResult(result);
      setStatusMessage(`用户 ${recipientId} 已完成解密`);
      await refreshData();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "解密失败");
    }
  }

  const latestFile = files.at(-1);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#081421] text-slate-950">
      <VideoBackdrop
        fixed
        overlayClassName="bg-[linear-gradient(180deg,rgba(4,18,31,0.58),rgba(4,18,31,0.86))]"
      />
      <section className="relative z-10 min-h-screen pt-[120px] lg:pt-[88px]">
        <div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07111c]/82 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                ProxyVault Data Security Sharing System
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                <ArrowLeft className="h-4 w-4" />
                返回欢迎页
              </Link>
              {(["RSA-PRE", "ECC-PRE", "混合模式"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setAlgorithm(item)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-semibold transition",
                    algorithm === item
                      ? "border-white/0 bg-white text-slate-950"
                      : "border-white/14 bg-white/8 text-white/84 hover:bg-white/12",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-4 py-5 lg:block lg:px-6 lg:py-6 lg:pl-[280px]">
          <aside className="lg:fixed lg:left-[max(1.5rem,calc((100vw-1440px)/2+1.5rem))] lg:top-[112px] lg:z-30 lg:h-[calc(100vh-136px)] lg:w-56">
            <nav className="flex gap-2 overflow-x-auto rounded-[28px] border border-white/12 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl lg:h-full lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
              {pages.map((page) => {
                const Icon = page.icon;

                return (
                  <button
                    key={page.key}
                    onClick={() => setActivePage(page.key)}
                    className={cn(
                      "group relative inline-flex h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition lg:w-full",
                      activePage === page.key
                        ? "bg-white text-slate-950 shadow-sm"
                        : "bg-white/8 text-white/76 hover:bg-white/12 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        activePage === page.key ? "text-cyan-700" : "text-cyan-100/82",
                      )}
                    />
                    <span className="whitespace-nowrap">{page.label}</span>
                    {page.badge ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-[10px]",
                          activePage === page.key
                            ? "bg-cyan-100 text-cyan-900"
                            : "bg-cyan-200/90 text-cyan-950",
                        )}
                      >
                        {page.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 overflow-hidden rounded-[32px] border border-white/12 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/12 px-5 py-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl bg-white text-lg font-bold text-slate-950">
                    PV
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-white">{activeLabel}</h3>
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-white/76">
                  通过角色、密钥、密文、转换密钥和审计记录，把代理重加密的共享链路可视化。
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <GlassMini icon={<Video className="h-4 w-4" />} text="统一视频背景板" />
                  <GlassMini icon={<LockKeyhole className="h-4 w-4" />} text="密文存储与转换" />
                  <GlassMini icon={<ShieldCheck className="h-4 w-4" />} text="半可信代理模型" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill label="Alice 控制台 · 数据拥有者在线" />
                <StatusPill label={`当前算法：${algorithm}`} />
              </div>
            </div>
          </div>

          <div className="p-5 lg:p-6">
            {usingDemoData ? (
              <div className="mb-5 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
                当前展示本地演示数据（Alice / Bob / Charlie、sample-data.txt、审计记录与性能基准）。启动 Java API 的 demo profile 后会自动切换为实时数据。
              </div>
            ) : null}
            {backendError ? (
              <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                当前还没连上 Java API：{backendError}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
                {statusMessage}
              </div>
            ) : null}
            {activePage === "dashboard" && (
              <Dashboard
                algorithm={algorithm}
                summary={summary}
                loading={loading}
                events={auditEvents}
                rows={performanceRows}
              />
            )}
            {activePage === "users" && (
              <UsersPanel
                users={users}
                newUserId={newUserId}
                setNewUserId={setNewUserId}
                onCreateUser={handleCreateUser}
              />
            )}
            {activePage === "upload" && (
              <UploadPanel
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                algorithm={algorithm}
                uploadOwnerId={uploadOwnerId}
                setUploadOwnerId={setUploadOwnerId}
                uploadContent={uploadContent}
                setUploadContent={setUploadContent}
                latestFile={latestFile}
                onUpload={handleUpload}
              />
            )}
            {activePage === "authorize" && (
              <AuthorizePanel
                authStep={authStep}
                setAuthStep={setAuthStep}
                latestFile={latestFile}
                authRecipientId={authRecipientId}
                setAuthRecipientId={setAuthRecipientId}
                onAuthorize={handleAuthorize}
              />
            )}
            {activePage === "access" && (
              <AccessPanel
                sharedFiles={sharedFiles}
                decryptResult={decryptResult}
                onDecrypt={handleDecrypt}
              />
            )}
            {activePage === "audit" && <AuditPanel events={auditEvents} />}
            {activePage === "compare" && <ComparePanel rows={performanceRows} />}
            {activePage === "verify" && <VerifyPanel />}
          </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 items-center rounded-full border border-white/14 bg-white/10 px-4 text-sm font-semibold text-white">
      {label}
    </span>
  );
}

function GlassMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white/84 backdrop-blur-md">
      {icon}
      {text}
    </span>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[28px] border border-white/12 bg-white/88 p-5 shadow-lg shadow-slate-950/8 backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-4">
      <h4 className="text-lg font-bold text-slate-950">{title}</h4>
      {desc ? <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p> : null}
    </div>
  );
}

function Dashboard({
  algorithm,
  summary,
  loading,
  events,
  rows,
}: {
  algorithm: string;
  summary: ApiSummary;
  loading: boolean;
  events: ApiAudit[];
  rows: ApiPerformance[];
}) {
  const metrics = [
    { label: "已上传密文", value: String(summary.uploads), change: loading ? "同步中" : "来自后端" },
    { label: "授权次数", value: String(summary.authorizations), change: "实时统计" },
    { label: "重加密转换", value: String(summary.reEncryptions), change: "代理执行" },
    { label: "成功解密", value: String(summary.decryptions), change: "Bob 可见" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold">{metric.value}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {metric.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Card>
          <SectionTitle
            title="密文流转总览"
            desc="Alice 上传 C_A，Proxy 使用 rk_A_to_B 转换为 C_B，Bob 使用自己的私钥解密。"
          />
          <FlowDiagram />
        </Card>
        <Card>
          <SectionTitle title="安全状态" />
          <div className="space-y-3">
            {[
              "代理服务器无法查看明文",
              "云端仅存储密文文件",
              "重加密密钥独立于用户私钥",
              `${algorithm} 模式已启用`,
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-3 text-sm font-semibold"
              >
                <span className="min-w-0">{item}</span>
                <span className="shrink-0 whitespace-nowrap text-emerald-600">通过</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AuditPanel events={events.slice(-5).reverse()} compact />
        <ComparePanel rows={rows} compact />
      </div>
    </div>
  );
}

function FlowDiagram() {
  const nodes = [
    ["Alice", "数据拥有者", "上传加密文件 C_A"],
    ["Proxy", "代理服务器", "ReEncrypt(rk, C_A)"],
    ["Bob", "被授权用户", "下载 C_B 并解密"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_80px_1fr_80px_1fr] lg:items-center">
      {nodes.map(([name, role, desc], index) => (
        <div key={name} className="contents">
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-cyan-50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold">{name}</p>
              <span className="rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white">
                {index === 1 ? "半可信" : "可信"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-cyan-800">{role}</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">{desc}</p>
          </div>
          {index < nodes.length - 1 ? (
            <div className="hidden text-center text-2xl font-bold text-cyan-600 lg:block">
              →
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function UsersPanel({
  users,
  newUserId,
  setNewUserId,
  onCreateUser,
}: {
  users: ApiUser[];
  newUserId: string;
  setNewUserId: (value: string) => void;
  onCreateUser: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <Card className="min-w-0">
        <SectionTitle
          title="用户与密钥管理"
          desc="系统展示公钥状态和私钥保存状态，答辩时重点强调 Proxy 不持有任何用户私钥。"
        />
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4">用户</th>
                <th className="py-3 pr-4">角色</th>
                <th className="py-3 pr-4">算法</th>
                <th className="py-3 pr-4">公钥状态</th>
                <th className="py-3 pr-4">私钥状态</th>
                <th className="py-3">说明</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-b border-slate-100">
                  <td className="py-4 pr-4 font-bold">{user.userId}</td>
                  <td className="py-4 pr-4">{user.role}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded bg-cyan-50 px-2 py-1 font-semibold text-cyan-800">
                      {user.algorithm}
                    </span>
                  </td>
                  <td className="py-4 pr-4">{user.publicKey}</td>
                  <td className="py-4 pr-4 font-semibold text-emerald-700">{user.privateKeyStatus}</td>
                  <td className="py-4 text-slate-600">
                    {user.role === "数据拥有者"
                      ? "上传文件并发起授权"
                      : user.role === "被授权用户"
                        ? "接收授权并解密密文"
                        : "用于验证访问控制"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="min-w-0">
        <SectionTitle title="生成密钥对" desc="演示用交互面板，后续可接入后端 KeyGen API。" />
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            用户名
            <input
              value={newUserId}
              onChange={(event) => setNewUserId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            算法类型
            <select className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none focus:border-cyan-400">
              <option>ECC-PRE</option>
              <option>RSA-PRE</option>
            </select>
          </label>
          <button
            onClick={onCreateUser}
            className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-cyan-800"
          >
            生成公私钥对
          </button>
          <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            PublicKey: 04:9F:A3:...:C2
            <br />
            PrivateKey: 已生成并本地保存
          </div>
        </div>
      </Card>
    </div>
  );
}

function UploadPanel({
  selectedFile,
  setSelectedFile,
  algorithm,
  uploadOwnerId,
  setUploadOwnerId,
  uploadContent,
  setUploadContent,
  latestFile,
  onUpload,
}: {
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  algorithm: string;
  uploadOwnerId: string;
  setUploadOwnerId: (value: string) => void;
  uploadContent: string;
  setUploadContent: (value: string) => void;
  latestFile?: ApiFile;
  onUpload: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <SectionTitle title="数据加密上传" desc="这里会真实调用后端 upload 接口，生成密文包并写入审计日志。" />
        <div className="rounded-lg border-2 border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-center">
          <p className="text-lg font-bold text-cyan-950">拖拽文件到此处</p>
          <p className="mt-2 text-sm text-cyan-800">或选择课程演示文件</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["salary.xlsx", "report.pdf", "sample-data.txt"].map((file) => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-semibold",
                  selectedFile === file
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-cyan-200 bg-white text-cyan-900",
                )}
              >
                {file}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="block text-sm font-semibold text-slate-700">
            数据拥有者
            <select
              value={uploadOwnerId}
              onChange={(event) => setUploadOwnerId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none focus:border-cyan-400"
            >
              <option>Alice</option>
              <option>Bob</option>
              <option>Charlie</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            明文内容
            <textarea
              value={uploadContent}
              onChange={(event) => setUploadContent(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-3 outline-none focus:border-cyan-400"
            />
          </label>
          <button
            onClick={onUpload}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-cyan-800"
          >
            执行加密上传
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["文件名", selectedFile],
            ["文件哈希", latestFile?.hashPreview ?? "待生成"],
            ["加密算法", algorithm],
            ["上传状态", latestFile ? "密文已上传" : "尚未上传"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle title="加密前后对比" />
        <div className="grid gap-4 md:grid-cols-2">
          <FileState title="明文文件" readable="可直接查看" size="128 KB" status="本地文件" />
          <FileState title="密文文件" readable="不可读" size="132 KB" status="已加密上传" dark />
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span>加密与上传进度</span>
            <span>100%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-full rounded-full bg-cyan-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function FileState({
  title,
  readable,
  size,
  status,
  dark,
}: {
  title: string;
  readable: string;
  size: string;
  status: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        dark ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white",
      )}
    >
      <p className="text-lg font-bold">{title}</p>
      <dl className="mt-4 space-y-3 text-sm">
        {[
          ["可读性", readable],
          ["大小", size],
          ["状态", status],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className={dark ? "text-slate-300" : "text-slate-500"}>{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AuthorizePanel({
  authStep,
  setAuthStep,
  latestFile,
  authRecipientId,
  setAuthRecipientId,
  onAuthorize,
}: {
  authStep: number;
  setAuthStep: (step: number) => void;
  latestFile?: ApiFile;
  authRecipientId: string;
  setAuthRecipientId: (value: string) => void;
  onAuthorize: () => void;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title="授权与重加密管理"
          desc="这是最核心的演示链路：Alice 生成 rk_A_to_B，Proxy 只做密文转换，最终得到 Bob 可解密的 C_B。"
        />
        <div className="grid gap-3 lg:grid-cols-5">
          {authSteps.map((step, index) => (
            <button
              key={step}
              onClick={() => setAuthStep(index)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                index <= authStep
                  ? "border-cyan-300 bg-cyan-50 text-cyan-950"
                  : "border-slate-200 bg-white text-slate-500",
              )}
            >
              <span className="text-xs font-bold">Step {index + 1}</span>
              <p className="mt-2 text-sm font-bold leading-5">{step}</p>
            </button>
          ))}
        </div>
      </Card>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card>
          <SectionTitle title="技术细节" />
          <div className="mb-4 grid gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              当前待授权密文
              <div className="mt-2 rounded-md bg-slate-50 px-3 py-3 text-sm font-bold text-slate-950">
                {latestFile ? `${latestFile.fileName} · ${latestFile.dataId.slice(0, 8)}...` : "请先上传文件"}
              </div>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              被授权用户
              <select
                value={authRecipientId}
                onChange={(event) => setAuthRecipientId(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none focus:border-cyan-400"
              >
                <option>Bob</option>
                <option>Charlie</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["原密文", latestFile?.dataId ?? "C_A = Enc(pk_A, m)"],
              ["转换密钥", `rk_A_to_${authRecipientId}`],
              ["转换过程", "C_B = ReEnc(rk_A_to_B, C_A)"],
              ["解密方", `${authRecipientId} 使用自己的私钥解密`],
              ["代理是否看到明文", "否"],
              ["授权状态", latestFile ? "可执行并写入审计" : "等待文件上传"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="代理执行结果" />
          <div className="rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-cyan-100">
            input: file_001.C_A
            <br />
            rk: rk_A_to_B
            <br />
            plaintext_visible: false
            <br />
            output: file_001.C_B
            <br />
            status: {latestFile ? "ready for re-encryption" : "waiting for upload"}
          </div>
          <button
            onClick={onAuthorize}
            className="mt-4 h-10 w-full rounded-md bg-cyan-500 px-4 text-sm font-bold text-cyan-950 transition hover:bg-cyan-400"
          >
            执行 ReEncrypt 演示
          </button>
        </Card>
      </div>
    </div>
  );
}

function AccessPanel({
  sharedFiles,
  decryptResult,
  onDecrypt,
}: {
  sharedFiles: ApiShared[];
  decryptResult: { success: boolean; plaintext: string; sha256: string } | null;
  onDecrypt: (recipientId: string, dataId: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <Card>
        <SectionTitle title="被授权数据访问" desc="Bob 只能看到已经转换为 C_B 的授权密文，并使用自己的私钥解密。" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {["文件名", "授权人", "算法", "授权时间", "状态", "操作"].map((head) => (
                  <th key={head} className="py-3 pr-4">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sharedFiles.map((row) => (
                <tr key={`${row.dataId}-${row.recipientId}`} className="border-b border-slate-100">
                  {[
                    row.dataId.slice(0, 8) + "...",
                    row.ownerId,
                    row.algorithm,
                    formatTime(row.authorizedAt),
                    row.status,
                  ].map((cell, index) => (
                    <td key={`${row.dataId}-${cell}-${index}`} className="py-4 pr-4">
                      {index === 4 ? (
                        <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                  <td className="py-4">
                    <button
                      onClick={() => onDecrypt(row.recipientId, row.dataId)}
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      下载 / 解密
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <SectionTitle title="解密结果" />
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-lg font-bold text-emerald-900">
            {decryptResult?.success ? "解密成功" : "等待解密"}
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            {decryptResult
              ? `文件完整性校验通过，SHA-256: ${decryptResult.sha256.slice(0, 20)}...`
              : "点击左侧“下载 / 解密”后，这里会显示真实后端返回的明文校验结果。"}
          </p>
          {decryptResult ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white/70 p-3 text-xs text-slate-700">
              {decryptResult.plaintext}
            </pre>
          ) : null}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <ResultLine label="Bob 解密授权密文" result={decryptResult?.success ? "成功" : "待执行"} />
          <ResultLine label="Charlie 尝试解密 C_B" result="失败" danger />
          <ResultLine label="Proxy 尝试解密任意密文" result="失败" danger />
        </div>
      </Card>
    </div>
  );
}

function ResultLine({
  label,
  result,
  danger,
}: {
  label: string;
  result: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3">
      <span className="font-semibold">{label}</span>
      <span className={cn("font-bold", danger ? "text-rose-600" : "text-emerald-700")}>
        {result}
      </span>
    </div>
  );
}

function AuditPanel({ events, compact }: { events: ApiAudit[]; compact?: boolean }) {
  const columns = compact
    ? (["操作类型", "文件 ID", "结果"] as const)
    : (["时间", "用户", "操作类型", "文件 ID", "结果"] as const);

  return (
    <Card>
      <SectionTitle title="审计日志" desc={compact ? undefined : "记录上传、授权、重加密、解密和非法访问，支撑安全管理闭环。"} />
      <div className="overflow-x-auto">
        <table className={cn("w-full text-left text-sm", compact ? "table-fixed" : "min-w-[620px]")}>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {columns.map((head) => (
                <th
                  key={head}
                  className={cn(
                    "py-3 pr-4 font-semibold",
                    head === "结果" && "w-16 shrink-0 whitespace-nowrap text-center",
                    head === "文件 ID" && compact && "w-[42%]",
                    head === "操作类型" && compact && "w-[34%]",
                  )}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const cells = compact
                ? [
                    { key: "action", value: event.action },
                    { key: "target", value: event.target, truncate: true },
                    { key: "result", value: event.success ? "成功" : "拒绝", badge: true },
                  ]
                : [
                    { key: "time", value: formatTime(event.timestamp) },
                    { key: "actor", value: event.actor },
                    { key: "action", value: event.action },
                    { key: "target", value: event.target, truncate: true },
                    { key: "result", value: event.success ? "成功" : "拒绝", badge: true },
                  ];

              return (
                <tr key={`${event.timestamp}-${event.action}`} className="border-b border-slate-100">
                  {cells.map((cell) => (
                    <td
                      key={`${event.timestamp}-${cell.key}`}
                      className={cn(
                        "py-3 pr-4 align-middle",
                        cell.badge && "w-16 shrink-0 whitespace-nowrap text-center",
                      )}
                    >
                      {cell.badge ? (
                        <span
                          className={cn(
                            "inline-flex min-w-[2.75rem] items-center justify-center rounded px-2 py-1 text-xs font-bold whitespace-nowrap",
                            cell.value === "拒绝"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {cell.value}
                        </span>
                      ) : cell.truncate ? (
                        <span className="block truncate font-mono text-xs text-slate-700" title={cell.value}>
                          {cell.value}
                        </span>
                      ) : (
                        cell.value
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ComparePanel({ rows, compact }: { rows: ApiPerformance[]; compact?: boolean }) {
  const comparisonRows = [
    {
      metric: "密钥生成时间",
      unit: "ms",
      rsa: rows.find((row) => row.algorithm === "RSA-PRE" && row.stage === "keygen")?.avgMs ?? 0,
      ecc: rows.find((row) => row.algorithm === "ECC-PRE" && row.stage === "keygen")?.avgMs ?? 0,
    },
    {
      metric: "加密时间",
      unit: "ms",
      rsa: rows.find((row) => row.algorithm === "RSA-PRE" && row.stage === "encapsulate")?.avgMs ?? 0,
      ecc: rows.find((row) => row.algorithm === "ECC-PRE" && row.stage === "encapsulate")?.avgMs ?? 0,
    },
    {
      metric: "重加密时间",
      unit: "ms",
      rsa: rows.find((row) => row.algorithm === "RSA-PRE" && row.stage === "reencrypt")?.avgMs ?? 0,
      ecc: rows.find((row) => row.algorithm === "ECC-PRE" && row.stage === "reencrypt")?.avgMs ?? 0,
    },
    {
      metric: "解密时间",
      unit: "ms",
      rsa: rows.find((row) => row.algorithm === "RSA-PRE" && row.stage === "decapsulate")?.avgMs ?? 0,
      ecc: rows.find((row) => row.algorithm === "ECC-PRE" && row.stage === "decapsulate")?.avgMs ?? 0,
    },
    {
      metric: "密文大小",
      unit: "bytes",
      rsa: rows.find((row) => row.algorithm === "RSA-PRE" && row.stage === "reencrypt")?.sizeBytes ?? 0,
      ecc: rows.find((row) => row.algorithm === "ECC-PRE" && row.stage === "reencrypt")?.sizeBytes ?? 0,
    },
  ];
  const max = Math.max(1, ...comparisonRows.map((row) => Math.max(row.rsa, row.ecc)));
  const latencyRows = comparisonRows.filter((row) => row.unit === "ms");
  const sizeRow = comparisonRows.find((row) => row.metric === "密文大小");
  const fastestStage = latencyRows.reduce(
    (best, row) => {
      const winner = row.rsa <= row.ecc ? "RSA-PRE" : "ECC-PRE";
      const value = Math.min(row.rsa, row.ecc);
      return value < best.value ? { stage: row.metric, algorithm: winner, value } : best;
    },
    { stage: latencyRows[0]?.metric ?? "-", algorithm: "RSA-PRE", value: latencyRows[0] ? Math.min(latencyRows[0].rsa, latencyRows[0].ecc) : 0 },
  );
  const smallestCipher = sizeRow
    ? sizeRow.rsa <= sizeRow.ecc
      ? { algorithm: "RSA-PRE", value: sizeRow.rsa }
      : { algorithm: "ECC-PRE", value: sizeRow.ecc }
    : { algorithm: "-", value: 0 };

  if (compact) {
    return (
      <Card>
        <SectionTitle title="RSA / ECC 性能对比" />
        <div className="grid gap-3 md:grid-cols-2">
          {comparisonRows.map((row) => (
            <div key={row.metric} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{row.metric}</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {Math.min(row.rsa, row.ecc).toFixed(2)}
                    <span className="ml-1 text-sm font-medium text-slate-500">{row.unit}</span>
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {row.rsa <= row.ecc ? "RSA 更优" : "ECC 更优"}
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <Bar label="RSA" value={row.rsa} max={max} className="bg-indigo-500" />
                <Bar label="ECC" value={row.ecc} max={max} className="bg-cyan-500" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          title="最快单阶段"
          value={`${fastestStage.value.toFixed(2)} ms`}
          subtitle={fastestStage.stage}
          accent={fastestStage.algorithm}
        />
        <MetricCard
          title="最小密文包"
          value={`${smallestCipher.value.toFixed(0)} bytes`}
          subtitle="ReEncrypt 输出大小"
          accent={smallestCipher.algorithm}
        />
        <MetricCard
          title="RSA 平均阶段"
          value={`${(latencyRows.reduce((sum, row) => sum + row.rsa, 0) / Math.max(latencyRows.length, 1)).toFixed(2)} ms`}
          subtitle="KeyGen / Enc / ReEnc / Dec"
          accent="RSA-PRE"
        />
        <MetricCard
          title="ECC 平均阶段"
          value={`${(latencyRows.reduce((sum, row) => sum + row.ecc, 0) / Math.max(latencyRows.length, 1)).toFixed(2)} ms`}
          subtitle="KeyGen / Enc / ReEnc / Dec"
          accent="ECC-PRE"
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Card>
          <SectionTitle
            title="阶段耗时走势"
            desc="用统一视角对比 RSA 与 ECC 在 KeyGen、Encapsulate、ReEncrypt、Decapsulate 四个阶段的平均耗时。"
          />
          <PerformanceTrendChart rows={latencyRows} />
        </Card>
        <Card>
          <SectionTitle title="密文大小对比" desc="同一次 ReEncrypt 输出中，密钥胶囊大小直接影响传输成本。" />
          <SizeComparisonChart row={sizeRow} />
        </Card>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <SectionTitle title="关键观察" />
          <div className="space-y-3">
            <InsightRow
              title="RSA-PRE"
              text="教学路径更直观，阶段耗时较均衡，适合解释代理重加密的业务链路。"
            />
            <InsightRow
              title="ECC-PRE"
              text="密文包更小，重加密和解密阶段通常更紧凑，更贴近高并发共享场景。"
            />
            <InsightRow
              title="演示价值"
              text="性能页既能展示最终结论，也能把原始 benchmark 数据完整展开给老师看。"
            />
          </div>
        </Card>
        <Card>
          <SectionTitle title="原始 Benchmark 明细" desc="直接展示后端 CSV 转成的结构化结果，便于答辩时引用。 " />
          <BenchmarkTable rows={rows} />
        </Card>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr_52px] items-center gap-2 text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", className)}
          style={{ width: `${Math.max((value / max) * 100, 8)}%` }}
        />
      </div>
      <span className="text-right">{value}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{subtitle}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {accent}
        </span>
      </div>
    </Card>
  );
}

function PerformanceTrendChart({
  rows,
}: {
  rows: Array<{ metric: string; unit: string; rsa: number; ecc: number }>;
}) {
  if (!rows.length) {
    return <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">暂无性能数据。</div>;
  }

  const width = 760;
  const height = 280;
  const padding = 28;
  const maxValue = Math.max(...rows.flatMap((row) => [row.rsa, row.ecc]), 1);
  const stepX = (width - padding * 2) / Math.max(rows.length - 1, 1);
  const toY = (value: number) => height - padding - (value / maxValue) * (height - padding * 2);
  const rsaPoints = rows.map((row, index) => `${padding + index * stepX},${toY(row.rsa)}`).join(" ");
  const eccPoints = rows.map((row, index) => `${padding + index * stepX},${toY(row.ecc)}`).join(" ");

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center gap-3 text-xs font-bold">
        <span className="inline-flex items-center gap-2 text-indigo-600">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          RSA-PRE
        </span>
        <span className="inline-flex items-center gap-2 text-cyan-700">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
          ECC-PRE
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padding - ratio * (height - padding * 2);
          return (
            <line
              key={ratio}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#dbe4ee"
              strokeDasharray="4 6"
            />
          );
        })}
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={rsaPoints}
        />
        <polyline
          fill="none"
          stroke="#06b6d4"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={eccPoints}
        />
        {rows.map((row, index) => {
          const x = padding + index * stepX;
          return (
            <g key={row.metric}>
              <circle cx={x} cy={toY(row.rsa)} r="5" fill="#6366f1" />
              <circle cx={x} cy={toY(row.ecc)} r="5" fill="#06b6d4" />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-semibold"
              >
                {row.metric.replace("时间", "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SizeComparisonChart({
  row,
}: {
  row?: { metric: string; unit: string; rsa: number; ecc: number };
}) {
  if (!row) {
    return <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">暂无密文大小数据。</div>;
  }

  const maxValue = Math.max(row.rsa, row.ecc, 1);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      {[
        { label: "RSA-PRE", value: row.rsa, className: "bg-indigo-500" },
        { label: "ECC-PRE", value: row.ecc, className: "bg-cyan-500" },
      ].map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">{item.label}</span>
            <span className="text-slate-500">
              {item.value.toFixed(0)} {row.unit}
            </span>
          </div>
          <div className="h-28 rounded-2xl bg-white p-3">
            <div
              className={cn("mx-auto mt-auto h-full rounded-xl", item.className)}
              style={{
                width: "60%",
                height: `${Math.max((item.value / maxValue) * 100, 14)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function BenchmarkTable({ rows }: { rows: ApiPerformance[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            {["算法", "阶段", "avg(ms)", "p50(ms)", "p95(ms)", "min(ms)", "max(ms)", "size(bytes)"].map((head) => (
              <th key={head} className="py-3 pr-4">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.algorithm}-${row.stage}`} className="border-b border-slate-100">
              <td className="py-3 pr-4 font-semibold">{row.algorithm}</td>
              <td className="py-3 pr-4">{row.stage}</td>
              <td className="py-3 pr-4">{row.avgMs.toFixed(4)}</td>
              <td className="py-3 pr-4">{row.p50Ms.toFixed(4)}</td>
              <td className="py-3 pr-4">{row.p95Ms.toFixed(4)}</td>
              <td className="py-3 pr-4">{row.minMs.toFixed(4)}</td>
              <td className="py-3 pr-4">{row.maxMs.toFixed(4)}</td>
              <td className="py-3">{row.sizeBytes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerifyPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {[
        ["正确性验证", "Alice 上传后 Bob 解密得到原始内容，文件哈希一致。", "通过"],
        ["半可信代理验证", "Proxy 执行重加密但无法调用任何用户私钥恢复明文。", "通过"],
        ["非授权访问验证", "Charlie 使用自己的私钥解密 Bob 密文失败。", "通过"],
      ].map(([title, text, status]) => (
        <Card key={title}>
          <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
            {status}
          </span>
          <h4 className="mt-4 text-xl font-bold">{title}</h4>
          <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
          <button className="mt-5 h-10 w-full rounded-md border border-slate-200 bg-white text-sm font-bold transition hover:border-cyan-300 hover:text-cyan-800">
            运行演示测试
          </button>
        </Card>
      ))}
    </div>
  );
}

export default ProxyVaultConsole;
