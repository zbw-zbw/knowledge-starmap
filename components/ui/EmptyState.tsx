"use client";

import { ReactNode } from "react";
import type { ComponentType } from "react";
import { SparkleIcon, SearchOffIcon, DiscoverIcon, type IconProps } from "@/components/ui/Icons";

interface EmptyStateProps {
  icon?: string;
  Icon?: ComponentType<IconProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  sparkle: SparkleIcon,
  searchOff: SearchOffIcon,
  discover: DiscoverIcon,
};

/**
 * 通用空状态占位组件。
 * 支持 SVG 图标名称或直接传入 Icon 组件。
 */
export default function EmptyState({
  icon = "sparkle",
  Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const ResolvedIcon = Icon ?? ICON_MAP[icon] ?? SparkleIcon;

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="opacity-40 transition-opacity hover:opacity-70">
        <ResolvedIcon size={64} className="text-node-blue" />
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
