"use client";

import Reveal from "@/components/ui/Reveal";
import { FEATURES, FEATURE_COLOR_MAP } from "@/lib/constants";

/**
 * 功能区块（id="features" 用于锚点导航）：
 * 2x2 网格，每张卡片左侧 3px 彩色竖线，hover 时竖线发光扩散。
 */
export default function Features() {
  return (
    <section id="features" className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-star-white md:text-4xl">
            四大核心能力
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((feature, i) => {
            const accent = FEATURE_COLOR_MAP[feature.color];
            return (
              <Reveal key={feature.title} delay={i * 100}>
                <article
                  className="group relative h-full overflow-hidden rounded-2xl border border-space-500 bg-space-700/80 p-8 transition-all duration-300 hover:border-node-blue/40 active:scale-95"
                >
                  {/* 左侧彩色竖线，hover 时发光扩散 */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-[3px] transition-all duration-300 group-hover:shadow-[0_0_16px_var(--accent)]"
                    style={
                      {
                        backgroundColor: accent,
                        ["--accent" as string]: accent,
                      } as React.CSSProperties
                    }
                  />

                  <div className="text-4xl">{feature.icon}</div>
                  <h3 className="mt-5 text-xl font-semibold text-star-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-star-dim">
                    {feature.desc}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
