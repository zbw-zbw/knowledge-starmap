"use client";

import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import type { KnowledgeGraph } from "@/lib/types";

interface DomainFilterProps {
  graph: KnowledgeGraph;
  visibleGroups: Set<string>;
  onToggle: (group: string) => void;
}

const GROUP_ORDER = ["frontend", "backend", "pattern", "engineering", "general"];

/**
 * 领域筛选器：横向排列的 Toggle 按钮组。
 * 点击某个分组 toggle 显示/隐藏，至少保留一个分组激活。
 */
export default function DomainFilter({
  graph,
  visibleGroups,
  onToggle,
}: DomainFilterProps) {
  // 计算每个分组的节点数
  const groupCounts = graph.nodes.reduce(
    (acc, n) => {
      acc[n.group] = (acc[n.group] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {GROUP_ORDER.filter((g) => groupCounts[g]).map((group) => {
        const isActive = visibleGroups.has(group);
        const color = GROUP_COLORS[group];
        const count = groupCounts[group] || 0;

        return (
          <button
            key={group}
            onClick={() => onToggle(group)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-all ${
              isActive
                ? "border-space-500 bg-space-600/40 text-star-white"
                : "border-space-500/30 bg-space-700/20 text-star-dim/40"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full transition-all"
              style={{
                backgroundColor: isActive ? color : "transparent",
                borderColor: color,
                boxShadow: isActive ? `0 0 6px ${color}` : "none",
              }}
            />
            {GROUP_LABELS[group]}
            <span className="text-star-dim/60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
