"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";

interface Shortcut {
  keys: string[];
  description: string;
}

type TabId = "keyboard" | "mouse" | "touch";

interface Tab {
  id: TabId;
  label: string;
  shortcuts: Shortcut[];
}

const TABS: Tab[] = [
  {
    id: "keyboard",
    label: "键盘",
    shortcuts: [
      { keys: ["Ctrl/Cmd", "K"], description: "搜索知识概念" },
      { keys: ["Ctrl/Cmd", "Z"], description: "撤销" },
      { keys: ["Ctrl/Cmd", "Shift", "Z"], description: "重做" },
      { keys: ["Ctrl/Cmd", "E"], description: "导出图谱为 PNG" },
      { keys: ["Ctrl/Cmd", "0"], description: "重置视图" },
      { keys: ["Alt", "↑"], description: "上一个节点（详情面板）" },
      { keys: ["Alt", "↓"], description: "下一个节点（详情面板）" },
      { keys: ["Esc"], description: "关闭面板/清除选择" },
      { keys: ["?"], description: "打开快捷键帮助" },
    ],
  },
  {
    id: "mouse",
    label: "鼠标",
    shortcuts: [
      { keys: ["滚轮"], description: "缩放图谱" },
      { keys: ["单击节点"], description: "选中并查看详情" },
      { keys: ["双击节点"], description: "聚焦放大节点" },
      { keys: ["右键节点"], description: "打开操作菜单" },
      { keys: ["拖拽节点"], description: "移动节点位置" },
      { keys: ["拖拽空白"], description: "平移画布" },
      { keys: ["Shift+点击"], description: "领域筛选：仅显示该领域" },
    ],
  },
  {
    id: "touch",
    label: "触控",
    shortcuts: [
      { keys: ["单击节点"], description: "选中并查看详情" },
      { keys: ["双击节点"], description: "聚焦放大节点" },
      { keys: ["长按节点"], description: "打开操作菜单" },
      { keys: ["拖拽节点"], description: "移动节点位置" },
      { keys: ["拖拽空白"], description: "平移画布" },
      { keys: ["双指捏合"], description: "缩放图谱" },
    ],
  },
];

/**
 * 快捷键帮助面板：
 * 按下 ? 键或在设置中点击显示。
 * Portal 渲染，居中弹窗，Tab 分类切换。
 */
export default function ShortcutPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("keyboard");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !isInputFocused()) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
      // Tab 切换：左/右箭头
      if (isOpen && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (isInputFocused()) return;
        e.preventDefault();
        const tabIds = TABS.map((t) => t.id);
        const curIdx = tabIds.indexOf(activeTab);
        const nextIdx =
          e.key === "ArrowRight"
            ? (curIdx + 1) % tabIds.length
            : (curIdx - 1 + tabIds.length) % tabIds.length;
        setActiveTab(tabIds[nextIdx]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab]);

  if (!isOpen || typeof document === "undefined") return null;

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-space-900/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-space-800 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-star-white">
            快捷键帮助
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-star-dim transition-colors hover:text-star-white"
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Tab 切换栏 */}
        <div className="mb-4 flex gap-1 rounded-lg bg-space-700/50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-space-600 text-star-white shadow-sm"
                  : "text-star-dim/60 hover:text-star-dim"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 快捷键列表 */}
        <div
          className="space-y-1"
          key={activeTab}
          style={{ animation: "fadeIn 200ms ease-out" }}
        >
          {currentTab.shortcuts.map((shortcut, i) => (
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
                    className="rounded-md border border-space-500 bg-space-700 px-2 py-0.5 font-mono text-xs text-star-dim"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-star-dim/50">
          按 ? 键随时打开 · ← → 切换分类
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
