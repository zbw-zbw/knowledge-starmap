"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";

interface NodeDetailProps {
  node: KnowledgeNode | null;
  graph: KnowledgeGraph;
  onClose: () => void;
  onNavigateNode: (node: KnowledgeNode) => void;
}

interface RelatedInfo {
  node: KnowledgeNode;
  relation: string;
  direction: "out" | "in";
}

/**
 * 节点详情面板：点击节点时从右侧滑入（360px）。
 * 使用 createPortal 渲染到 document.body，避免被 layout.tsx 的
 * `relative z-10` 包装层创建的 stacking context 遮挡。
 * 展示节点描述、关联概念列表、节点统计。
 * 点击关联概念可跳转到该节点的详情。
 */
export default function NodeDetail({
  node,
  graph,
  onClose,
  onNavigateNode,
}: NodeDetailProps) {
  // 计算关联概念
  const related = useMemo<RelatedInfo[]>(() => {
    if (!node) return [];
    const result: RelatedInfo[] = [];
    for (const edge of graph.edges) {
      if (edge.source === node.id) {
        const target = graph.nodes.find((n) => n.id === edge.target);
        if (target) {
          result.push({ node: target, relation: edge.relation, direction: "out" });
        }
      } else if (edge.target === node.id) {
        const source = graph.nodes.find((n) => n.id === edge.source);
        if (source) {
          result.push({ node: source, relation: edge.relation, direction: "in" });
        }
      }
    }
    return result;
  }, [node, graph]);

  // 节点统计
  const stats = useMemo(() => {
    if (!node) return null;
    const directCount = related.length;

    // 平均关联数
    const allDegree = graph.edges.reduce(
      (acc, e) => {
        acc[e.source] = (acc[e.source] || 0) + 1;
        acc[e.target] = (acc[e.target] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const avgDegree =
      Object.values(allDegree).reduce((a, b) => a + b, 0) /
      Math.max(1, graph.nodes.length);
    const strengthRatio = avgDegree > 0 ? directCount / avgDegree : 0;
    const strengthPct = Math.min(100, Math.round(strengthRatio * 50));

    // 核心度：该节点在所属 group 内的边数占比
    const groupNodes = graph.nodes.filter((n) => n.group === node.group);
    const groupNodeIds = new Set(groupNodes.map((n) => n.id));
    const groupEdges = graph.edges.filter(
      (e) => groupNodeIds.has(e.source) && groupNodeIds.has(e.target)
    );
    const groupDegree = graph.edges.filter(
      (e) => e.source === node.id || e.target === node.id
    ).length;
    const coreness =
      groupEdges.length > 0
        ? Math.round((groupDegree / groupEdges.length) * 100)
        : 0;

    return { directCount, strengthPct, coreness };
  }, [node, graph, related]);

  // node 为 null 时不渲染；SSR 安全检查
  if (!node || typeof document === "undefined") return null;

  const color = GROUP_COLORS[node.group];

  return createPortal(
    <>
      {/* 移动端背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-space-900/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* 详情面板 — 通过 portal 渲染到 body，脱离 stacking context */}
      <aside
             className="fixed bottom-0 left-0 right-0 z-50 h-[60vh] overflow-y-auto rounded-t-2xl border-t border-space-500 bg-space-800 shadow-2xl transition-transform duration-300 ease-out md:bottom-auto md:left-auto md:top-14 md:right-0 md:h-[calc(100vh-3.5rem)] md:w-[360px] md:rounded-none md:border-l md:border-t-0"
             style={{
               animation: "slideInRight 300ms ease-out",
             }}
           >
        {/* 顶部栏 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-space-500/60 bg-space-800/95 px-5 py-4 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="text-sm text-star-dim transition-colors hover:text-star-white"
          >
            ← 返回
          </button>
          <button
            onClick={onClose}
            className="text-star-dim transition-colors hover:text-star-white"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {/* 节点标题 */}
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
            <h2 className="text-xl font-semibold text-star-white">
              {node.label}
            </h2>
          </div>
          <span
            className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {GROUP_LABELS[node.group]}
          </span>

          {/* 描述 */}
          {node.description && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
                📝 描述
              </h3>
              <p className="text-sm leading-relaxed text-star-white/80">
                {node.description}
              </p>
            </div>
          )}

          {/* 关联概念 */}
          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
                🔗 关联概念（{related.length}）
              </h3>
              <div className="space-y-1.5">
                {related.map((item, idx) => {
                  const rColor = GROUP_COLORS[item.node.group];
                  return (
                    <button
                      key={`${item.node.id}-${idx}`}
                      onClick={() => onNavigateNode(item.node)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-space-500/40 bg-space-700/40 px-3 py-2.5 text-left transition-all hover:border-node-blue/40 hover:bg-space-700/70"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: rColor,
                          boxShadow: `0 0 4px ${rColor}`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-star-dim/50">
                            {item.direction === "out" ? "→" : "←"}
                          </span>
                          <span className="truncate text-sm font-medium text-star-white">
                            {item.node.label}
                          </span>
                        </div>
                        <span className="text-xs text-star-dim/70">
                          {item.relation}
                        </span>
                      </div>
                      <span className="text-star-dim/30 transition-colors group-hover:text-node-blue">
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 节点统计 */}
          {stats && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
                📊 节点统计
              </h3>
              <div className="space-y-3 rounded-xl border border-space-500/40 bg-space-700/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-star-dim">直接关联</span>
                  <span className="text-sm font-medium text-star-white">
                    {stats.directCount} 个节点
                  </span>
                </div>

                {/* 关联强度进度条 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-star-dim">关联强度</span>
                    <span className="text-xs text-star-dim">
                      {stats.strengthPct > 60 ? "高" : stats.strengthPct > 30 ? "中" : "低"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-space-600">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.strengthPct}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                  </div>
                </div>

                {/* 核心度进度条 */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-star-dim">所属领域核心度</span>
                    <span className="text-xs text-star-dim">
                      {stats.coreness}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-space-600">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.coreness}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}
