"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { fuzzyMatch } from "@/lib/fuzzySearch";
import { SearchIcon, CloseIcon } from "@/components/ui/Icons";
import HighlightedText from "@/components/ui/HighlightedText";
import { computeDegreeMap } from "@/lib/graphUtils";

interface SpotlightSearchProps {
  graph: KnowledgeGraph;
  onSelectNode: (node: KnowledgeNode) => void;
  /** 外部控制是否打开 */
  open: boolean;
  onClose: () => void;
}

/**
 * Spotlight 全局搜索弹窗：
 * Cmd/Ctrl+K 触发，居中弹出，实时搜索节点。
 * 支持精确 + 模糊匹配，键盘导航（↑↓ 选择，Enter 跳转，Esc 关闭）。
 */
export default function SpotlightSearch({ graph, onSelectNode, open, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索结果（实时，无 debounce）
  const results = useMemo(() => {
    if (!query.trim()) {
      // 无搜索词时按度数排序返回所有节点（最多 10）
      const degreeMap = computeDegreeMap(graph.edges);
      return [...graph.nodes]
        .sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0))
        .slice(0, 10);
    }
    const q = query.trim().toLowerCase();
    const exact = graph.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        (n.description?.toLowerCase().includes(q) ?? false) ||
        n.id.toLowerCase().includes(q)
    );
    if (exact.length < 5 && q.length >= 2) {
      const exactIds = new Set(exact.map((n) => n.id));
      const fuzzy = graph.nodes.filter(
        (n) =>
          !exactIds.has(n.id) &&
          (fuzzyMatch(n.label, q) || fuzzyMatch(n.description || "", q))
      );
      return [...exact, ...fuzzy].slice(0, 10);
    }
    return exact.slice(0, 10);
  }, [query, graph]);

  // 打开/关闭时重置状态
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 同步 activeIndex 到有效范围
  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, activeIndex]);

  const handleSelect = useCallback(
    (node: KnowledgeNode) => {
      onSelectNode(node);
      onClose();
    },
    [onSelectNode, onClose]
  );

  // 键盘导航
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, results.length));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, activeIndex, handleSelect, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-start justify-center bg-space-900/60 backdrop-blur-sm animate-fade-in pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-space-500/80 bg-space-800 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 border-b border-space-500/50 px-4 py-3">
          <SearchIcon size={20} className="shrink-0 text-node-blue" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索知识概念..."
            className="flex-1 bg-transparent text-base text-star-white placeholder:text-star-dim/50 outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-space-500 bg-space-700/50 px-2 py-0.5 text-[10px] font-medium text-star-dim/60 sm:inline">
            Esc
          </kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length > 0 ? (
            results.map((node, idx) => (
              <button
                key={node.id}
                onClick={() => handleSelect(node)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === activeIndex ? "bg-space-600/80" : "hover:bg-space-600/50"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: GROUP_COLORS[node.group],
                    boxShadow: `0 0 6px ${GROUP_COLORS[node.group]}60`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-star-white">
                    <HighlightedText text={node.label} query={query} />
                  </div>
                  {node.description && (
                    <div className="truncate text-xs text-star-dim/60">
                      <HighlightedText text={node.description} query={query} />
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-space-700/50 px-2 py-0.5 text-[10px] text-star-dim/70">
                  {GROUP_LABELS[node.group]}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-star-dim">
              未找到匹配的概念
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 border-t border-space-500/50 px-4 py-2 text-[10px] text-star-dim/40">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-space-600 bg-space-700 px-1 py-px">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-space-600 bg-space-700 px-1 py-px">↵</kbd>
            跳转
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-space-600 bg-space-700 px-1 py-px">Esc</kbd>
            关闭
          </span>
          <span className="ml-auto text-star-dim/30">
            {graph.nodes.length} 个节点
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
