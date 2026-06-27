import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from "./types";

/**
 * 将新提取的图谱合并到已有图谱中。
 *
 * 合并规则：
 * 1. 节点按 id 去重，已存在的节点保留原数据（已有节点不会被覆盖）
 * 2. 边按 source+target 去重
 * 3. 跨文本关联：incoming 的边如果引用了 existing 中的节点 id，保留该边
 * 4. 过滤掉引用不存在节点的边
 *
 * @returns 合并后的新图谱（不修改输入参数）
 */
export function mergeGraphs(
  existing: KnowledgeGraph,
  incoming: KnowledgeGraph
): KnowledgeGraph {
  // 1. 合并节点：按 id 去重，已存在的保留原数据
  const existingNodeIds = new Set(existing.nodes.map((n) => n.id));
  const newNodes: KnowledgeNode[] = [...existing.nodes];

  for (const node of incoming.nodes) {
    if (!existingNodeIds.has(node.id)) {
      newNodes.push(node);
      existingNodeIds.add(node.id);
    }
  }

  // 2. 合并边：按 source+target 去重
  const edgeKeys = new Set(
    existing.edges.map((e) => `${e.source}->${e.target}`)
  );
  const newEdges: KnowledgeEdge[] = [...existing.edges];

  for (const edge of incoming.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!edgeKeys.has(key)) {
      newEdges.push(edge);
      edgeKeys.add(key);
    }
  }

  // 3. 过滤掉引用不存在节点的边
  const validEdges = newEdges.filter(
    (e) => existingNodeIds.has(e.source) && existingNodeIds.has(e.target)
  );

  return { nodes: newNodes, edges: validEdges };
}

/**
 * 计算合并后新增的节点 id 集合（用于高亮闪烁效果）。
 */
export function getNewNodeIds(
  existing: KnowledgeGraph,
  merged: KnowledgeGraph
): Set<string> {
  const existingIds = new Set(existing.nodes.map((n) => n.id));
  const newIds = new Set<string>();
  for (const node of merged.nodes) {
    if (!existingIds.has(node.id)) {
      newIds.add(node.id);
    }
  }
  return newIds;
}
