"use client";

import Card from "@/components/ui/Card";
import Reveal from "@/components/ui/Reveal";
import { ICON_MAP } from "@/components/ui/Icons";
import { PAIN_POINTS } from "@/lib/constants";

/**
 * 痛点区块：三列卡片，揭示知识管理的困境。
 */
export default function PainPoints() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-star-white md:text-4xl">
            知识的困境
          </h2>
          <p className="mt-4 text-base text-star-dim md:text-lg">
            你学了很多，但从来看不见自己的知识全貌
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <Reveal key={point.title} delay={i * 120}>
              <Card className="h-full p-8 active:scale-95">
                <div className="flex items-center justify-center">
                  {(() => {
                    const Icon = ICON_MAP[point.icon];
                    return <Icon size={48} className="text-node-blue" />;
                  })()}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-star-white">
                  {point.title}
                </h3>
                <p className="mt-3 leading-relaxed text-star-dim">
                  {point.desc}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
