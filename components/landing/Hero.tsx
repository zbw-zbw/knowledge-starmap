"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import DemoPreview from "@/components/landing/DemoPreview";

/**
 * Hero 区块：主标题、副标题、引言、CTA 与滚动提示，
 * 背景叠加一个 Canvas 力导向图谱预览 + CSS/SVG 绘制的简化星座装饰。
 */
export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pt-20 md:px-8">
      {/* 背景装饰：力导向图谱预览（最底层，位于星座装饰之后） */}
      <DemoPreview />
      {/* 星座装饰：半透明圆点 + 连线 */}
      <Constellation />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="mb-6 text-xs tracking-widest text-star-white/50 md:text-sm">
            ✦ TRAE AI 创造力大赛 · 学习工作赛道
          </p>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="title-glow text-6xl font-bold tracking-wider text-star-white md:text-8xl">
            知识星图
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 text-xl text-node-blue md:text-2xl">
            让你的知识像星空一样可见 · 可探索 · 可连接
          </p>
        </Reveal>

        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-star-white/70 md:text-lg">
            你学过的每一个概念，都是宇宙中的一颗星。
            知识星图帮你把它们连成星座。
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-10 flex justify-center">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-xl bg-node-blue px-8 py-3.5 text-lg font-semibold text-space-900 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_32px_rgba(79,195,247,0.65)] animate-pulse-glow active:scale-95"
            >
              开始探索
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </Reveal>
      </div>

      {/* 向下滚动提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="animate-float flex flex-col items-center gap-1 text-star-white/40">
          <span className="text-xs tracking-wider">向下滚动</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

/** 简化版星座装饰：几个半透明圆点 + 连线，absolute 定位。 */
function Constellation() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1000 600"
    >
      <g stroke="#4fc3f7" strokeWidth="0.8" fill="none">
        <line x1="120" y1="120" x2="240" y2="200" />
        <line x1="240" y1="200" x2="180" y2="320" />
        <line x1="180" y1="320" x2="320" y2="360" />
        <line x1="760" y1="140" x2="860" y2="240" />
        <line x1="860" y1="240" x2="800" y2="380" />
        <line x1="800" y1="380" x2="920" y2="420" />
        <line x1="460" y1="80" x2="540" y2="160" />
      </g>
      <g fill="#e8eaed">
        <circle cx="120" cy="120" r="2.5" />
        <circle cx="240" cy="200" r="3" />
        <circle cx="180" cy="320" r="2.5" />
        <circle cx="320" cy="360" r="2" />
        <circle cx="760" cy="140" r="2.5" />
        <circle cx="860" cy="240" r="3" />
        <circle cx="800" cy="380" r="2.5" />
        <circle cx="920" cy="420" r="2" />
        <circle cx="460" cy="80" r="2.5" />
        <circle cx="540" cy="160" r="2" />
      </g>
    </svg>
  );
}
