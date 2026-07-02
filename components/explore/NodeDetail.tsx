"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { KnowledgeGraph, KnowledgeNode, NodeGroup } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import {
  ArrowLeftIcon,
  CloseIcon,
  NoteIcon,
  LinkIcon,
  ChartIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  TargetIcon,
  CopyIcon,
} from "@/components/ui/Icons";
import EditEdgeModal from "./EditEdgeModal";

interface NodeDetailProps {
  node: KnowledgeNode | null;
  graph: KnowledgeGraph;
  onClose: () => void;
  onNavigateNode: (node: KnowledgeNode) => void;
  onNodeUpdate: (id: string, updates: Partial<KnowledgeNode>) => void;
  onNodeDelete: (id: string) => void;
  onFocusNode?: (nodeId: string) => void;
  onPrevNode?: () => void;
  onNextNode?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** 路径高亮节点 id 集合（用于高亮最短路径） */
  pathHighlightNodes?: Set<string> | null;
  /** 路径查找模式激活回调 */
  onStartPathFind?: (nodeId: string) => void;
  /** 是否处于路径查找模式 */
  isPathFindMode?: boolean;
  /** 删除边回调 (sourceId, targetId) */
  onEdgeDelete?: (sourceId: string, targetId: string) => void;
  /** 编辑边回调 (sourceId, targetId, newRelation) */
  onEdgeUpdate?: (sourceId: string, targetId: string, newRelation: string) => void;
}

interface RelatedInfo {
  node: KnowledgeNode;
  relation: string;
  direction: "out" | "in";
}

const GROUP_OPTIONS: NodeGroup[] = ["frontend", "backend", "pattern", "engineering", "general"];

/**
 * 节点详情面板：点击节点时从右侧滑入（360px）。
 * 使用 createPortal 渲染到 document.body，避免被 layout.tsx 的
 * `relative z-10` 包装层创建的 stacking context 遮挡。
 * 展示节点描述、关联概念列表、节点统计。
 * 支持编辑模式、删除节点、重新聚焦节点。
 * 点击关联概念可跳转到该节点的详情。
 */
export default function NodeDetail({
  node,
  graph,
  onClose,
  onNavigateNode,
  onNodeUpdate,
  onNodeDelete,
  onFocusNode,
  onPrevNode,
  onNextNode,
  hasPrev,
  hasNext,
  pathHighlightNodes,
  onStartPathFind,
  isPathFindMode,
  onEdgeDelete,
  onEdgeUpdate,
}: NodeDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGroup, setEditGroup] = useState<NodeGroup>("general");
  // 关系类型筛选
  const [activeRelation, setActiveRelation] = useState<string | null>(null);

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

  // 所有关系类型（去重，按出现次数排序）
  const relationTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of related) {
      counts.set(item.relation, (counts.get(item.relation) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [related]);

  // 筛选后的关联概念
  const filteredRelated = useMemo(() => {
    if (!activeRelation) return related;
    return related.filter((item) => item.relation === activeRelation);
  }, [related, activeRelation]);

  // 节点切换时重置筛选
  useEffect(() => {
    setActiveRelation(null);
  }, [node?.id]);

  // 节点切换时重置描述展开状态
  useEffect(() => {
    setDescExpanded(false);
  }, [node?.id]);

  // 节点统计
  const stats = useMemo(() => {
    if (!node) return null;
    const directCount = related.length;

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

    return { directCount, strengthPct, coreness: Math.min(100, coreness) };
  }, [node, graph, related]);

  // 前后节点（在图谱节点列表中的邻居）—— 用于底部导航卡片
  const { prevNode, nextNode } = useMemo(() => {
    if (!node) return { prevNode: null, nextNode: null };
    const idx = graph.nodes.findIndex((n) => n.id === node.id);
    if (idx === -1) return { prevNode: null, nextNode: null };
    return {
      prevNode: idx > 0 ? graph.nodes[idx - 1] : null,
      nextNode: idx < graph.nodes.length - 1 ? graph.nodes[idx + 1] : null,
    };
  }, [node, graph.nodes]);

  // 进入编辑模式时，用当前节点值填充编辑状态
  const enterEditMode = useCallback(() => {
    if (!node) return;
    setEditLabel(node.label);
    setEditDescription(node.description || "");
    setEditGroup(node.group);
    setIsEditing(true);
  }, [node]);

  // 保存编辑（显式保存，不依赖 blur）
  const saveEdit = useCallback(() => {
    if (!node) return;
    const updates: Partial<KnowledgeNode> = {};
    if (editLabel.trim() && editLabel.trim() !== node.label) {
      updates.label = editLabel.trim();
    }
    if (editDescription !== (node.description || "")) {
      updates.description = editDescription || undefined;
    }
    if (editGroup !== node.group) {
      updates.group = editGroup;
    }
    if (Object.keys(updates).length > 0) {
      onNodeUpdate(node.id, updates);
    }
    setIsEditing(false);
  }, [node, editLabel, editDescription, editGroup, onNodeUpdate]);

  // 取消编辑（回滚到节点原始值）
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // 聚焦当前节点
  const handleFocus = useCallback(() => {
    if (node && onFocusNode) {
      onFocusNode(node.id);
    }
  }, [node, onFocusNode]);

  // 复制节点名称到剪贴板
  const [copied, setCopied] = useState(false);
  // 节点描述展开/收起状态
  const [descExpanded, setDescExpanded] = useState(false);

  // 边编辑弹窗状态
  const [editingEdge, setEditingEdge] = useState<{
    sourceId: string;
    targetId: string;
    relation: string;
    sourceLabel: string;
    targetLabel: string;
  } | null>(null);
  const handleCopy = useCallback(async () => {
    if (!node) return;
    try {
      await navigator.clipboard.writeText(node.label);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // 静默失败
    }
  }, [node]);

  // 全局快捷键：Alt+↑ 上一节点，Alt+↓ 下一节点
  useEffect(() => {
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        if (onPrevNode && hasPrev) onPrevNode();
      } else if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        if (onNextNode && hasNext) onNextNode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [node, onPrevNode, onNextNode, hasPrev, hasNext]);

  // 键盘快捷键：Enter 保存，Escape 取消
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  if (!node || typeof document === "undefined") return null;

  const color = GROUP_COLORS[node.group];
  const editColor = GROUP_COLORS[editGroup];

  return createPortal(
    <>
      {/* 移动端背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-space-900/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease-out" }}
      />

      {/* 详情面板：桌面端固定右侧 380px 侧边栏，移动端底部浮层 */}
      <aside
        className="fixed bottom-0 left-0 right-0 z-50 h-[60vh] overflow-y-auto rounded-t-2xl bg-space-800/98 shadow-2xl backdrop-blur-xl md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-[380px] md:rounded-none md:border-l md:border-space-600/50 md:shadow-[-8px_0_24px_rgba(0,0,0,0.4)]"
        style={{
          animation: "slideInRight 300ms ease-out",
        }}
      >
        {/* 顶部栏 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-space-600/30 bg-space-800/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {/* 上/下节点导航 */}
            {(onPrevNode || onNextNode) && (
              <div className="flex items-center gap-0.5 rounded-lg border border-space-500 p-0.5">
                <button
                  onClick={onPrevNode}
                  disabled={!hasPrev}
                  className="flex items-center justify-center rounded-md p-1 text-star-dim transition-colors hover:bg-space-700 hover:text-star-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="上一个节点"
                  title="上一个节点 (Alt+↑)"
                >
                  <ArrowUpIcon size={12} />
                </button>
                <button
                  onClick={onNextNode}
                  disabled={!hasNext}
                  className="flex items-center justify-center rounded-md p-1 text-star-dim transition-colors hover:bg-space-700 hover:text-star-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="下一个节点"
                  title="下一个节点 (Alt+↓)"
                >
                  <ArrowDownIcon size={12} />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-star-dim transition-all hover:bg-space-700 hover:text-star-white"
            >
              <ArrowLeftIcon size={16} />
              <span className="hidden md:inline">返回</span>
            </button>
            {/* 聚焦按钮 */}
            {onFocusNode && (
              <button
                onClick={handleFocus}
                className="flex items-center gap-1 rounded-lg border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-node-blue/60 hover:bg-space-700 hover:text-node-blue"
                aria-label="聚焦节点"
                title="重新聚焦到此节点"
              >
                <TargetIcon size={14} />
                <span className="hidden sm:inline">聚焦</span>
              </button>
            )}
            {/* 编辑按钮 */}
            <button
              onClick={isEditing ? saveEdit : enterEditMode}
              className="flex items-center gap-1 rounded-lg border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-node-blue/60 hover:bg-space-700 hover:text-node-blue"
              aria-label={isEditing ? "保存" : "编辑"}
            >
              {isEditing ? (
                <>
                  <CheckIcon size={14} />
                  保存
                </>
              ) : (
                <>
                  <PencilIcon size={14} />
                  编辑
                </>
              )}
            </button>
            {/* 取消编辑按钮（仅在编辑模式显示） */}
            {isEditing && (
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-space-400 hover:bg-space-700 hover:text-star-white"
              >
                取消
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 删除按钮 */}
            <button
              onClick={() => onNodeDelete(node.id)}
              className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-400 transition-all hover:border-red-400 hover:bg-red-400/10 hover:text-red-300"
              aria-label="删除节点"
            >
              <TrashIcon size={14} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-star-dim transition-colors hover:bg-space-700 hover:text-star-white"
              aria-label="关闭"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 pb-8">
          {/* 节点标题 */}
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{
                backgroundColor: isEditing ? editColor : color,
                boxShadow: `0 0 12px ${isEditing ? editColor : color}`,
              }}
            />
            {isEditing ? (
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="flex-1 rounded-lg border border-space-500 bg-space-700 px-3 py-1.5 text-xl font-semibold text-star-white outline-none focus:border-node-blue/60"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-xl font-semibold text-star-white">
                  {node.label}
                </h2>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-md p-1 text-star-dim/50 transition-colors hover:bg-space-700 hover:text-node-blue"
                  aria-label="复制节点名称"
                  title={copied ? "已复制！" : "复制节点名称"}
                >
                  {copied ? (
                    <CheckIcon size={14} className="text-node-green" />
                  ) : (
                    <CopyIcon size={14} />
                  )}
                </button>
              </>
            )}
          </div>
          {isEditing ? (
            <div className="mt-2">
              <select
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value as NodeGroup)}
                className="rounded-lg border border-space-500 bg-space-700 px-3 py-1 text-xs font-medium text-star-white outline-none focus:border-node-blue/60"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span
              className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              {GROUP_LABELS[node.group]}
            </span>
          )}

          {/* 描述 */}
          {(isEditing || node.description) && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-star-dim">
                <NoteIcon size={14} />
                描述
              </h3>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  rows={4}
                  className="w-full rounded-lg border border-space-500 bg-space-700 px-3 py-2 text-sm leading-relaxed text-star-white outline-none focus:border-node-blue/60 resize-none"
                  placeholder="添加节点描述..."
                />
              ) : (
                <>
                  <p
                    className={`text-sm leading-relaxed text-star-white/80 ${
                      !descExpanded ? "line-clamp-3" : ""
                    }`}
                  >
                    {node.description}
                  </p>
                  {node.description && node.description.length > 100 && (
                    <button
                      onClick={() => setDescExpanded((prev) => !prev)}
                      className="mt-1 text-xs text-node-blue/70 transition-colors hover:text-node-blue"
                    >
                      {descExpanded ? "收起" : "展开全部"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* 关联概念 */}
          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-star-dim">
                <LinkIcon size={14} />
                关联概念（{filteredRelated.length}
                {activeRelation && ` / ${related.length}`}）
              </h3>

              {/* 关系类型筛选 chips（仅当有 >1 种关系类型时显示） */}
              {relationTypes.length > 1 && (
                <div className="mb-2.5 flex flex-wrap gap-1">
                  <button
                    onClick={() => setActiveRelation(null)}
                    className={`rounded-full px-2 py-0.5 text-[11px] transition-all ${
                      !activeRelation
                        ? "bg-node-blue/20 text-node-blue"
                        : "bg-space-700/40 text-star-dim/60 hover:text-star-dim"
                    }`}
                  >
                    全部 {related.length}
                  </button>
                  {relationTypes.map(([rel, count]) => (
                    <button
                      key={rel}
                      onClick={() =>
                        setActiveRelation(activeRelation === rel ? null : rel)
                      }
                      className={`rounded-full px-2 py-0.5 text-[11px] transition-all ${
                        activeRelation === rel
                          ? "bg-node-blue/20 text-node-blue"
                          : "bg-space-700/40 text-star-dim/60 hover:text-star-dim"
                      }`}
                    >
                      {rel} {count}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {filteredRelated.map((item, idx) => {
                  const rColor = GROUP_COLORS[item.node.group];
                  const edgeSource = item.direction === "out" ? node.id : item.node.id;
                  const edgeTarget = item.direction === "out" ? item.node.id : node.id;
                  return (
                    <div
                      key={`${item.node.id}-${idx}`}
                      className="group flex items-center gap-3 rounded-lg border border-space-500/40 bg-space-700/30 px-3 py-2.5 transition-all hover:border-node-blue/40 hover:bg-space-700/60"
                    >
                      <button
                        onClick={() => onNavigateNode(item.node)}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left"
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
                              {item.direction === "out" ? (
                                <ArrowRightIcon size={12} />
                              ) : (
                                <ArrowLeftIcon size={12} />
                              )}
                            </span>
                            <span className="truncate text-sm font-medium text-star-white">
                              {item.node.label}
                            </span>
                          </div>
                          <span className="text-xs text-star-dim/70">
                            {item.relation}
                          </span>
                        </div>
                      </button>
                      {/* 边操作按钮（hover 时显示） */}
                      {(onEdgeDelete || onEdgeUpdate) && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {onEdgeUpdate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEdge({
                                  sourceId: edgeSource,
                                  targetId: edgeTarget,
                                  relation: item.relation,
                                  sourceLabel: edgeSource === node.id ? node.label : item.node.label,
                                  targetLabel: edgeSource === node.id ? item.node.label : node.label,
                                });
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-star-dim transition-colors hover:text-node-blue"
                              title="编辑关系"
                            >
                              <PencilIcon size={12} />
                            </button>
                          )}
                          {onEdgeDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdgeDelete(edgeSource, edgeTarget);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-star-dim transition-colors hover:text-red-400"
                              title="删除连线"
                            >
                              <TrashIcon size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredRelated.length === 0 && (
                  <div className="rounded-lg border border-dashed border-space-500/30 px-3 py-4 text-center text-xs text-star-dim/40">
                    该关系类型下暂无关联概念
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 路径查找按钮 */}
          {onStartPathFind && (
            <div className="mt-4 border-t border-space-600/30 pt-3">
              <button
                onClick={() => onStartPathFind(node.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                  isPathFindMode
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-space-700/50 text-star-dim border border-space-500/50 hover:border-node-blue/40 hover:text-node-blue"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M6 9v2a5 5 0 0 0 5 5h2" />
                  <path d="M15 16h2a5 5 0 0 0 5-5v-2" />
                </svg>
                {isPathFindMode ? "选择目标节点..." : "查找到此节点的路径"}
              </button>
              {isPathFindMode && (
                <p className="mt-1.5 text-center text-[11px] text-amber-300/60">
                  点击图谱中另一个节点开始查找
                </p>
              )}
            </div>
          )}

          {/* 节点统计 */}
          {stats && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-star-dim">
                <ChartIcon size={14} />
                节点统计
              </h3>
              <div className="space-y-3 rounded-xl border border-space-500/40 bg-space-700/20 p-4">
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
                        backgroundColor: isEditing ? editColor : color,
                        boxShadow: `0 0 8px ${isEditing ? editColor : color}`,
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
                        backgroundColor: isEditing ? editColor : color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 上下节点快速跳转卡片 */}
          {(prevNode || nextNode) && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              {prevNode ? (
                <button
                  onClick={() => onNavigateNode(prevNode)}
                  className="group flex items-center gap-2 rounded-xl border border-space-500/40 bg-space-700/30 px-3 py-2.5 text-left transition-all hover:border-node-blue/40 hover:bg-space-700/60"
                  title="上一个节点 (Alt+↑)"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: GROUP_COLORS[prevNode.group],
                      boxShadow: `0 0 4px ${GROUP_COLORS[prevNode.group]}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-star-dim/50">
                      <ArrowUpIcon size={10} />
                      <span>上一个</span>
                    </div>
                    <div className="truncate text-sm font-medium text-star-white">
                      {prevNode.label}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dashed border-space-500/30 px-3 py-2.5 text-center text-xs text-star-dim/40">
                  已是第一个节点
                </div>
              )}
              {nextNode ? (
                <button
                  onClick={() => onNavigateNode(nextNode)}
                  className="group flex items-center gap-2 rounded-xl border border-space-500/40 bg-space-700/30 px-3 py-2.5 text-right transition-all hover:border-node-blue/40 hover:bg-space-600/60"
                  title="下一个节点 (Alt+↓)"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-star-dim/50">
                      <span>下一个</span>
                      <ArrowDownIcon size={10} />
                    </div>
                    <div className="truncate text-sm font-medium text-star-white">
                      {nextNode.label}
                    </div>
                  </div>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: GROUP_COLORS[nextNode.group],
                      boxShadow: `0 0 4px ${GROUP_COLORS[nextNode.group]}`,
                    }}
                  />
                </button>
              ) : (
                <div className="rounded-xl border border-dashed border-space-500/30 px-3 py-2.5 text-center text-xs text-star-dim/40">
                  已是最后一个节点
                </div>
              )}
            </div>
          )}

          {/* 操作提示 */}
          <div className="mt-6 rounded-xl border border-space-500/30 bg-space-700/20 p-3">
            <p className="text-center text-xs text-star-dim/60">
              双击节点可聚焦放大 · 右键打开菜单 · 按 Esc 关闭
            </p>
          </div>
        </div>
      </aside>

      {/* 边关系编辑弹窗 */}
      <EditEdgeModal
        open={editingEdge !== null}
        currentRelation={editingEdge?.relation ?? ""}
        sourceLabel={editingEdge?.sourceLabel ?? ""}
        targetLabel={editingEdge?.targetLabel ?? ""}
        onClose={() => setEditingEdge(null)}
        onConfirm={(newRelation) => {
          if (editingEdge && onEdgeUpdate) {
            onEdgeUpdate(editingEdge.sourceId, editingEdge.targetId, newRelation);
          }
          setEditingEdge(null);
        }}
      />
    </>,
    document.body
  );
}
