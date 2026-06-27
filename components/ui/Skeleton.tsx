/**
 * 骨架屏组件：用于加载状态占位。
 * 使用 CSS shimmer 动画（定义在 globals.css）。
 */

interface SkeletonProps {
  className?: string;
}

/** 基础骨架条 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded ${className}`}
      aria-hidden
    />
  );
}

/** 卡片骨架（模拟发现结果卡片） */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-space-500/30 bg-space-700/30 p-3">
      <Skeleton className="h-3 w-20" />
      <div className="mt-2 space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-2 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** 列表骨架（模拟导入历史/搜索结果） */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg p-2"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
