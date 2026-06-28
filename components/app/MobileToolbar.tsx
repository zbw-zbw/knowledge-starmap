"use client";

import { type ComponentType } from "react";
import {
  SearchIcon,
  ImportIcon,
  DiscoverIcon,
  SettingsIcon,
} from "@/components/ui/Icons";

export type MobileSheetType = "search" | "import" | "discover" | "settings" | null;

interface MobileToolbarProps {
  activeSheet: MobileSheetType;
  onSheetChange: (sheet: MobileSheetType) => void;
}

interface Tool {
  id: "search" | "import" | "discover" | "settings";
  Icon: ComponentType<{ className?: string; size?: number }>;
  label: string;
}

const TOOLS: Tool[] = [
  { id: "search", Icon: SearchIcon, label: "搜索" },
  { id: "import", Icon: ImportIcon, label: "导入" },
  { id: "discover", Icon: DiscoverIcon, label: "发现" },
  { id: "settings", Icon: SettingsIcon, label: "设置" },
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
    <div className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around bg-space-800/95 backdrop-blur-md md:hidden">
      {TOOLS.map((tool) => {
        const isActive = activeSheet === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onSheetChange(isActive ? null : tool.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 ${
              isActive ? "text-node-blue" : "text-star-dim"
            }`}
            aria-label={tool.label}
          >
            <tool.Icon size={20} />
            <span className="text-[10px]">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}
