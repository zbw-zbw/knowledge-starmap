"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, CheckIcon } from "@/components/ui/Icons";

interface EditEdgeModalProps {
  /** 是否显示 */
  open: boolean;
  /** 当前关系描述 */
  currentRelation: string;
  /** 源节点名称 */
  sourceLabel: string;
  /** 目标节点名称 */
  targetLabel: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调 */
  onConfirm: (newRelation: string) => void;
}

const COMMON_RELATIONS = [
  "包含",
  "依赖",
  "关联",
  "属于",
  "实现",
  "继承",
  "引用",
  "扩展",
  "基于",
  "类似",
];

/**
 * 边关系编辑弹窗：
 * 替代原生 prompt()，提供与深空主题一致的内联编辑体验。
 * 支持快捷选择常用关系类型 + 自定义输入。
 */
export default function EditEdgeModal({
  open,
  currentRelation,
  sourceLabel,
  targetLabel,
  onClose,
  onConfirm,
}: EditEdgeModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(currentRelation);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentRelation]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onConfirm(value.trim());
    }
  }, [value, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-space-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-space-500/50 bg-space-800 p-5 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-star-white">编辑关系</h3>
          <button
            onClick={onClose}
            className="text-star-dim transition-colors hover:text-star-white"
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* 连线信息 */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-space-700/40 px-3 py-2">
          <span className="truncate text-sm text-star-white">{sourceLabel}</span>
          <span className="shrink-0 text-star-dim">→</span>
          <span className="truncate text-sm text-star-white">{targetLabel}</span>
        </div>

        {/* 关系输入 */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-star-dim">
            关系描述
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关系描述..."
            className="w-full rounded-lg border border-space-500 bg-space-700 px-3 py-2 text-sm text-star-white placeholder:text-star-dim/50 outline-none focus:border-node-blue/60 focus:ring-1 focus:ring-node-blue/20"
          />
        </div>

        {/* 快捷选择 */}
        <div className="mb-5">
          <div className="mb-1.5 text-xs text-star-dim/60">常用关系</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_RELATIONS.map((rel) => (
              <button
                key={rel}
                onClick={() => setValue(rel)}
                className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                  value === rel
                    ? "bg-node-blue/30 text-node-blue ring-1 ring-node-blue/40"
                    : "bg-space-700/50 text-star-dim hover:bg-space-600/50 hover:text-star-white"
                }`}
              >
                {rel}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-space-500 px-4 py-2 text-sm whitespace-nowrap text-star-dim transition-all hover:border-space-400 hover:text-star-white active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-node-blue/90 px-4 py-2 text-sm whitespace-nowrap font-medium text-space-900 transition-all hover:bg-node-blue hover:shadow-[0_0_16px_rgba(79,195,247,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckIcon size={16} />
            保存
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-star-dim/40">
          Enter 确认 · Esc 关闭
        </p>
      </div>
    </div>,
    document.body
  );
}
