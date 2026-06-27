// 知识节点
export interface KnowledgeNode {
  id: string;
  label: string;
  group: "frontend" | "backend" | "pattern" | "engineering" | "general";
  size: number; // 节点大小权重 10-30
  description?: string;
  sources?: string[]; // 来源文章/笔记
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

// 知识关系
export interface KnowledgeEdge {
  source: string; // 源节点 id
  target: string; // 目标节点 id
  relation: string; // 关系描述，如 "基于"、"使用"、"属于"
  strength?: number; // 关系强度 0-1
}

// 知识图谱
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// 节点分组类型
export type NodeGroup =
  | "frontend"
  | "backend"
  | "pattern"
  | "engineering"
  | "general";

// 节点分组颜色映射
export const GROUP_COLORS: Record<string, string> = {
  frontend: "#4fc3f7",
  backend: "#66bb6a",
  pattern: "#ab47bc",
  engineering: "#ffb74d",
  general: "#9ca3af",
};

// 节点分组中文名映射
export const GROUP_LABELS: Record<string, string> = {
  frontend: "前端技术",
  backend: "后端技术",
  pattern: "设计模式与思想",
  engineering: "工程化",
  general: "通用知识",
};

// ============================================================
// 力导向图谱相关类型
// ============================================================

// 力模拟节点（带实时位置与速度）
export interface SimulationNode extends KnowledgeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null; // 固定位置 x（拖拽时设置，模拟时跳过受力）
  fy?: number | null; // 固定位置 y
}

// 视口变换（平移 + 缩放）
export interface Transform {
  x: number;
  y: number;
  scale: number;
}

// 力模拟参数配置
export interface SimulationConfig {
  repulsionStrength: number; // 斥力强度
  springStrength: number; // 弹簧强度
  springLength: number; // 弹簧自然长度
  gravityStrength: number; // 中心引力
  dampingFactor: number; // 阻尼系数
  maxVelocity: number; // 最大速度限制
}

// ============================================================
// 知识导入相关类型
// ============================================================

// 导入记录
export interface ImportRecord {
  id: string;
  title: string; // AI 自动生成的标题或用户输入的前20字
  text: string; // 原始文本（截取前200字存储）
  nodesCount: number; // 提取的节点数
  edgesCount: number; // 提取的边数
  createdAt: string; // ISO 时间戳
}

// API 请求体
export interface ExtractRequest {
  text: string;
  existingNodes?: string[]; // 已有节点ID列表，用于发现关联
}

// API 响应体
export interface ExtractResponse {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  title: string; // AI 生成的内容标题
  summary: string; // AI 生成的内容摘要
}

// ============================================================
// AI 关联发现相关类型
// ============================================================

// AI 发现的关联
export interface Discovery {
  id: string;
  type: "hidden-link" | "knowledge-gap" | "cluster";
  title: string;
  description: string;
  relatedNodes: string[]; // 涉及的节点 id
  suggestedEdges?: KnowledgeEdge[]; // 建议添加的边
  confidence: number; // 置信度 0-1
}

// 发现 API 请求体
export interface DiscoverRequest {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// 发现 API 响应体
export interface DiscoverResponse {
  discoveries: Discovery[];
}
