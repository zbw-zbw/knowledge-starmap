"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { WarningIcon } from "@/components/ui/Icons";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 确认对话框组件：
 * 使用 Portal 渲染到 body，半透明遮罩 + 居中卡片。
 * 用于危险操作前的二次确认（如清空图谱）。
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-space-900/80 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-space-800 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <WarningIcon size={20} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-star-white">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-star-dim">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-space-500 px-4 py-2.5 text-sm whitespace-nowrap font-medium text-star-white transition-all hover:bg-space-700/60 active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm whitespace-nowrap font-medium text-white transition-all hover:bg-red-500 active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * useConfirmDialog hook：
 * 管理 ConfirmDialog 的状态，返回 { dialog, requestConfirm }。
 * 用法：
 *   const { dialog, requestConfirm } = useConfirmDialog();
 *   requestConfirm({ title, message }, () => doSomething());
 *   // 在 JSX 中渲染 {dialog}
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }>({ title: "", message: "" });
  const callbackRef = useRef<(() => void) | null>(null);

  const requestConfirm = useCallback(
    (
      options: { title: string; message: string; confirmText?: string; cancelText?: string },
      onConfirm: () => void
    ) => {
      setConfig(options);
      callbackRef.current = onConfirm;
      setIsOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(() => {
    callbackRef.current?.();
    callbackRef.current = null;
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    callbackRef.current = null;
    setIsOpen(false);
  }, []);

  const dialog = (
    <ConfirmDialog
      isOpen={isOpen}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { dialog, requestConfirm };
}
