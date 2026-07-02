"use client";

import { useEffect, useState, useCallback, createContext, useContext, useMemo, useRef } from "react";
import {
  CheckIcon,
  WarningIcon,
  InfoIcon,
  CloseIcon,
} from "@/components/ui/Icons";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * 轻量级 Toast 系统：
 * - 最多同时显示 3 个 Toast，超出时自动移除最早的
 * - 自动消失（success 3s / error 4s / info 3s）
 * - 鼠标悬停暂停计时器
 * - 右下角堆叠显示
 * - 入场使用 slideInRight 动画
 * - 同时支持 hook 模式（useToast）和全局函数（showToast）
 */
const MAX_TOASTS = 3;
const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  error: 4000,
  info: 3000,
};

const TOAST_EVENT = "knowledge-starmap:toast";

/** 全局函数：dispatch CustomEvent 触发 toast */
export function showToast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { message, type },
    })
  );
}

interface UseToastReturn {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

/**
 * Hook 模式：在调用方组件里维护 toasts 状态，
 * 与 <ToastContainer toasts onDismiss /> 配对使用。
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToastFn = useCallback((message: string, type: ToastType = "info") => {
    idRef.current += 1;
    const id = `t-${idRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      if (next.length > MAX_TOASTS) {
        return next.slice(next.length - MAX_TOASTS);
      }
      return next;
    });
    if (type === "error") {
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS.error);
    } else if (type === "success") {
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS.success);
    } else {
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS.info);
    }
  }, [dismissToast]);

  return { toasts, showToast: showToastFn, dismissToast };
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/** 命名导出：与 default 导出指向同一个实现 */
export const ToastContainer = ToastContainerWrapper;

/**
 * Toast 容器：右下角堆叠显示，支持 hover 暂停计时器。
 * 可由 useToast() 配合使用，也可独立监听全局 TOAST_EVENT。
 */
export default function ToastContainerWrapper(props: ToastContainerProps) {
  return <ToastContainerImpl {...props} />;
}

function ToastContainerImpl({ toasts, onDismiss }: ToastContainerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 当父组件传 toasts 时使用 prop；否则监听全局事件（自包含模式）
  const [localToasts, setLocalToasts] = useState<ToastItem[]>([]);
  const localIdRef = useRef(0);
  const removeLocal = useCallback((id: string) => {
    setLocalToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      if (!detail?.message) return;
      localIdRef.current += 1;
      const id = `g-${localIdRef.current}`;
      setLocalToasts((prev) => {
        const next = [...prev, { id, message: detail.message, type: detail.type }];
        if (next.length > MAX_TOASTS) {
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  // 自动消失（仅在自包含模式下使用定时器）
  useEffect(() => {
    if (toasts.length > 0) return; // hook 模式由父组件控制
    if (localToasts.length === 0) return;
    const timers = localToasts
      .filter((t) => t.id !== hoveredId)
      .map((t) => setTimeout(() => removeLocal(t.id), AUTO_DISMISS_MS[t.type]));
    return () => timers.forEach(clearTimeout);
  }, [localToasts, hoveredId, removeLocal, toasts.length]);

  const items = toasts.length > 0 ? toasts : localToasts;
  const dismiss = toasts.length > 0 ? onDismiss : removeLocal;

  if (items.length === 0) return null;

  // 颜色映射
  const typeStyles: Record<
    ToastType,
    { border: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    success: {
      border: "border-node-green/60",
      bg: "bg-node-green/15",
      text: "text-node-green",
      icon: <CheckIcon size={16} className="text-node-green" />,
    },
    error: {
      border: "border-red-400/60",
      bg: "bg-red-400/15",
      text: "text-red-300",
      icon: <WarningIcon size={16} className="text-red-300" />,
    },
    info: {
      border: "border-node-blue/60",
      bg: "bg-node-blue/15",
      text: "text-node-blue",
      icon: <InfoIcon size={16} className="text-node-blue" />,
    },
  };

  return (
    <div
      className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col-reverse gap-2 md:bottom-4"
      role="status"
      aria-live="polite"
    >
      {items.map((toast) => {
        const style = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            onMouseEnter={() => setHoveredId(toast.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2 shadow-xl backdrop-blur-md transition-all`}
            style={{ animation: "slideInRight 250ms ease-out" }}
          >
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <span className={`flex-1 text-sm leading-snug ${style.text}`}>
              {toast.message}
            </span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded p-0.5 text-star-dim/40 transition-colors hover:bg-space-700/40 hover:text-star-white"
              aria-label="关闭通知"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

