import type { KnowledgeEdge } from "./types";

/**
 * BFS 最短路径查找：
 * 从 source 到 target，返回路径上的节点 id 数组。
 * 如果不可达返回 null。
 */
export function findShortestPath(
  sourceId: string,
  targetId: string,
  edges: KnowledgeEdge[]
): string[] | null {
  if (sourceId === targetId) return [sourceId];

  // 构建邻接表（无向图）
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }

  // BFS
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [sourceId];
  visited.add(sourceId);
  parent.set(sourceId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) {
      // 回溯路径
      const path: string[] = [];
      let node: string | null = targetId;
      while (node !== null) {
        path.unshift(node);
        node = parent.get(node) ?? null;
      }
      return path;
    }
    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null; // 不可达
}
