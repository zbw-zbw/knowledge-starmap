"use client";

import { useRef } from "react";
import { MIN_TEXT_LENGTH } from "@/lib/constants";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isImporting?: boolean;
}

/**
 * 文本输入区域：textarea + 字符计数 + 提取按钮。
 * 最少 100 字符才允许提交。
 */
export default function TextInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isImporting = false,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const canSubmit = charCount >= MIN_TEXT_LENGTH && !disabled && !isImporting;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isImporting}
          placeholder="粘贴文章、笔记或 Markdown 内容...&#10;AI 将自动提取知识概念和关系"
          className="h-32 w-full resize-none rounded-xl border border-space-500 bg-space-700/60 px-3 py-2.5 text-sm text-star-white placeholder:text-star-dim/60 focus:border-node-blue/50 focus:outline-none focus:ring-1 focus:ring-node-blue/30 disabled:opacity-50"
        />
        <span className="absolute bottom-2 right-3 text-xs text-star-dim/60">
          {charCount} 字
        </span>
      </div>

      {charCount > 0 && charCount < MIN_TEXT_LENGTH && (
        <p className="text-xs text-amber-400/70">
          还需 {MIN_TEXT_LENGTH - charCount} 字才能提取
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-node-blue/90 px-4 py-2.5 text-sm font-medium text-space-900 transition-all hover:bg-node-blue hover:shadow-[0_0_16px_rgba(79,195,247,0.4)] disabled:cursor-not-allowed disabled:bg-space-600 disabled:text-star-dim disabled:shadow-none"
      >
        {isImporting ? "正在提取..." : "✨ 提取知识"}
      </button>
    </div>
  );
}
