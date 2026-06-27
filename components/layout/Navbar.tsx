"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

/**
 * 顶部导航栏：固定顶部、半透明深色背景 + backdrop-blur。
 * 滚动时增加阴影。左侧品牌点击回首页，右侧含锚点链接与 CTA 按钮。
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-space-500/60 bg-space-900/70 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent backdrop-blur-md"
      }`}
    >
      <nav className="mx-auto flex h-14 items-center justify-between px-4 md:h-16 md:px-8">
        {/* 品牌 */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-star-white transition-colors hover:text-node-blue"
          aria-label="返回知识星图首页"
        >
          <span className="text-xl text-node-blue transition-transform duration-300 group-hover:scale-110">
            ✦
          </span>
          <span className="hidden text-base font-semibold tracking-wide sm:inline">
            知识星图
          </span>
        </Link>

        {/* 右侧操作 */}
        <div className="flex items-center gap-3 md:gap-6">
          <a
            href="#features"
            className="hidden text-sm text-star-dim transition-colors hover:text-star-white md:inline"
          >
            功能介绍
          </a>
          <Button href="/app" size="sm" className="animate-pulse-glow">
            开始探索
          </Button>
        </div>
      </nav>
    </header>
  );
}
