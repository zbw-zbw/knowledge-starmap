import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";

interface LegendProps {
  className?: string;
}

/**
 * 图例组件：水平排列展示各分组颜色与名称，融入深色主题。
 */
export default function Legend({ className = "" }: LegendProps) {
  const groups = Object.keys(GROUP_COLORS);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-space-500/50 bg-space-700/60 px-4 py-2.5 backdrop-blur-sm ${className}`}
    >
      {groups.map((group) => (
        <div key={group} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: GROUP_COLORS[group],
              boxShadow: `0 0 6px ${GROUP_COLORS[group]}`,
            }}
          />
          <span className="text-xs text-star-dim">{GROUP_LABELS[group]}</span>
        </div>
      ))}
    </div>
  );
}
