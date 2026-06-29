"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl/Cmd", "K"], description: "搜索知识概念" },
  { keys: ["Ctrl/Cmd", "E"], description: "导出图谱为 PNG" },
  { keys: ["Ctrl/Cmd", "0"], description: "重置视图" },
  { keys: ["Esc"], description: "关闭面板" },
  { keys: ["滚轮"], description: "缩放图谱" },
  { keys: ["拖拽节点"], description: "移动节点位置" },
  { keys: ["拖拽空白"], description: "平移画布" },
  { keys: ["双指捏合"], description: "移动端缩放" },
];

/**
 * 快捷键帮助面板：
 * 按下 ? 键或在设置中点击显示。
 * Portal 渲染，居中弹窗。
 */
export default function ShortcutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? 键打开（不在输入框中时）
      if (e.key === "?" && !isInputFocused()) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape 关闭
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-space-900/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-space-800 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-star-white">
            键盘快捷键
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-star-dim transition-colors hover:text-star-white"
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-space-700/50"
            >
              <span className="text-sm text-star-white/80">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <span
                    key={j}
                    className="rounded-md border border-space-500 bg-space-700 px-2 py-0.5 text-xs font-mono text-star-dim"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-star-dim/50">
          按 ? 键随时打开此面板
        </p>
      </div>
    </div>,
    document.body
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

/** Hook: 提供快捷键提示的触发器 */
export function useShortcutPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close };
}
