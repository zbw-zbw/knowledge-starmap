"use client";

import { useState } from "react";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { ChevronDownIcon } from "@/components/ui/Icons";

/**
 * 图例组件：可收起/展开
 */
export default function Legend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-space-500/40 bg-space-800/80 backdrop-blur-sm">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-star-dim transition-colors hover:text-star-white"
      >
        <span>图例</span>
        <ChevronDownIcon
          size={14}
          className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
      {!collapsed && (
        <div className="space-y-1.5 px-3 pb-3">
          {Object.entries(GROUP_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
              />
              <span className="text-xs text-star-dim">{GROUP_LABELS[key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
