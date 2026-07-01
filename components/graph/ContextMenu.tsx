"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import {
  PencilIcon,
  TrashIcon,
  ResetIcon,
} from "@/components/ui/Icons";
import type { KnowledgeNode } from "@/lib/types";

interface ContextMenuProps {
  x: number;
  y: number;
  node: KnowledgeNode;
  onEdit: () => void;
  onDelete: () => void;
  onFocus: () => void;
  onClose: () => void;
}

/**
 * 图谱节点右键上下文菜单：
 * Portal 渲染到 body，自动定位避免溢出屏幕。
 */
export default function ContextMenu({
  x,
  y,
  onEdit,
  onDelete,
  onFocus,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // 延迟添加监听，避免触发当前右键事件
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  // 计算菜单位置，避免溢出屏幕
  const menuWidth = 160;
  const menuHeight = 148;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  const menuItems = [
    {
      icon: <ResetIcon size={14} />,
      label: "聚焦节点",
      onClick: () => {
        onFocus();
        onClose();
      },
    },
    {
      icon: <PencilIcon size={14} />,
      label: "编辑节点",
      onClick: () => {
        onEdit();
        onClose();
      },
    },
    {
      icon: <TrashIcon size={14} />,
      label: "删除节点",
      onClick: () => {
        onDelete();
        onClose();
      },
      danger: true,
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[120] min-w-[160px] overflow-hidden rounded-xl border border-space-500 bg-space-800 py-1 shadow-2xl animate-scale-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menuItems.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
            item.danger
              ? "text-red-400 hover:bg-red-400/10"
              : "text-star-white/80 hover:bg-space-700 hover:text-star-white"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
