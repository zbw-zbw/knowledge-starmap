"use client";

export type MobileSheetType = "search" | "import" | "discover" | "settings" | null;

interface MobileToolbarProps {
  activeSheet: MobileSheetType;
  onSheetChange: (sheet: MobileSheetType) => void;
}

const TOOLS = [
  { key: "search" as const, icon: "🔍", label: "搜索" },
  { key: "import" as const, icon: "📥", label: "导入" },
  { key: "discover" as const, icon: "🔮", label: "发现" },
  { key: "settings" as const, icon: "⚙", label: "设置" },
];

/**
 * 移动端底部工具栏：
 * 4 个图标按钮等宽分布，点击切换底部浮层面板。
 * 仅在 < 768px 时显示（md:hidden）。
 */
export default function MobileToolbar({
  activeSheet,
  onSheetChange,
}: MobileToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-space-500/60 bg-space-800/95 backdrop-blur-md md:hidden">
      {TOOLS.map((tool) => {
        const isActive = activeSheet === tool.key;
        return (
          <button
            key={tool.key}
            onClick={() => onSheetChange(isActive ? null : tool.key)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 ${
              isActive ? "text-node-blue" : "text-star-dim"
            }`}
            aria-label={tool.label}
          >
            <span className="text-lg">{tool.icon}</span>
            <span className="text-[10px]">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}
