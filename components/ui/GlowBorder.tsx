import type { ReactNode } from "react";

interface GlowBorderProps {
  children: ReactNode;
  /** 发光颜色，默认 node-blue */
  color?: string;
  className?: string;
}

/**
 * 发光边框组件：用 CSS box-shadow 包裹子元素，呈现柔和的外发光效果。
 */
export default function GlowBorder({
  children,
  color = "rgba(79, 195, 247, 0.45)",
  className = "",
}: GlowBorderProps) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${className}`}
      style={{
        boxShadow: `0 0 0 1px ${color}, 0 0 20px ${color}`,
      }}
    >
      {children}
    </div>
  );
}
