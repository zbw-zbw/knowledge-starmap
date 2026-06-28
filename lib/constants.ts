// 设计 Token 与全局常量

import type { SimulationConfig } from "./types";
import type { IconName } from "@/components/ui/Icons";

// 品牌信息
export const SITE = {
  name: "知识星图",
  tagline: "让你的知识像星空一样可见 · 可探索 · 可连接",
  description:
    "AI 驱动的个人知识图谱可视化工具 —— 把你学过的每一个概念连成星座，在星空下探索知识宇宙。",
  builtWith: "使用 Next.js + DeepSeek AI 构建",
} as const;

// 颜色 Token（与 tailwind.config.ts 保持一致，供 JS 侧使用）
export const COLORS = {
  space: {
    900: "#050816",
    800: "#0a0e27",
    700: "#0f1535",
    600: "#1a1a3e",
    500: "#252560",
  },
  star: {
    white: "#e8eaed",
    dim: "#9ca3af",
    glow: "#ffffff",
  },
  node: {
    blue: "#4fc3f7",
    green: "#66bb6a",
    purple: "#ab47bc",
    orange: "#ffb74d",
  },
} as const;

// 导航链接
export const NAV_LINKS = [
  { label: "功能介绍", href: "#features" },
  { label: "开始探索", href: "/app", primary: true },
] as const;

// 痛点数据
export const PAIN_POINTS = [
  {
    icon: "scatter" as IconName,
    title: "散落各处",
    desc: "笔记在 Notion，收藏在浏览器，灵感在备忘录，知识碎片散落 4-5 个工具。",
  },
  {
    icon: "unlink" as IconName,
    title: "互不关联",
    desc: "你学了 React 也学了设计模式，却不知道它们底层共享相同原则。",
  },
  {
    icon: "searchOff" as IconName,
    title: "找不回来",
    desc: "收藏了 100 篇文章，需要时永远找不到那篇。",
  },
] as const;

// 核心功能数据
export const FEATURES = [
  {
    icon: "import" as IconName,
    title: "智能导入",
    color: "blue",
    desc: "粘贴笔记、文章或 Markdown，AI 自动提取概念和关系，零手动整理。",
  },
  {
    icon: "discover" as IconName,
    title: "星图可视化",
    color: "white",
    desc: "力导向图谱，节点是概念，连线是关系，颜色是领域。拖拽、缩放、探索。",
  },
  {
    icon: "link" as IconName,
    title: "关联发现",
    color: "orange",
    desc: "AI 主动发现“你可能没注意到的知识关联”，打破信息孤岛。",
  },
  {
    icon: "book" as IconName,
    title: "知识探索",
    color: "green",
    desc: "点击节点展开知识卡片，查看来源、摘要、相关概念。",
  },
] as const;

// 使用流程步骤
export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "导入知识",
    desc: "粘贴文本、笔记或文章链接。",
  },
  {
    step: 2,
    title: "AI 解析",
    desc: "DeepSeek 自动提取概念与关系。",
  },
  {
    step: 3,
    title: "探索星图",
    desc: "在可交互图谱中发现知识关联。",
  },
] as const;

// 功能色映射（颜色名 -> 实际色值，供内联样式使用）
export const FEATURE_COLOR_MAP: Record<string, string> = {
  blue: COLORS.node.blue,
  green: COLORS.node.green,
  purple: COLORS.node.purple,
  orange: COLORS.node.orange,
  white: COLORS.star.white,
};

// ============================================================
// 力导向图谱相关常量
// ============================================================

// 默认力模拟参数
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  repulsionStrength: 1200,
  springStrength: 0.006,
  springLength: 120,
  gravityStrength: 0.0015,
  dampingFactor: 0.88,
  maxVelocity: 8,
};

// 模拟稳定阈值：所有节点速度之和低于此值则判定为稳定
export const STABILITY_THRESHOLD = 0.5;

// 缩放范围
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

// 缩放灵敏度（每次滚轮缩放比例）
export const ZOOM_SENSITIVITY = 0.0012;

// 标签显示阈值：节点 size >= 此值默认显示标签
export const LABEL_SIZE_THRESHOLD = 16;

// Canvas 高清屏 DPR 上限（避免超高 DPR 设备性能问题）
export const MAX_DPR = 2;

// ============================================================
// 知识导入相关常量
// ============================================================

// 文本最少字符数（不足时禁用提取按钮）
export const MIN_TEXT_LENGTH = 100;

// 导入历史最大记录数
export const MAX_IMPORT_HISTORY = 20;

// 新节点高亮持续时间（毫秒）
export const HIGHLIGHT_DURATION = 2000;

// DeepSeek API 超时时间（毫秒）
export const API_TIMEOUT = 30000;

// AI 关联发现最少节点数
export const MIN_NODES_FOR_DISCOVERY = 5;

// 搜索 debounce 延迟（毫秒）
export const SEARCH_DEBOUNCE = 300;

// 聚焦节点动画持续时间（毫秒）
export const FOCUS_ANIMATION_DURATION = 500;
