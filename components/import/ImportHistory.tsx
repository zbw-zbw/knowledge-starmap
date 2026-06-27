"use client";

import type { ImportRecord } from "@/lib/types";

interface ImportHistoryProps {
  history: ImportRecord[];
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
 */
export default function ImportHistory({ history }: ImportHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-space-500/40 px-3 py-4 text-center">
        <p className="text-xs text-star-dim/60">暂无导入记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {history.map((record) => (
        <div
          key={record.id}
          className="group rounded-lg border border-space-500/40 bg-space-700/40 px-3 py-2.5 transition-all hover:border-space-500/60 hover:bg-space-700/60"
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
        </div>
      ))}
    </div>
  );
}
