import {
  GROUP_COLORS,
  type KnowledgeEdge,
  type SimulationNode,
  type Transform,
} from "@/lib/types";
import { COLORS, LABEL_SIZE_THRESHOLD } from "@/lib/constants";

/** 将十六进制颜色转为 rgba 字符串 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 获取节点在画布坐标系中的半径（不含缩放） */
function nodeRadius(node: SimulationNode): number {
  return Math.max(4, node.size * 0.5);
}

/** 计算与高亮节点关联的节点 id 集合与边集合 */
function computeRelated(
  edges: KnowledgeEdge[],
  highlightId: string | null
): {
  relatedNodeIds: Set<string>;
  relatedEdgeIndexes: Set<number>;
} {
  const relatedNodeIds = new Set<string>();
  const relatedEdgeIndexes = new Set<number>();
  if (!highlightId) return { relatedNodeIds, relatedEdgeIndexes };

  edges.forEach((edge, i) => {
    if (edge.source === highlightId || edge.target === highlightId) {
      relatedEdgeIndexes.add(i);
      relatedNodeIds.add(edge.source);
      relatedNodeIds.add(edge.target);
    }
  });
  return { relatedNodeIds, relatedEdgeIndexes };
}

/**
 * Canvas 渲染主函数：从底到顶依次绘制背景、边、节点、标签、关系标签。
 * 调用方需在每帧开始时执行 ctx.setTransform(dpr,0,0,dpr,0,0) 将 ctx 置于
 * CSS 像素空间（DPR 已应用），本函数在此基础上叠加图谱 transform。
 *
 * @param highlightNodeIds 新导入节点的高亮集合（脉冲闪烁效果），null 表示无高亮
 * @param dimNodeIds 需要变暗的节点 id 集合（搜索/筛选时非匹配节点变暗），null 表示不变暗
 * @param visibleGroups 可见分组集合，null 表示全部可见
 * @param showLabels 是否绘制节点名称标签，默认 true
 */
export function renderGraph(
  ctx: CanvasRenderingContext2D,
  nodes: SimulationNode[],
  edges: KnowledgeEdge[],
  transform: Transform,
  hoveredNode: SimulationNode | null,
  selectedNode: SimulationNode | null,
  canvasWidth: number,
  canvasHeight: number,
  highlightNodeIds: Set<string> | null = null,
  dimNodeIds: Set<string> | null = null,
  visibleGroups: Set<string> | null = null,
  showLabels: boolean = true
): void {
  // 1. 清空画布 —— 填充深空背景（当前已在 CSS 像素空间）
  ctx.fillStyle = COLORS.space[900];
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 1.5 绘制极淡的网格线（辅助空间感知）
  ctx.strokeStyle = "rgba(37, 37, 96, 0.08)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }
  ctx.stroke();

  // 2. 应用图谱变换（平移 + 缩放）
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);

  // 确定高亮目标：选中优先，其次 hover
  const highlightNode = selectedNode ?? hoveredNode;
  const highlightId = highlightNode?.id ?? null;
  const { relatedNodeIds, relatedEdgeIndexes } = computeRelated(
    edges,
    highlightId
  );

  // 视口裁剪辅助：判断图坐标点是否在可视区域内（含边距）
  const margin = 80;
  const visLeft = -transform.x / transform.scale - margin;
  const visRight =
    (canvasWidth - transform.x) / transform.scale + margin;
  const visTop = -transform.y / transform.scale - margin;
  const visBottom =
    (canvasHeight - transform.y) / transform.scale + margin;
  const isVisible = (x: number, y: number) =>
    x > visLeft && x < visRight && y > visTop && y < visBottom;

  // 节点 id -> 节点映射，用于边端点查找
  const nodeMap = new Map<string, SimulationNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // 3. 绘制边（连线）
  ctx.lineCap = "round";
  edges.forEach((edge, i) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;
    if (!isVisible(source.x, source.y) && !isVisible(target.x, target.y))
      return;

    // 领域筛选：两端节点都不在可见分组时，跳过
    if (visibleGroups) {
      const sourceVisible = visibleGroups.has(source.group);
      const targetVisible = visibleGroups.has(target.group);
      if (!sourceVisible && !targetVisible) return;
    }

    const isRelated = relatedEdgeIndexes.has(i);
    const hasHighlight = highlightId !== null;
    const isDimmed = dimNodeIds
      ? dimNodeIds.has(edge.source) && dimNodeIds.has(edge.target)
      : false;

    if (hasHighlight && isRelated) {
      // 关联边：对应节点颜色半透明，加粗
      const color = GROUP_COLORS[highlightNode!.group] ?? COLORS.star.white;
      ctx.strokeStyle = hexToRgba(color, 0.45);
      ctx.lineWidth = 2 / transform.scale;
    } else if (isDimmed) {
      // 被变暗的边（搜索/筛选时非匹配）
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1 / transform.scale;
    } else if (hasHighlight) {
      // 非关联边（有高亮时）：更暗
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1 / transform.scale;
    } else {
      // 普通边
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.2 / transform.scale;
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    // 方向箭头（在边的中点附近，指向 target）
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 30) {
      const arrowSize = 6 / transform.scale;
      const arrowPos = 0.55; // 箭头位置（中点偏 target 侧）
      const ax = source.x + dx * arrowPos;
      const ay = source.y + dy * arrowPos;
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowSize * Math.cos(angle - Math.PI / 6),
        ay - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ax - arrowSize * Math.cos(angle + Math.PI / 6),
        ay - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  });

  // 4. 绘制节点（圆形）
  // 新节点高亮的脉冲动画相位（0~1，每秒循环）
  const pulsePhase = (Date.now() % 1000) / 1000;
  // 选中节点扩散环动画相位（0~1，每 1.5 秒循环）
  const ringPhase = (Date.now() % 1500) / 1500;
  for (const node of nodes) {
    if (!isVisible(node.x, node.y)) continue;

    // 呼吸动画：半径 ±1px，周期 3-5 秒（用位置做偏移避免同步）
    const breathPhase = (Date.now() % 4000 + (node.x + node.y) * 10) / 4000;
    const breathOffset = Math.sin(breathPhase * Math.PI * 2) * 1;
    const r = nodeRadius(node) + breathOffset;
    const color = GROUP_COLORS[node.group] ?? COLORS.star.dim;
    const isHighlight = node.id === highlightId;
    const isRelated = relatedNodeIds.has(node.id);
    const hasHighlight = highlightId !== null;
    const isNewNode = highlightNodeIds?.has(node.id) ?? false;
    const isGroupHidden = visibleGroups ? !visibleGroups.has(node.group) : false;
    const isDimmed = dimNodeIds ? dimNodeIds.has(node.id) : false;
    // 是否为选中节点（非 hover）
    const isSelected = selectedNode?.id === node.id;

    // 透明度
    let alpha = 0.7;
    if (isGroupHidden) {
      alpha = 0.05;
    } else if (isHighlight) {
      alpha = 1.0;
    } else if (isNewNode) {
      alpha = 0.95;
    } else if (isDimmed) {
      alpha = 0.15;
    } else if (hasHighlight && !isRelated) {
      alpha = 0.2;
    }

    // 被隐藏的分组节点跳过发光和脉冲效果
    if (isGroupHidden) {
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // 新导入节点：脉冲光圈
    if (isNewNode && !isHighlight) {
      const ringR = r + pulsePhase * 18 / transform.scale;
      const ringAlpha = (1 - pulsePhase) * 0.5;
      ctx.save();
      ctx.strokeStyle = hexToRgba(color, ringAlpha);
      ctx.lineWidth = 2 / transform.scale;
      ctx.beginPath();
      ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 发光效果（hover / 选中 / 新节点）
    if (isHighlight) {
      ctx.save();
      // hover 时节点略微放大；选中时也放大但幅度稍小
      const hoverScale = isHighlight && !isSelected ? 1.35 : 1.15;
      const drawR = r * hoverScale;
      // 外层光晕
      ctx.shadowColor = color;
      ctx.shadowBlur = isHighlight && !isSelected ? 28 / transform.scale : 22 / transform.scale;
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2);
      ctx.fill();
      // 外圈光晕环
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexToRgba(color, isHighlight && !isSelected ? 0.6 : 0.45);
      ctx.lineWidth = (isHighlight && !isSelected ? 2.5 : 2) / transform.scale;
      ctx.beginPath();
      ctx.arc(node.x, node.y, drawR + (isHighlight && !isSelected ? 3 : 2) / transform.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 选中节点（非 hover）的扩散环动画
      if (isSelected) {
        const ringR = r + (ringPhase * 28) / transform.scale;
        const ringAlpha = (1 - ringPhase) * 0.4;
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, ringAlpha);
        ctx.lineWidth = 2 / transform.scale;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // hover 节点（非选中）的快速脉冲环
      if (!isSelected) {
        const hoverPulsePhase = (Date.now() % 800) / 800;
        const pulseR = drawR + hoverPulsePhase * 16 / transform.scale;
        const pulseAlpha = (1 - hoverPulsePhase) * 0.35;
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, pulseAlpha);
        ctx.lineWidth = 1.5 / transform.scale;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else if (isNewNode) {
      // 新节点发光（稍弱于选中）
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14 / transform.scale;
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. 绘制标签（节点名称）—— 受 showLabels 开关控制
  if (showLabels) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const node of nodes) {
      if (!isVisible(node.x, node.y)) continue;

      const r = nodeRadius(node);
      const isHighlight = node.id === highlightId;
      const isSelected = selectedNode?.id === node.id;
      const isHoverHighlight = isHighlight && !isSelected;
      const hoverScale = isHoverHighlight ? 1.35 : isHighlight ? 1.15 : 1;
      const drawR = r * hoverScale;
      const isRelated = relatedNodeIds.has(node.id);
      const hasHighlight = highlightId !== null;
      const isNewNode = highlightNodeIds?.has(node.id) ?? false;
      const isGroupHidden = visibleGroups ? !visibleGroups.has(node.group) : false;
      const isDimmed = dimNodeIds ? dimNodeIds.has(node.id) : false;

      // 隐藏分组不显示标签
      if (isGroupHidden) continue;

      // 显示规则：大节点默认显示；小节点仅 hover/选中/新节点时显示
      const showLabel =
        isHighlight ||
        isNewNode ||
        node.size >= LABEL_SIZE_THRESHOLD ||
        (hasHighlight && isRelated && node.size >= 12);

      if (!showLabel) continue;
      // 非关联且非高亮的节点在有高亮时降低标签透明度
      let labelAlpha = 0.65;
      if (isHighlight) labelAlpha = 1.0;
      else if (isDimmed) labelAlpha = 0.1;
      else if (hasHighlight && !isRelated) labelAlpha = 0.15;

      const fontSize = isHighlight ? 13 : 11;
      ctx.font = `${isHighlight ? "600" : "400"} ${fontSize}px -apple-system, "PingFang SC", "Segoe UI", sans-serif`;
      ctx.fillStyle = `rgba(232,234,237,${labelAlpha})`;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4 / transform.scale;
      ctx.fillText(node.label, node.x, node.y + drawR + 8 / transform.scale);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
  }

  // 6. 选中节点 / 悬停节点的关系标签
  const relationLabelNode = selectedNode ?? hoveredNode;
  if (relationLabelNode) {
    ctx.font = `400 ${11}px -apple-system, "PingFang SC", "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";
    edges.forEach((edge) => {
      if (edge.source !== relationLabelNode.id && edge.target !== relationLabelNode.id)
        return;
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;

      // 绘制背景圆角矩形
      const text = edge.relation;
      const textWidth = ctx.measureText(text).width;
      const padX = 6 / transform.scale;
      const padY = 3 / transform.scale;
      const bgW = textWidth + padX * 2;
      const bgH = 16 / transform.scale;
      ctx.fillStyle = "rgba(15,15,35,0.85)";
      ctx.beginPath();
      const r = 4 / transform.scale;
      const bx = midX - bgW / 2;
      const by = midY - bgH / 2;
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bgW - r, by);
      ctx.quadraticCurveTo(bx + bgW, by, bx + bgW, by + r);
      ctx.lineTo(bx + bgW, by + bgH - r);
      ctx.quadraticCurveTo(bx + bgW, by + bgH, bx + bgW - r, by + bgH);
      ctx.lineTo(bx + r, by + bgH);
      ctx.quadraticCurveTo(bx, by + bgH, bx, by + bgH - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(156,163,175,0.9)";
      ctx.textAlign = "center";
      ctx.fillText(text, midX, midY);
      ctx.textAlign = "left";
    });
  }

  ctx.restore();
}
