"use client";

import Reveal from "@/components/ui/Reveal";
import { HOW_IT_WORKS } from "@/lib/constants";

/**
 * 使用流程区块：横向三步（移动端纵向），步骤之间用虚线箭头连接。
 */
export default function HowItWorks() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-star-white md:text-4xl">
            三步开始你的知识宇宙
          </h2>
        </Reveal>

        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between md:gap-2">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className="contents">
              <Reveal
                delay={i * 140}
                className="flex w-full max-w-xs flex-col items-center text-center md:w-auto md:flex-1"
              >
                {/* 圆形数字标识 */}
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-node-blue text-xl font-bold text-node-blue">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-star-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-star-dim">
                  {item.desc}
                </p>
              </Reveal>

              {/* 步骤之间的虚线箭头（最后一步不显示） */}
              {i < HOW_IT_WORKS.length - 1 && <DashedArrow />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 虚线箭头：移动端纵向，桌面端横向。 */
function DashedArrow() {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center text-node-blue/60"
    >
      {/* 移动端：纵向虚线 + 向下箭头 */}
      <div className="flex flex-col items-center py-1 md:hidden">
        <span className="h-10 border-l border-dashed border-node-blue/40" />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 桌面端：横向虚线 + 向右箭头 */}
      <div className="hidden items-center md:flex">
        <span className="w-10 border-t border-dashed border-node-blue/40 lg:w-16" />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
