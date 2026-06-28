"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import DemoPreview from "@/components/landing/DemoPreview";
import { ArrowRightIcon } from "@/components/ui/Icons";

/**
 * Hero 区块：主标题、副标题、引言、CTA，
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
        <Reveal delay={80}>
          <h1 className="title-glow text-5xl font-bold tracking-wider text-star-white md:text-8xl sm:text-6xl">
            知识星图
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 text-lg text-node-blue md:text-2xl">
            让你的知识像星空一样可见 · 可探索 · 可连接
          </p>
        </Reveal>

        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-star-white/70 md:text-lg">
            你学过的每一个概念，都是宇宙中的一颗星。
            知识星图帮你把它们连成星座。
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-10 flex justify-center">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-xl bg-node-blue px-6 py-3 text-base font-semibold text-space-900 transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_32px_rgba(79,195,247,0.65)] animate-pulse-glow active:scale-95 md:px-8 md:py-3.5 md:text-lg"
            >
              开始探索
              <ArrowRightIcon size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
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
