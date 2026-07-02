"use client";

import { useState } from "react";
import type { Discovery, KnowledgeEdge } from "@/lib/types";
import { COLORS } from "@/lib/constants";
import {
  DiscoverIcon,
  LinkIcon,
  LightbulbIcon,
  GlobeIcon,
  SparkleIcon,
  WarningIcon,
  CheckIcon,
  UnlinkIcon,
} from "@/components/ui/Icons";
import type { IconProps } from "@/components/ui/Icons";
import type { ComponentType } from "react";

interface DiscoveryPanelProps {
  discoveries: Discovery[];
  isDiscovering: boolean;
  error: string | null;
  nodeCount: number;
  onDiscover: () => void;
  onAddEdges: (edges: KnowledgeEdge[]) => void;
  onIgnore: (id: string) => void;
  onHoverNodes: (nodeIds: string[] | null) => void;
}

type IconComponent = ComponentType<IconProps>;

const DISCOVERY_META: Record<Discovery["type"], { Icon: IconComponent; color: string }> = {
  "hidden-link": { Icon: LinkIcon, color: COLORS.node.orange },
  "knowledge-gap": { Icon: LightbulbIcon, color: COLORS.node.purple },
  cluster: { Icon: GlobeIcon, color: COLORS.node.blue },
};

const TYPE_LABELS: Record<Discovery["type"], string> = {
  "hidden-link": "隐藏关联",
  "knowledge-gap": "知识盲区",
  cluster: "概念集群",
};

/**
 * AI 关联发现面板：触发 AI 分析，展示发现结果，
 * 支持添加建议关联、忽略、hover 高亮涉及节点。
 */
export default function DiscoveryPanel({
  discoveries,
  isDiscovering,
  error,
  nodeCount,
  onDiscover,
  onAddEdges,
  onIgnore,
  onHoverNodes,
}: DiscoveryPanelProps) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const canDiscover = nodeCount >= 5 && !isDiscovering;

  const handleAdd = (discovery: Discovery) => {
    if (discovery.suggestedEdges && discovery.suggestedEdges.length > 0) {
      onAddEdges(discovery.suggestedEdges);
      setAddedIds((prev) => new Set(prev).add(discovery.id));
    }
  };

  // 批量操作：找出所有可添加（带 suggestedEdges 且未添加过）的发现
  const addableDiscoveries = discoveries.filter(
    (d) => d.suggestedEdges && d.suggestedEdges.length > 0 && !addedIds.has(d.id)
  );
  const pendingCount = addableDiscoveries.length;

  const handleAcceptAll = () => {
    addableDiscoveries.forEach((d) => {
      if (d.suggestedEdges && d.suggestedEdges.length > 0) {
        onAddEdges(d.suggestedEdges);
        setAddedIds((prev) => new Set(prev).add(d.id));
      }
    });
  };

  const handleIgnoreAll = () => {
    addableDiscoveries.forEach((d) => onIgnore(d.id));
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <DiscoverIcon size={14} className="text-star-dim" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-star-dim">
          AI 关联发现
        </h3>
      </div>

      <button
        onClick={onDiscover}
        disabled={!canDiscover}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-node-purple/80 px-4 py-2.5 text-sm font-medium text-star-white transition-all hover:bg-node-purple hover:shadow-[0_0_16px_rgba(171,71,188,0.4)] disabled:cursor-not-allowed disabled:bg-space-600 disabled:text-star-dim disabled:shadow-none"
      >
        <SparkleIcon size={16} />
        {isDiscovering ? "正在分析..." : "发现隐藏关联"}
      </button>

      {nodeCount < 5 && !isDiscovering && (
        <p className="mt-1.5 text-xs text-star-dim/60">
          至少需要 5 个节点才能分析关联
        </p>
      )}

      {/* 错误提示 */}
      {error && !isDiscovering && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2">
          <WarningIcon size={14} className="shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* 加载骨架屏 */}
      {isDiscovering && (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-space-500/30 bg-space-700/30 p-3"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="h-3 w-20 rounded bg-space-600/60" />
              <div className="mt-2 h-2 w-full rounded bg-space-600/40" />
              <div className="mt-1 h-2 w-2/3 rounded bg-space-600/40" />
            </div>
          ))}
        </div>
      )}

      {/* 发现结果列表 */}
      {!isDiscovering && discoveries.length > 0 && (
        <>
          {/* 批量操作栏：仅在有可添加项时显示 */}
          {pendingCount > 0 && (
            <div
              className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-space-500/50 bg-space-700/40 px-3 py-2"
              style={{ animation: "fadeInUp 250ms ease-out both" }}
            >
              <span className="text-xs text-star-dim">
                {pendingCount} 项可批量处理
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={handleAcceptAll}
                  className="flex items-center gap-1 rounded-md bg-node-blue/20 px-2 py-1 text-xs font-medium text-node-blue transition-all hover:bg-node-blue/30"
                  title="接受所有可添加的发现"
                >
                  <CheckIcon size={12} />
                  全部接受
                </button>
                <button
                  onClick={handleIgnoreAll}
                  className="flex items-center gap-1 rounded-md border border-space-500 px-2 py-1 text-xs text-star-dim transition-all hover:border-red-400/40 hover:text-red-300"
                  title="忽略所有可处理的发现"
                >
                  <UnlinkIcon size={12} />
                  全部忽略
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-2">
          {discoveries.map((discovery, idx) => {
            const meta = DISCOVERY_META[discovery.type];
            const isAdded = addedIds.has(discovery.id);
            return (
              <div
                key={discovery.id}
                className="group rounded-lg border border-space-500/40 bg-space-700/40 p-3 transition-all hover:border-space-500/60 hover:bg-space-700/60"
                style={{
                  animation: `fadeInUp 300ms ease-out ${idx * 100}ms both`,
                }}
                onMouseEnter={() => onHoverNodes(discovery.relatedNodes)}
                onMouseLeave={() => onHoverNodes(null)}
              >
                {/* 类型标签 + 标题 */}
                <div className="flex items-center gap-2">
                  <meta.Icon size={16} className="shrink-0" style={{ color: meta.color }} />
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${meta.color}20`,
                      color: meta.color,
                    }}
                  >
                    {TYPE_LABELS[discovery.type]}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-star-white">
                    {discovery.title}
                  </span>
                </div>

                {/* 描述 */}
                <p className="mt-2 text-xs leading-relaxed text-star-dim">
                  {discovery.description}
                </p>

                {/* 置信度 */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-star-dim/60">置信度</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-space-600">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${discovery.confidence * 100}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-star-dim/60">
                    {Math.round(discovery.confidence * 100)}%
                  </span>
                </div>

                {/* 操作按钮 */}
                <div className="mt-3 flex gap-2">
                  {discovery.suggestedEdges &&
                    discovery.suggestedEdges.length > 0 && (
                      <button
                        onClick={() => handleAdd(discovery)}
                        disabled={isAdded}
                        className="flex items-center gap-1 rounded-lg bg-node-blue/20 px-2.5 py-1 text-xs font-medium text-node-blue transition-all hover:bg-node-blue/30 disabled:opacity-40"
                      >
                        {isAdded ? (
                          <>
                            已添加
                            <CheckIcon size={12} />
                          </>
                        ) : (
                          "添加关联"
                        )}
                      </button>
                    )}
                  {(!discovery.suggestedEdges ||
                    discovery.suggestedEdges.length === 0) &&
                    discovery.type === "knowledge-gap" && (
                      <span className="flex items-center gap-1 rounded-lg bg-node-purple/10 px-2.5 py-1 text-xs font-medium text-node-purple/80">
                        <LightbulbIcon size={12} />
                        建议补充
                      </span>
                    )}
                  <button
                    onClick={() => onIgnore(discovery.id)}
                    className="rounded-lg border border-space-500 px-2.5 py-1 text-xs text-star-dim transition-all hover:border-space-500/60 hover:text-star-white"
                  >
                    忽略
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}

      {/* 空状态 */}
      {!isDiscovering && discoveries.length === 0 && canDiscover && (
        <p className="mt-2 text-center text-xs text-star-dim/60">
          点击按钮，让 AI 分析你的知识图谱
        </p>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
