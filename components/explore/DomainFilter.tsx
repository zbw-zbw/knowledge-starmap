"use client";

import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import type { KnowledgeGraph } from "@/lib/types";

interface DomainFilterProps {
  graph: KnowledgeGraph;
  visibleGroups: Set<string>;
  onToggle: (group: string) => void;
  onShowOnly?: (group: string) => void;
  onShowAll?: () => void;
  onInvert?: () => void;
}

const GROUP_ORDER = ["frontend", "backend", "pattern", "engineering", "general"];

/**
 * 领域筛选器：横向排列的 Toggle 按钮组。
 * 点击某个分组 toggle 显示/隐藏，至少保留一个分组激活。
 * 长按或右键分组可「仅显示该分组」；顶部快捷操作：「全部」「反选」。
 */
export default function DomainFilter({
  graph,
  visibleGroups,
  onToggle,
  onShowOnly,
  onShowAll,
  onInvert,
}: DomainFilterProps) {
  // 计算每个分组的节点数
  const groupCounts = graph.nodes.reduce(
    (acc, n) => {
      acc[n.group] = (acc[n.group] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const presentGroups = GROUP_ORDER.filter((g) => groupCounts[g]);
  const allActive = presentGroups.every((g) => visibleGroups.has(g));
  const someActive = presentGroups.some((g) => visibleGroups.has(g));

  // 右键 / Shift+点击：仅显示该分组
  const handleOnlyClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    group: string
  ) => {
    if (e.shiftKey && onShowOnly) {
      e.preventDefault();
      onShowOnly(group);
    } else {
      onToggle(group);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* 快捷操作行 */}
      <div className="flex items-center gap-1 text-[10px] text-star-dim/60">
        <button
          onClick={onShowAll}
          disabled={allActive}
          className="rounded px-1.5 py-0.5 transition-colors hover:bg-space-700/60 hover:text-star-dim disabled:cursor-not-allowed disabled:opacity-40"
          title="显示所有领域"
        >
          全部
        </button>
        <span className="text-star-dim/20">·</span>
        <button
          onClick={onInvert}
          disabled={!someActive}
          className="rounded px-1.5 py-0.5 transition-colors hover:bg-space-700/60 hover:text-star-dim disabled:cursor-not-allowed disabled:opacity-40"
          title="反选当前显示的领域"
        >
          反选
        </button>
        <span className="ml-auto text-[10px] text-star-dim/40">
          Shift+点击 = 仅显示
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presentGroups.map((group) => {
          const isActive = visibleGroups.has(group);
          const color = GROUP_COLORS[group];
          const count = groupCounts[group] || 0;

          return (
            <button
              key={group}
              onClick={(e) => handleOnlyClick(e, group)}
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
    </div>
  );
}
