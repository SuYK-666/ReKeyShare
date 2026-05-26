"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type VideoBackdropProps = {
  className?: string;
  fixed?: boolean;
  overlayClassName?: string;
  poster?: string;
  videoUrl?: string;
};

export default function VideoBackdrop({
  className,
  fixed = false,
  overlayClassName,
  poster = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2072&q=80",
  videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
}: VideoBackdropProps) {
  return (
    <div className={cn(fixed ? "fixed inset-0" : "absolute inset-0", "overflow-hidden", className)}>
      <Image
        src={poster}
        alt=""
        fill
        unoptimized
        className="object-cover"
      />
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={poster}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div
        className={cn(
          "absolute inset-0 bg-[linear-gradient(180deg,rgba(4,20,34,0.22),rgba(4,20,34,0.82))]",
          overlayClassName,
        )}
      />
    </div>
  );
}
