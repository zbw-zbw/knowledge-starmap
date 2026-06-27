"use client";

import { sampleTexts } from "@/lib/sampleTexts";

interface SampleTextsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

/**
 * 示例文本快速导入：点击后自动填充到 textarea（不自动触发提取）。
 */
export default function SampleTexts({ onSelect, disabled }: SampleTextsProps) {
  return (
    <div>
      <p className="mb-2 text-xs text-star-dim">快速导入示例：</p>
      <div className="flex flex-wrap gap-1.5">
        {sampleTexts.map((sample) => (
          <button
            key={sample.id}
            onClick={() => onSelect(sample.text)}
            disabled={disabled}
            className="rounded-lg border border-space-500 bg-space-600/40 px-2.5 py-1 text-xs text-star-dim transition-all hover:border-node-blue/50 hover:bg-space-600/60 hover:text-star-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sample.title}
          </button>
        ))}
      </div>
    </div>
  );
}
