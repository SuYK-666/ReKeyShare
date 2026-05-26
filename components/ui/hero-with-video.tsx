"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

import VideoBackdrop from "@/components/ui/video-backdrop";

type HeroWithVideoProps = {
  brandName?: string;
  heroTitle?: string;
  heroDescription?: string;
  videoUrl?: string;
  backgroundImage?: string;
};

export default function HeroWithVideo({
  heroTitle = "代理重加密数据安全演示系统",
  heroDescription = "用可视化方式展示加密上传、授权转换、授权解密与非法访问失败的完整流程。",
  videoUrl,
  backgroundImage,
}: HeroWithVideoProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#091523] text-white">
      <VideoBackdrop
        videoUrl={videoUrl}
        poster={backgroundImage}
        overlayClassName="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_24%),linear-gradient(180deg,rgba(5,17,30,0.28),rgba(5,17,30,0.88))]"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <section className="flex flex-1 items-center py-12 sm:py-16 lg:py-20">
          <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-cyan-200/92">
                Proxy Re-Encryption
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                {heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/76 sm:text-lg">
                {heroDescription}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/console"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-100"
                >
                  开始体验
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <FeatureCard
                icon={<LockKeyhole className="h-5 w-5" />}
                title="密文直传"
                text="数据拥有者上传的始终是加密内容，云端只负责存储和转换。"
              />
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="半可信代理"
                text="代理服务器仅持有重加密密钥，不接触任何用户私钥与明文。"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/14 bg-white/10 p-5 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-white/14 text-cyan-100">
          {icon}
        </div>
        <p className="text-lg font-semibold text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-white/72">{text}</p>
    </div>
  );
}
