import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** 左侧彩色竖线颜色（任意 CSS 颜色值） */
  accentColor?: string;
}

/**
 * 通用卡片：深色半透明背景、细边框、16px 圆角，hover 时边框变亮。
 * 传入 accentColor 时在左侧渲染 3px 彩色竖线。
 */
export default function Card({
  children,
  className = "",
  accentColor,
}: CardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-space-500 bg-space-700/80 backdrop-blur-sm transition-all duration-300 hover:border-node-blue/50 ${className}`}
    >
      {accentColor && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </div>
  );
}
