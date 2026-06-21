import { ArrowRight } from "lucide-react";
import Link from "next/link";

import FlowLines from "@/components/ui/flow-lines";
import VideoBackdrop from "@/components/ui/video-backdrop";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#081421] text-[#E5E7EB]">
      <VideoBackdrop
        overlayClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(5,17,30,0.36),rgba(5,17,30,0.88))]"
      />
      <FlowLines />

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <section className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="font-display text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
            ReKeyShare
            <span className="mt-3 block text-3xl font-bold text-white/65 md:text-4xl">
              基于代理重加密的数据安全共享管理系统
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-white/65">
            面向半可信云存储与代理节点的可验证密文共享管理系统，支持客户端加密、对象级授权、代理转换、撤销轮换、多租户隔离与可验证审计。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/console"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.18)] transition hover:bg-white/88"
            >
              进入运行控制台
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
