import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proxy Re-Encryption Demo",
  description: "A welcome screen for the proxy re-encryption course project.",
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
