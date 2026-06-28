import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Starfield from "@/components/layout/Starfield";

export const metadata: Metadata = {
  title: "知识星图 — AI知识图谱可视化工具",
  description:
    "让你的知识像星空一样可见、可探索、可连接。AI自动从笔记和文章中提取概念关系，生成可交互的力导向知识图谱。",
  keywords: [
    "知识图谱",
    "AI",
    "知识管理",
    "可视化",
    "笔记工具",
    "力导向图",
    "DeepSeek",
  ],
  authors: [{ name: "知识星图" }],
  openGraph: {
    title: "知识星图 — AI知识图谱可视化工具",
    description: "让你的知识像星空一样可见、可探索、可连接",
    type: "website",
    locale: "zh_CN",
    siteName: "知识星图",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "知识星图 — AI知识图谱可视化工具",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "知识星图 — AI知识图谱可视化工具",
    description: "让你的知识像星空一样可见、可探索、可连接",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.jpg", type: "image/jpeg" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#050816",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        {/* 固定星空背景层 */}
        <Starfield />

        {/* 顶部导航 */}
        <Navbar />

        {/* 内容区位于星空之上 */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
