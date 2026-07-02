/**
 * 图谱公共工具函数
 * 消除多处重复的度数计算和文本高亮逻辑
 */

import type { KnowledgeEdge, KnowledgeNode } from "./types";

/**
 * 计算所有节点的度数（无向图，每条边给两端各 +1）
 */
export function computeDegreeMap(edges: KnowledgeEdge[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of edges) {
    map.set(e.source, (map.get(e.source) || 0) + 1);
    map.set(e.target, (map.get(e.target) || 0) + 1);
  }
  return map;
}

/**
 * 根据度数计算节点大小：10 + min(20, degree * 2)，范围 [10, 30]
 */
export function degreeToSize(degree: number): number {
  return 10 + Math.min(20, degree * 2);
}

/**
 * 获取节点的度数
 */
export function getNodeDegree(nodeId: string, degreeMap: Map<string, number>): number {
  return degreeMap.get(nodeId) || 0;
}

/**
 * 按度数降序排列节点，返回 Top N
 */
export function topNodesByDegree(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  n: number
): Array<{ node: KnowledgeNode; degree: number }> {
  const degreeMap = computeDegreeMap(edges);
  return nodes
    .map((node) => ({ node, degree: degreeMap.get(node.id) || 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, n);
}
