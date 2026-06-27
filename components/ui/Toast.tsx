"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-green-500/15",
    border: "border-green-400/40",
    icon: "✓",
  },
  error: {
    bg: "bg-red-500/15",
    border: "border-red-400/40",
    icon: "⚠",
  },
  info: {
    bg: "bg-blue-500/15",
    border: "border-blue-400/40",
    icon: "ℹ",
  },
};

/**
 * Toast 轻提示组件：
 * 使用 portal 渲染到 document.body，固定页面顶部居中。
 * 支持 success / error / info 三种类型，3 秒自动消失。
 * 使用 mounted 状态避免 SSR hydration 不匹配。
 */
function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed left-1/2 top-20 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border ${style.border} ${style.bg} px-4 py-2.5 backdrop-blur-md shadow-lg animate-slide-in-top`}
          >
            <span className="text-sm font-medium">{style.icon}</span>
            <span className="text-sm text-star-white">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 text-star-dim/60 transition-colors hover:text-star-white"
              aria-label="关闭提示"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

/**
 * useToast hook：管理 Toast 队列。
 * 返回 { toasts, showToast, dismissToast }。
 * showToast(message, type?) 自动 3 秒后消失。
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, 3000);
    },
    [dismissToast]
  );

  // 清理所有定时器
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return { toasts, showToast, dismissToast };
}

export { ToastContainer };
