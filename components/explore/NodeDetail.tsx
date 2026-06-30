"use client";

import { useMemo, useState, useCallback } from "react";
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
  PencilIcon,
  TrashIcon,
  CheckIcon,
} from "@/components/ui/Icons";

interface NodeDetailProps {
  node: KnowledgeNode | null;
  graph: KnowledgeGraph;
  onClose: () => void;
  onNavigateNode: (node: KnowledgeNode) => void;
  onNodeUpdate: (id: string, updates: Partial<KnowledgeNode>) => void;
  onNodeDelete: (id: string) => void;
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
 * 支持编辑模式和删除节点。
 * 点击关联概念可跳转到该节点的详情。
 */
export default function NodeDetail({
  node,
  graph,
  onClose,
  onNavigateNode,
  onNodeUpdate,
  onNodeDelete,
}: NodeDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGroup, setEditGroup] = useState<NodeGroup>("general");

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

    return { directCount, strengthPct, coreness };
  }, [node, graph, related]);

  // 进入编辑模式时，用当前节点值填充编辑状态
  const enterEditMode = useCallback(() => {
    if (!node) return;
    setEditLabel(node.label);
    setEditDescription(node.description || "");
    setEditGroup(node.group);
    setIsEditing(true);
  }, [node]);

  // 保存编辑
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

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // 标题输入框 blur 时保存
  const handleLabelBlur = useCallback(() => {
    if (node && editLabel.trim() && editLabel.trim() !== node.label) {
      onNodeUpdate(node.id, { label: editLabel.trim() });
    }
  }, [node, editLabel, onNodeUpdate]);

  // 描述 textarea blur 时保存
  const handleDescriptionBlur = useCallback(() => {
    if (node) {
      const newDesc = editDescription || undefined;
      if (newDesc !== node.description) {
        onNodeUpdate(node.id, { description: newDesc });
      }
    }
  }, [node, editDescription, onNodeUpdate]);

  // 分组选择变化时立即保存
  const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = e.target.value as NodeGroup;
    setEditGroup(newGroup);
    if (node && newGroup !== node.group) {
      onNodeUpdate(node.id, { group: newGroup });
    }
  }, [node, onNodeUpdate]);

  if (!node || typeof document === "undefined") return null;

  const color = GROUP_COLORS[node.group];
  const editColor = GROUP_COLORS[editGroup];

  return createPortal(
    <>
      {/* 移动端背景遮罩 */}
      <div
        className="fixed inset-0 z-40 bg-space-900/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* 详情面板 */}
      <aside
        className="fixed bottom-0 left-0 right-0 z-50 h-[60vh] overflow-y-auto rounded-t-2xl bg-space-800 shadow-2xl transition-transform duration-300 ease-out md:top-0 md:right-0 md:h-[100dvh] md:w-[360px] md:rounded-none relative"
        style={{
          animation: "slideInRight 300ms ease-out",
        }}
      >
        {/* 顶部栏 */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-space-800/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="hidden items-center gap-1 text-sm text-star-dim transition-colors hover:text-star-white md:flex"
            >
              <ArrowLeftIcon size={16} />
              返回
            </button>
            {/* 编辑按钮 */}
            <button
              onClick={isEditing ? saveEdit : enterEditMode}
              className="flex items-center gap-1 rounded-lg border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-node-blue/60 hover:text-node-blue"
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
                className="rounded-lg border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-space-400 hover:text-star-white"
              >
                取消
              </button>
            )}
          </div>
          {/* 移动端居中关闭按钮 */}
          <div className="md:hidden flex w-full justify-center">
            <div className="h-1 w-10 rounded-full bg-space-500" />
          </div>
          <div className="flex items-center gap-2">
            {/* 删除按钮 */}
            <button
              onClick={() => onNodeDelete(node.id)}
              className="rounded-lg border border-red-500/50 px-2 py-1 text-xs text-red-400 transition-all hover:border-red-400 hover:bg-red-400/10 hover:text-red-300"
              aria-label="删除节点"
            >
              <TrashIcon size={14} />
            </button>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-space-700 p-1.5 text-star-dim transition-colors hover:text-star-white md:static md:rounded-none md:bg-transparent md:p-0"
              aria-label="关闭"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* 节点标题 */}
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
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
                onBlur={handleLabelBlur}
                className="flex-1 rounded-lg border border-space-500 bg-space-700 px-3 py-1.5 text-xl font-semibold text-star-white outline-none focus:border-node-blue/60"
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-semibold text-star-white">
                {node.label}
              </h2>
            )}
          </div>
          {isEditing ? (
            <div className="mt-2">
              <select
                value={editGroup}
                onChange={handleGroupChange}
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
                  onBlur={handleDescriptionBlur}
                  rows={4}
                  className="w-full rounded-lg border border-space-500 bg-space-700 px-3 py-2 text-sm leading-relaxed text-star-white outline-none focus:border-node-blue/60 resize-none"
                  placeholder="添加节点描述..."
                />
              ) : (
                <p className="text-sm leading-relaxed text-star-white/80">
                  {node.description}
                </p>
              )}
            </div>
          )}

          {/* 关联概念 */}
          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-star-dim">
                <LinkIcon size={14} />
                关联概念（{related.length}）
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
                      <span className="text-star-dim/30 transition-colors group-hover:text-node-blue">
                        <ArrowRightIcon size={14} />
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
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-star-dim">
                <ChartIcon size={14} />
                节点统计
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

          {/* 键盘快捷键提示 */}
          <p className="mt-8 text-center text-xs text-star-dim/50">
            按 Esc 关闭 · 按 ? 查看快捷键
          </p>
        </div>
      </aside>
    </>,
    document.body
  );
}
