"use client";

import { useEffect, useState } from "react";

interface ImportProgressProps {
  isVisible: boolean;
}

const STATUS_MESSAGES = [
  "正在分析文本...",
  "正在提取知识概念...",
  "正在发现概念关系...",
  "正在更新星图...",
];

/**
 * 导入进度组件：旋转星图图标 + 滚动状态文字。
 * 覆盖在导入区域上方，半透明遮罩。
 */
export default function ImportProgress({ isVisible }: ImportProgressProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-space-900/80 backdrop-blur-sm">
      {/* 旋转星图图标 */}
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-node-blue border-r-node-blue/40" />
        <div className="absolute inset-2 flex items-center justify-center text-2xl text-node-blue">
          ✦
        </div>
      </div>
      <p className="mt-4 animate-pulse text-sm font-medium text-star-white">
        {STATUS_MESSAGES[messageIndex]}
      </p>
      <p className="mt-1 text-xs text-star-dim">AI 正在解析你的知识</p>
    </div>
  );
}
