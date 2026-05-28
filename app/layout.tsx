import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReKeyShare：基于代理重加密的数据安全共享管理系统",
  description:
    "ReKeyShare 控制台展示客户端加密、对象级授权、代理治理、撤销轮换、审计链和安全证据闭环。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
