"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface OnboardingTipProps {
  /** 引导步骤的唯一 key（与 localStorage 组合使用） */
  stepKey: string;
  /** 提示文字 */
  text: string;
  /** 目标元素选择器：气泡将定位到该元素旁边。未提供时居中显示 */
  targetSelector?: string;
  /** 关闭回调 */
  onDismiss: () => void;
  /** 延迟显示（毫秒） */
  delay?: number;
}

const STORAGE_PREFIX = "starmap-onboarding-v1";

interface TipPosition {
  left: number;
  top: number;
  arrowSide: "left" | "right" | "top" | "bottom";
}

/**
 * 引导提示组件：
 * - 提供 targetSelector 时，气泡定位到目标元素旁边（自动选择最佳方向）
 * - 未提供时居中显示
 * - 关闭后用 localStorage 记录，不再显示
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
  const [position, setPosition] = useState<TipPosition | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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

  // 计算气泡位置（定位到目标元素旁边）
  useLayoutEffect(() => {
    if (!visible || !targetSelector) {
      setPosition(null);
      return;
    }

    const computePosition = () => {
      const target = document.querySelector(targetSelector);
      if (!target) {
        setPosition(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const tipW = 288; // w-72 = 18rem = 288px
      const tipH = 100; // 估算高度
      const gap = 12;

      // 优先放在右侧，其次左侧，再次上方，最后下方
      let arrowSide: TipPosition["arrowSide"] = "left";
      let left: number;
      let top: number;

      if (rect.right + gap + tipW < window.innerWidth) {
        // 右侧
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - tipH / 2;
        arrowSide = "left";
      } else if (rect.left - gap - tipW > 0) {
        // 左侧
        left = rect.left - gap - tipW;
        top = rect.top + rect.height / 2 - tipH / 2;
        arrowSide = "right";
      } else if (rect.top - gap - tipH > 0) {
        // 上方
        left = rect.left + rect.width / 2 - tipW / 2;
        top = rect.top - gap - tipH;
        arrowSide = "bottom";
      } else {
        // 下方
        left = rect.left + rect.width / 2 - tipW / 2;
        top = rect.bottom + gap;
        arrowSide = "top";
      }

      // 边界保护
      left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tipH - 8));

      setPosition({ left, top, arrowSide });
    };

    computePosition();
    // 监听窗口变化重新定位
    window.addEventListener("resize", computePosition);
    const interval = setInterval(computePosition, 1000); // 目标元素可能延迟出现
    return () => {
      window.removeEventListener("resize", computePosition);
      clearInterval(interval);
    };
  }, [visible, targetSelector]);

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

  // 箭头样式映射
  const arrowClasses: Record<TipPosition["arrowSide"], string> = {
    left: "absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-node-blue/30 bg-space-800/95",
    right:
      "absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-t border-r border-node-blue/30 bg-space-800/95",
    top: "absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-node-blue/30 bg-space-800/95",
    bottom:
      "absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-node-blue/30 bg-space-800/95",
  };

  const pos = position
    ? { left: `${position.left}px`, top: `${position.top}px` }
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return createPortal(
    <div
      ref={tipRef}
      className={`fixed z-[90] w-72 animate-scale-in rounded-xl border border-node-blue/30 bg-space-800/95 p-4 shadow-2xl backdrop-blur-md`}
      style={pos}
    >
      {position && (
        <div className={arrowClasses[position.arrowSide]} />
      )}
      {!position && (
        <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-node-blue/30 bg-space-800/95" />
      )}

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
