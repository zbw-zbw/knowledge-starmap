"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { SEARCH_DEBOUNCE } from "@/lib/constants";
import { fuzzyMatch } from "@/lib/fuzzySearch";
import { SearchIcon, CloseIcon } from "@/components/ui/Icons";
import HighlightedText from "@/components/ui/HighlightedText";

interface SearchBarProps {
  graph: KnowledgeGraph;
  onSelectNode: (node: KnowledgeNode) => void;
  onSearchChange: (query: string) => void;
}

/**
 * 搜索栏：实时搜索（debounce 300ms），匹配 label 和 description。
 * 支持精确匹配 + 模糊匹配（编辑距离）。
 * 搜索时图谱中匹配节点正常亮度，不匹配的变暗。
 * 支持键盘导航（↑/↓ 选择，Enter 确认，Esc 关闭）。
 * 点击搜索结果聚焦到该节点并选中（打开详情面板）。
 * 下拉列表通过 createPortal 渲染到 body，避免 overflow 裁剪。
 */
export default function SearchBar({
  graph,
  onSelectNode,
  onSearchChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeNode[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true);
  }, []);

  // debounce 搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(query);
      if (query.trim().length === 0) {
        setResults([]);
        setTotalMatches(0);
        setShowResults(false);
        setActiveIndex(0);
        return;
      }
      const q = query.trim().toLowerCase();
      // 精确匹配（子串包含）
      const exactMatched = graph.nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          (n.description?.toLowerCase().includes(q) ?? false) ||
          n.id.toLowerCase().includes(q)
      );
      // 如果精确匹配结果少于 5 个，补充模糊匹配结果
      let allMatched = exactMatched;
      if (exactMatched.length < 5 && q.length >= 2) {
        const exactIds = new Set(exactMatched.map((n) => n.id));
        const fuzzyMatched = graph.nodes.filter(
          (n) =>
            !exactIds.has(n.id) &&
            (fuzzyMatch(n.label, q) ||
              fuzzyMatch(n.description || "", q))
        );
        allMatched = [...exactMatched, ...fuzzyMatched];
      }
      setTotalMatches(allMatched.length);
      setResults(allMatched.slice(0, 8));
      setActiveIndex(0);
      setShowResults(true);
    }, SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [query, graph, onSearchChange]);

  // 计算下拉框位置（基于 input 元素的 getBoundingClientRect）
  useEffect(() => {
    if (!showResults) {
      setDropdownRect(null);
      return;
    }
    const updateRect = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownRect(rect);
      }
    };
    updateRect();
    // 侧边栏滚动时重新定位
    const scrollContainer = inputRef.current?.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateRect, { passive: true });
    }
    window.addEventListener("resize", updateRect);
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updateRect);
      }
      window.removeEventListener("resize", updateRect);
    };
  }, [showResults, results.length]);

  // 滚动激活项到可见区域
  useEffect(() => {
    if (!showResults || !resultsRef.current) return;
    const activeEl = resultsRef.current.querySelector(
      `[data-index="${activeIndex}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showResults]);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (node: KnowledgeNode) => {
      onSelectNode(node);
      setQuery("");
      setResults([]);
      setTotalMatches(0);
      setShowResults(false);
      setActiveIndex(0);
      onSearchChange("");
      inputRef.current?.blur();
    },
    [onSelectNode, onSearchChange]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setTotalMatches(0);
    setShowResults(false);
    setActiveIndex(0);
    onSearchChange("");
    inputRef.current?.focus();
  }, [onSearchChange]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showResults || results.length === 0) {
        if (e.key === "Escape") {
          setShowResults(false);
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(
            (prev) => (prev - 1 + results.length) % results.length
          );
          break;
        case "Enter":
          e.preventDefault();
          if (results[activeIndex]) {
            handleSelect(results[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowResults(false);
          inputRef.current?.blur();
          break;
      }
    },
    [showResults, results, activeIndex, handleSelect]
  );

  const hasQuery = query.trim().length > 0;
  const shouldShowDropdown = mounted && showResults && dropdownRect;

  return (
    <div ref={containerRef} className="relative">
      {/* 搜索输入框 */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-star-dim">
          <SearchIcon size={16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索知识概念... (⌘K)"
          className="w-full rounded-xl border border-space-500 bg-space-700/60 py-2 pl-9 pr-8 text-sm text-star-white placeholder:text-star-dim/60 focus:border-node-blue/50 focus:outline-none focus:ring-1 focus:ring-node-blue/30"
        />
        {hasQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-star-dim transition-colors hover:text-star-white"
            aria-label="清除搜索"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {/* 搜索结果下拉列表 — Portal 渲染避免 overflow 裁剪 */}
      {shouldShowDropdown &&
        createPortal(
          <div
            className="fixed z-[100] overflow-hidden rounded-xl border border-space-500 bg-space-800/95 shadow-2xl backdrop-blur-md"
            style={{
              top: dropdownRect.bottom + 6,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {/* 结果计数 */}
            {hasQuery && (
              <div className="border-b border-space-500/50 px-3 py-1.5 text-xs text-star-dim">
                {totalMatches > 0
                  ? `找到 ${totalMatches} 个匹配概念${totalMatches > 8 ? "，显示前 8 个" : ""}`
                  : "未找到匹配的概念"}
              </div>
            )}
            <div ref={resultsRef} className="max-h-64 overflow-y-auto">
              {results.length > 0 ? (
                results.map((node, idx) => (
                  <button
                    key={node.id}
                    data-index={idx}
                    onClick={() => handleSelect(node)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      idx === activeIndex
                        ? "bg-space-600/80"
                        : "hover:bg-space-600/60"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: GROUP_COLORS[node.group],
                        boxShadow: `0 0 6px ${GROUP_COLORS[node.group]}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm text-star-white">
                        <HighlightedText text={node.label} query={query} />
                      </div>
                      {node.description && (
                        <div className="truncate text-xs text-star-dim/70">
                          <HighlightedText
                            text={node.description}
                            query={query}
                          />
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-star-dim/70">
                      {GROUP_LABELS[node.group]}
                    </span>
                  </button>
                ))
              ) : hasQuery ? (
                <div className="px-3 py-4 text-center text-sm text-star-dim">
                  未找到匹配的概念
                  <div className="mt-1 text-xs text-star-dim/50">
                    尝试其他关键词或导入更多知识
                  </div>
                </div>
              ) : null}
            </div>
            {/* 键盘提示 */}
            {results.length > 0 && (
              <div className="border-t border-space-500/50 px-3 py-1.5 flex items-center gap-3 text-[10px] text-star-dim/50">
                <span>↑↓ 选择</span>
                <span>↵ 跳转</span>
                <span>Esc 关闭</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
