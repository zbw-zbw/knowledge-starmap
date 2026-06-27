import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  children: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: () => void;
  "aria-label"?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-node-blue text-space-900 font-semibold hover:brightness-110 hover:shadow-[0_0_24px_rgba(79,195,247,0.6)]",
  secondary:
    "border border-space-500 text-star-white hover:border-node-blue/60 hover:bg-space-600/40",
  ghost: "text-star-dim hover:text-star-white hover:bg-space-600/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-lg",
  md: "px-6 py-2.5 text-base rounded-xl",
  lg: "px-8 py-3.5 text-lg rounded-xl",
};

/**
 * 通用按钮组件。
 * - primary：node-blue 背景，hover 微弱发光
 * - secondary：透明边框
 * - ghost：无边框
 * 传入 href 时渲染为 Next.js Link，否则渲染为 <button>。
 */
export default function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center transition-all duration-300 select-none",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
