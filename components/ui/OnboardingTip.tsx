"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface OnboardingTipProps {
  /** 引导步骤的唯一 key（与 localStorage 组合使用） */
  stepKey: string;
  /** 提示文字 */
  text: string;
  /** 目标元素选择器（用于定位箭头方向） */
  targetSelector?: string;
  /** 关闭回调 */
  onDismiss: () => void;
  /** 延迟显示（毫秒） */
  delay?: number;
}

const STORAGE_PREFIX = "starmap-onboarding-v1";

/**
 * 引导提示组件：
 * 半透明深色气泡，带三角箭头。
 * 关闭后用 localStorage 记录，不再显示。
 */
export default function OnboardingTip({
  stepKey,
  text,
  targetSelector,
  onDismiss,
  delay = 0,
}: OnboardingTipProps) {
  const [visible, setVisible] = useState(delay === 0);
  const [mounted, setMounted] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // 检查 localStorage 是否已关闭
    try {
      const dismissed = localStorage.getItem(`${STORAGE_PREFIX}-${stepKey}`);
      if (dismissed === "true") {
        onDismiss();
        return;
      }
    } catch {
      // localStorage 不可用时继续显示
    }

    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [stepKey, delay, onDismiss]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}-${stepKey}`, "true");
    } catch {
      // 忽略 localStorage 错误
    }
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  if (!mounted || !visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={tipRef}
      className="fixed left-1/2 top-1/2 z-[90] w-72 -translate-x-1/2 -translate-y-1/2 animate-scale-in rounded-xl border border-node-blue/30 bg-space-800/95 p-4 shadow-2xl backdrop-blur-md md:left-[55%]"
    >
      {/* 三角箭头 */}
      <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-node-blue/30 bg-space-800/95" />

      <p className="text-sm leading-relaxed text-star-white">{text}</p>
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleDismiss}
          className="rounded-lg bg-node-blue/20 px-3 py-1 text-xs font-medium text-node-blue transition-all hover:bg-node-blue/30 active:scale-95"
        >
          知道了
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * 检查某个引导步骤是否已关闭。
 */
export function isOnboardingDismissed(stepKey: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}-${stepKey}`) === "true";
  } catch {
    return false;
  }
}
