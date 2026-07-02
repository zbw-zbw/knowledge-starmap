"use client";

import { useState } from "react";
import type { ImportRecord } from "@/lib/types";
import { CopyIcon, TrashIcon } from "@/components/ui/Icons";

interface ImportHistoryProps {
  history: ImportRecord[];
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

/** 相对时间格式化 */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

/**
 * 导入历史列表：展示每次导入的标题、新增节点/边数、时间。
 * 鼠标悬停时显示「恢复文本」和「删除」按钮。
 */
export default function ImportHistory({
  history,
  onRestore,
  onDelete,
  onClearAll,
}: ImportHistoryProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-space-500/40 px-3 py-4 text-center">
        <p className="text-xs text-star-dim/60">暂无导入记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {history.length > 1 && onClearAll && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="rounded px-1.5 py-0.5 text-[10px] text-star-dim/50 transition-colors hover:bg-space-700/60 hover:text-star-dim"
            title="清空所有导入历史"
          >
            清空全部
          </button>
        </div>
      )}
      {history.map((record) => {
        const isHover = hoverId === record.id;
        return (
          <div
            key={record.id}
            onMouseEnter={() => setHoverId(record.id)}
            onMouseLeave={() => setHoverId(null)}
            className="group relative rounded-lg border border-space-500/40 bg-space-700/40 px-3 py-2.5 transition-all hover:border-space-500/60 hover:bg-space-700/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-star-white">
                {record.title}
              </span>
              <span className="shrink-0 text-xs text-star-dim/60">
                {formatRelativeTime(record.createdAt)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="text-node-blue">+{record.nodesCount} 节点</span>
              <span className="text-node-green">+{record.edgesCount} 关系</span>
            </div>
            {/* 悬停操作：恢复 + 删除 */}
            {isHover && (onRestore || onDelete) && (
              <div
                className="absolute right-2 top-2 flex gap-1 rounded-md bg-space-800/90 p-0.5 backdrop-blur-sm"
                style={{ animation: "fadeIn 150ms ease-out" }}
              >
                {onRestore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(record.id);
                    }}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-star-dim transition-colors hover:bg-space-700 hover:text-node-blue"
                    title="恢复文本到输入框"
                  >
                    <CopyIcon size={11} />
                    恢复
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(record.id);
                    }}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-star-dim transition-colors hover:bg-red-400/10 hover:text-red-300"
                    title="删除此条记录"
                  >
                    <TrashIcon size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
