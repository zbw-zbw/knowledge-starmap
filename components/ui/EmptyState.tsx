"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * 通用空状态占位组件。
 * 包含主图标（emoji）、标题、描述和可选操作按钮。
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="text-5xl opacity-50 transition-opacity hover:opacity-70">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-medium text-star-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-star-dim">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
