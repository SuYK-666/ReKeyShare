import {
  ArrowRight,
  Boxes,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Network,
  RotateCcwKey,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import FlowLines from "@/components/ui/flow-lines";
import VideoBackdrop from "@/components/ui/video-backdrop";

const innovations = [
  {
    title: "策略绑定转换证明",
    text: "把 tenant、dataId、grantId、policyHash、keyVersion 写入可验证 proof。",
    href: "/console?view=proof",
    badge: "backend",
    icon: FileCheck2,
  },
  {
    title: "重启后仍成立的撤销语义",
    text: "撤销和密钥轮换会让旧共享包失效，并进入审计证据链。",
    href: "/console?view=revocation",
    badge: "local",
    icon: RotateCcwKey,
  },
  {
    title: "租户级对象授权闭环",
    text: "跨租户探测对外不可区分，对内记录 TENANT_MISMATCH。",
    href: "/console?view=attack",
    badge: "backend",
    icon: ShieldCheck,
  },
  {
    title: "代理机器身份治理",
    text: "代理节点受 fingerprint、tenant scope、scheme allowlist 与 quota 约束。",
    href: "/console?view=proxy",
    badge: "backend",
    icon: Fingerprint,
  },
  {
    title: "可验证共享包与审计链",
    text: "共享包可追踪 manifest、AAD、capsule、proof 与 auditEventId。",
    href: "/console?view=packages",
    badge: "backend",
    icon: Boxes,
  },
  {
    title: "Threshold 与攻击证据工程化",
    text: "攻击矩阵、CI、benchmark 与 checksum 汇总到证据中心。",
    href: "/console?view=evidence",
    badge: "artifact",
    icon: Network,
  },
];

const flow = ["Owner Client", "ReKeyShare API", "Ciphertext Store", "Registered Proxy", "Shared Package", "Recipient Client", "Audit Verifier"];

const flowDesc = [
  "本地生成 content key、nonce、AAD 与 manifest。",
  "接收密文包和授权元数据，不接触明文。",
  "保存 ciphertext、capsule、manifestHash 与 objectVersion。",
  "按机器身份、quota 与策略绑定证明执行转换。",
  "输出可验证共享包，绑定 grant 和 proof。",
  "先验证 package/proof/AAD，再本地解密。",
  "校验 hash-chain、checkpoint 与攻击失败证据。",
];

const flowTag = ["client boundary", "client boundary", "semi-trusted", "semi-trusted", "semi-trusted", "verifier", "verifier"];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#081421] text-[#E5E7EB]">
      <VideoBackdrop
        overlayClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(5,17,30,0.36),rgba(5,17,30,0.88))]"
      />
      <FlowLines />

      <div className="relative z-10">
        {/* Hero */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-5 pb-12 pt-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-md">
                <KeyRound className="h-4 w-4" />
                ReKeyShare 证据化安全共享控制台
              </div>
              <h1 className="font-display mt-8 max-w-4xl text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
                ReKeyShare
                <span className="mt-3 block text-3xl font-bold text-white/65 md:text-4xl">
                  基于代理重加密的数据安全共享管理系统
                </span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
                面向半可信云存储与代理节点的可验证密文共享管理系统，支持客户端加密、对象级授权、代理转换、撤销轮换、多租户隔离与可验证审计。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/console"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.18)] transition hover:bg-white/88"
                >
                  进入运行控制台
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#architecture"
                  className="inline-flex h-12 items-center rounded-xl border border-white/15 bg-white/8 px-5 text-sm font-bold text-white transition hover:bg-white/12"
                >
                  查看系统架构
                </a>
                <Link
                  href="/console?view=evidence"
                  className="inline-flex h-12 items-center rounded-xl border border-white/12 bg-white/6 px-5 text-sm font-bold text-white/80 transition hover:bg-white/10"
                >
                  查看安全证据
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold">
                {["CI verified", "Coverage", "SBOM", "Attack matrix", "Audit chain"].map((item) => (
                  <span key={item} className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-white/65">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div id="architecture" className="rounded-2xl border border-white/14 bg-[#0b1929]/72 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white/50">安全边界架构</p>
                  <h2 className="font-display text-2xl font-black text-white">服务端只托管密文、元数据与证明</h2>
                </div>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/65">no plaintext on server</span>
              </div>
              <div className="grid gap-3">
                {flow.map((item, index) => (
                  <div key={item} className="grid grid-cols-[34px_1fr] items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-white">{item}</p>
                        <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-xs font-bold text-white/60">
                          {flowTag[index]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/54">{flowDesc[index]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Innovations */}
        <section className="mx-auto max-w-7xl px-5 py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white/50">创新点</p>
              <h2 className="font-display mt-2 text-3xl font-black text-white">可复核的 6 个安全验证入口</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/54">
              每张卡片都对应控制台页面和证据类型，展示 ReKeyShare 不是普通文件分享，而是带证明、撤销和审计的安全闭环。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {innovations.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-white/12 bg-[#0b1929]/72 p-5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/22"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-xs font-bold text-white/54">{item.badge}</span>
                  </div>
                  <h3 className="font-display mt-5 text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 min-h-16 text-sm leading-6 text-white/54">{item.text}</p>
                  <p className="mt-5 text-sm font-bold text-white/65 transition group-hover:text-white">查看详情 →</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
