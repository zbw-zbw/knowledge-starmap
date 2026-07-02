import type { SimulationNode } from "./types";

/**
 * 环形布局：将节点均匀排列在一个圆环上
 */
export function circularLayout(nodes: SimulationNode[], centerX: number, centerY: number, radius: number): void {
  const n = nodes.length;
  if (n === 0) return;
  const angleStep = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const angle = angleStep * i - Math.PI / 2; // 从顶部开始
    nodes[i].x = centerX + radius * Math.cos(angle);
    nodes[i].y = centerY + radius * Math.sin(angle);
    nodes[i].vx = 0;
    nodes[i].vy = 0;
  }
}

/**
 * 网格布局：将节点排列为等距网格
 */
export function gridLayout(nodes: SimulationNode[], centerX: number, centerY: number, spacing: number): void {
  const n = nodes.length;
  if (n === 0) return;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const offsetX = centerX - ((cols - 1) * spacing) / 2;
  const offsetY = centerY - ((rows - 1) * spacing) / 2;
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes[i].x = offsetX + col * spacing;
    nodes[i].y = offsetY + row * spacing;
    nodes[i].vx = 0;
    nodes[i].vy = 0;
  }
}
