"use client";

import { useState, useEffect, useRef } from "react";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { SEARCH_DEBOUNCE } from "@/lib/constants";
import { SearchIcon, CloseIcon } from "@/components/ui/Icons";

interface SearchBarProps {
  graph: KnowledgeGraph;
  onSelectNode: (node: KnowledgeNode) => void;
  onSearchChange: (query: string) => void;
}

/**
 * 搜索栏：实时搜索（debounce 300ms），匹配 label 和 description。
 * 搜索时图谱中匹配节点正常亮度，不匹配的变暗。
 * 点击搜索结果聚焦到该节点。
 */
export default function SearchBar({
  graph,
  onSelectNode,
  onSearchChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeNode[]>([]);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // debounce 搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(query);
      if (query.trim().length === 0) {
        setResults([]);
        setShowResults(false);
        return;
      }
      const q = query.trim().toLowerCase();
      const matched = graph.nodes
        .filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            (n.description?.toLowerCase().includes(q) ?? false) ||
            n.id.toLowerCase().includes(q)
        )
        .slice(0, 8);
      setResults(matched);
      setShowResults(true);
    }, SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [query, graph, onSearchChange]);

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

  const handleSelect = (node: KnowledgeNode) => {
    onSelectNode(node);
    setQuery("");
    setResults([]);
    setShowResults(false);
    onSearchChange("");
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    onSearchChange("");
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* 搜索输入框 */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-star-dim">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="搜索知识概念..."
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

      {/* 搜索结果下拉列表 */}
      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-space-500 bg-space-800/95 shadow-2xl backdrop-blur-md">
          {results.map((node) => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-space-600/60"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: GROUP_COLORS[node.group],
                  boxShadow: `0 0 6px ${GROUP_COLORS[node.group]}`,
                }}
              />
              <span className="flex-1 truncate text-sm text-star-white">
                {node.label}
              </span>
              <span className="shrink-0 text-xs text-star-dim/70">
                {GROUP_LABELS[node.group]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 无搜索结果提示 */}
      {showResults && results.length === 0 && hasQuery && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-space-500 bg-space-800/95 px-3 py-3 text-center text-sm text-star-dim backdrop-blur-md">
          未找到匹配的概念
        </div>
      )}
    </div>
  );
}
