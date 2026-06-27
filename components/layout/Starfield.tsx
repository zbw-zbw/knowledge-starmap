import type { ReactNode } from "react";

interface StarfieldProps {
  children?: ReactNode;
}

/**
 * 星点背景层：纯 CSS radial-gradient 生成的固定全屏星空。
 * - 一层静态密集星点（36 个微弱光点）
 * - 三层闪烁星点（不同 animation-delay，错落闪烁）
 * 挂载在 Layout 中，z-0 位于内容之下。
 */
export default function Starfield({ children }: StarfieldProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="star-layer star-layer--static" />
      <div className="star-layer star-layer--twinkle star-layer--twinkle-a" />
      <div className="star-layer star-layer--twinkle star-layer--twinkle-b" />
      <div className="star-layer star-layer--twinkle star-layer--twinkle-c" />
      {children}
    </div>
  );
}
