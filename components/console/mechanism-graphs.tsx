"use client";

import { ArrowRight, CheckCircle2, Link2, LockKeyhole, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const flow = [
  "Owner local content",
  "local AES-GCM",
  "ciphertext + AAD + capsule",
  "backend storage",
  "proxy transform",
  "recipient package",
  "local decrypt",
];

const proof = [
  "tenantId",
  "dataId",
  "grantId",
  "recipientId",
  "packageId",
  "policyHash",
  "proxyId",
  "keyEpoch",
  "canonicalPayloadHash",
  "signature",
  "single-use verify",
];

const revoke = ["grant active", "package issued", "proof consumed", "revoke", "keyEpoch++", "old package denied", "new package issued"];

const attackRows = [
  ["tenant boundary", "compound identifier + canonical AAD"],
  ["stable error", "external code masking + internal audit reason"],
  ["proof replay", "durable replay store + nonce key"],
  ["proxy admission", "fingerprint + scheme allowlist + quota"],
  ["tamper proof", "policyHash + manifest hash + audit chain"],
];

export function MechanismGraphs() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <GraphCard title="密钥与密文流转图" icon={<LockKeyhole className="h-5 w-5" />}>
        <StepFlow items={flow} />
      </GraphCard>
      <GraphCard title="Policy-bound proof 绑定图" icon={<CheckCircle2 className="h-5 w-5" />}>
        <StepFlow items={proof} compact />
      </GraphCard>
      <GraphCard title="撤销轮换时间轴" icon={<Link2 className="h-5 w-5" />}>
        <StepFlow items={revoke} />
      </GraphCard>
      <GraphCard title="攻击阻断矩阵图" icon={<ShieldAlert className="h-5 w-5" />}>
        <div className="grid gap-2">
          {attackRows.map(([left, right]) => (
            <div key={left} className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[150px_1fr]">
              <span className="font-mono text-xs font-black text-red-100">{left}</span>
              <span className="text-sm font-semibold text-slate-300">{right}</span>
            </div>
          ))}
        </div>
      </GraphCard>
    </div>
  );
}

function GraphCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-100">{icon}</div>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StepFlow({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => (
        <div key={item} className="flex items-center gap-2">
          <div className={cn("rounded-xl border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 font-semibold text-cyan-50", compact ? "text-xs" : "text-sm")}>{item}</div>
          {index < items.length - 1 ? <ArrowRight className="h-4 w-4 text-slate-500" /> : null}
        </div>
      ))}
    </div>
  );
}
