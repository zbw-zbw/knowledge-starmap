/**
 * SVG 图标组件库
 * 统一替换所有 emoji，使用纯 SVG 线条图标
 * 所有图标继承 currentColor，可通过 className/style 控制颜色和大小
 */

export interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

/** 星形图标 — 品牌标识 */
export function SparkleIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
    </svg>
  );
}

/** 导入图标 */
export function ImportIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

/** 搜索图标 */
export function SearchIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** 发现图标 */
export function DiscoverIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z" />
    </svg>
  );
}

/** 设置图标 */
export function SettingsIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/** 警告图标 */
export function WarningIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4m0 4h.01" />
    </svg>
  );
}

/** 信息图标 */
export function InfoIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

/** 关闭图标 */
export function CloseIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** 箭头右 */
export function ArrowRightIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/** 箭头左 */
export function ArrowLeftIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

/** 向下箭头 */
export function ChevronDownIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** 勾选图标 */
export function CheckIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** 书籍图标 */
export function BooksIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

/** 链接图标 */
export function LinkIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** 知识/书本图标 */
export function BookIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

/** 灯泡图标 */
export function LightbulbIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z" />
    </svg>
  );
}

/** 地球图标 */
export function GlobeIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

/** 重置图标 */
export function ResetIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

/** 描述/笔记图标 */
export function NoteIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

/** 图表图标 */
export function ChartIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

/** 加号图标 */
export function PlusIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** 减号图标 */
export function MinusIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}

/** 散落图标 */
export function ScatterIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/** 断开链接图标 */
export function UnlinkIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M9 17H7A5 5 0 017 7h2" />
      <path d="M15 7h2a5 5 0 010 10h-2" />
      <path d="M8 12h8" />
    </svg>
  );
}

/** 搜索无结果图标 */
export function SearchOffIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11l6 0" />
    </svg>
  );
}

/** 铅笔/编辑图标 */
export function PencilIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/** 垃圾桶/删除图标 */
export function TrashIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/** 下载图标 */
export function DownloadIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg {...base} width={size} height={size} className={className} style={style} aria-hidden>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** 图标名称到组件的映射 */
export const ICON_MAP = {
  sparkle: SparkleIcon,
  import: ImportIcon,
  search: SearchIcon,
  discover: DiscoverIcon,
  settings: SettingsIcon,
  warning: WarningIcon,
  info: InfoIcon,
  close: CloseIcon,
  arrowRight: ArrowRightIcon,
  arrowLeft: ArrowLeftIcon,
  chevronDown: ChevronDownIcon,
  check: CheckIcon,
  books: BooksIcon,
  link: LinkIcon,
  book: BookIcon,
  lightbulb: LightbulbIcon,
  globe: GlobeIcon,
  reset: ResetIcon,
  note: NoteIcon,
  chart: ChartIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  scatter: ScatterIcon,
  unlink: UnlinkIcon,
  searchOff: SearchOffIcon,
  pencil: PencilIcon,
  trash: TrashIcon,
  download: DownloadIcon,
} as const;

export type IconName = keyof typeof ICON_MAP;
