"use client";

import type { KnowledgeNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";

interface RecentNodesProps {
  nodes: KnowledgeNode[];
  activeNodeId: string | null;
  onNavigate: (node: KnowledgeNode) => void;
  onClear: () => void;
}

/**
 * 最近访问节点列表：
 * - 显示最近浏览过的节点（最多 8 个，去重，最新在前）
 * - 点击节点快速跳转
 * - 当前激活节点高亮
 * - 支持清空历史
 */
export default function RecentNodes({
  nodes,
  activeNodeId,
  onNavigate,
  onClear,
}: RecentNodesProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-star-dim/50">
          最近浏览
        </span>
        <button
          onClick={onClear}
          className="rounded px-1 py-0.5 text-[10px] text-star-dim/40 transition-colors hover:bg-space-700/60 hover:text-star-dim"
          title="清空最近浏览"
        >
          清空
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {nodes.map((node, idx) => {
          const isActive = node.id === activeNodeId;
          const color = GROUP_COLORS[node.group];
          return (
            <button
              key={`${node.id}-${idx}`}
              onClick={() => onNavigate(node)}
              className={`group flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                isActive
                  ? "border-node-blue/50 bg-node-blue/10 text-star-white"
                  : "border-space-500/40 bg-space-700/30 text-star-dim/70 hover:border-space-500/60 hover:bg-space-700/50 hover:text-star-white"
              }`}
              title={`${node.label} · ${GROUP_LABELS[node.group]}`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full transition-all"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                  boxShadow: isActive ? `0 0 4px ${color}` : "none",
                }}
              />
              <span className="max-w-[80px] truncate">{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
