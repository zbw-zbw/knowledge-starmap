"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { NodeGroup } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { CloseIcon, CheckIcon } from "@/components/ui/Icons";

interface CreateNodeModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 创建回调 */
  onCreate: (data: { label: string; description?: string; group: NodeGroup }) => void;
}

const GROUP_OPTIONS: NodeGroup[] = ["frontend", "backend", "pattern", "engineering", "general"];

/**
 * 手动创建节点弹窗：
 * 双击空白区域时弹出，填写名称、描述、领域后创建新节点。
 */
export default function CreateNodeModal({ open, onClose, onCreate }: CreateNodeModalProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState<NodeGroup>("general");
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦输入框并重置表单
  useEffect(() => {
    if (open) {
      setLabel("");
      setDescription("");
      setGroup("general");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(() => {
    if (!label.trim()) return;
    onCreate({
      label: label.trim(),
      description: description.trim() || undefined,
      group,
    });
  }, [label, description, group, onCreate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
        onKeyDown={handleKeyDown}
      >
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-star-white">
            创建新节点
          </h3>
          <button
            onClick={onClose}
            className="text-star-dim transition-colors hover:text-star-white"
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* 名称输入 */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-star-dim">
            名称 <span className="text-red-400">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="输入概念名称..."
            className="w-full rounded-lg border border-space-500 bg-space-700 px-3 py-2 text-sm text-star-white placeholder:text-star-dim/50 outline-none focus:border-node-blue/60 focus:ring-1 focus:ring-node-blue/20"
          />
        </div>

        {/* 描述输入 */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-star-dim">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选：添加简要描述..."
            rows={3}
            className="w-full resize-none rounded-lg border border-space-500 bg-space-700 px-3 py-2 text-sm text-star-white placeholder:text-star-dim/50 outline-none focus:border-node-blue/60 focus:ring-1 focus:ring-node-blue/20"
          />
        </div>

        {/* 领域选择 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-star-dim">
            所属领域
          </label>
          <div className="flex flex-wrap gap-1.5">
            {GROUP_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  group === g
                    ? "ring-1 ring-offset-1 ring-offset-space-800"
                    : "opacity-60 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: `${GROUP_COLORS[g]}20`,
                  color: GROUP_COLORS[g],
                  ...(group === g ? { ringColor: GROUP_COLORS[g] } : {}),
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: GROUP_COLORS[g] }}
                />
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-space-500 px-4 py-2 text-sm text-star-dim transition-all hover:border-space-400 hover:text-star-white active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!label.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-node-blue/90 px-4 py-2 text-sm font-medium text-space-900 transition-all hover:bg-node-blue hover:shadow-[0_0_16px_rgba(79,195,247,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckIcon size={16} />
            创建
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-star-dim/40">
          Ctrl+Enter 快速创建 · Esc 关闭
        </p>
      </div>
    </div>,
    document.body
  );
}
