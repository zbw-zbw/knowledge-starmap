"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationNode, Transform, NodeGroup } from "@/lib/types";
import { GROUP_COLORS } from "@/lib/types";

interface MiniMapProps {
  /** 节点 ref（实时位置） */
  nodesRef: React.MutableRefObject<SimulationNode[]>;
  /** 边列表（用于绘制连线） */
  edges: { source: string; target: string }[];
  /** 当前画布变换 */
  transformRef: React.MutableRefObject<Transform>;
  /** 主画布尺寸 */
  canvasSize: { width: number; height: number };
  /** 可见分组 */
  visibleGroups: Set<string> | null;
  /** 点击小地图时跳转到对应位置 */
  onNavigate: (graphX: number, graphY: number) => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const PADDING = 12;

/**
 * 小地图概览：
 * - 左下角缩略图画布，绘制全部节点和连线
 * - 用矩形框标示当前视口范围
 * - 点击小地图可快速导航到对应区域
 * - 节点数 > 200 时自动隐藏性能保护
 */
export default function MiniMap({
  nodesRef,
  edges,
  transformRef,
  canvasSize,
  visibleGroups,
  onNavigate,
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bounds, setBounds] = useState<{
    minX: number;
    minY: number;
    w: number;
    h: number;
  } | null>(null);

  // 计算节点包围盒（节流：每 500ms 重算一次）
  useEffect(() => {
    let frame: number;
    let lastCalc = 0;
    const calc = () => {
      const now = Date.now();
      if (now - lastCalc < 500) {
        frame = requestAnimationFrame(calc);
        return;
      }
      lastCalc = now;
      const nodes = nodesRef.current;
      if (nodes.length === 0) {
        setBounds(null);
        frame = requestAnimationFrame(calc);
        return;
      }
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const n of nodes) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      }
      const w = Math.max(maxX - minX, 1);
      const h = Math.max(maxY - minY, 1);
      setBounds((prev) => {
        if (
          prev &&
          Math.abs(prev.minX - minX) < 2 &&
          Math.abs(prev.minY - minY) < 2 &&
          Math.abs(prev.w - w) < 2 &&
          Math.abs(prev.h - h) < 2
        ) {
          return prev; // 无变化不触发重渲染
        }
        return { minX, minY, w, h };
      });
      frame = requestAnimationFrame(calc);
    };
    frame = requestAnimationFrame(calc);
    return () => cancelAnimationFrame(frame);
  }, [nodesRef]);

  // 绘制小地图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    canvas.style.width = `${MINIMAP_WIDTH}px`;
    canvas.style.height = `${MINIMAP_HEIGHT}px`;

    let rafId: number;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 背景
      ctx.fillStyle = "rgba(5, 8, 22, 0.85)";
      ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

      const { minX, minY, w, h } = bounds;
      // 缩放比例：让图谱填满小地图（留 padding）
      const scale = Math.min(
        (MINIMAP_WIDTH - PADDING * 2) / w,
        (MINIMAP_HEIGHT - PADDING * 2) / h
      );
      const offsetX = PADDING + (MINIMAP_WIDTH - PADDING * 2 - w * scale) / 2;
      const offsetY = PADDING + (MINIMAP_HEIGHT - PADDING * 2 - h * scale) / 2;

      // 图坐标 → 小地图坐标
      const toMini = (gx: number, gy: number) => ({
        x: offsetX + (gx - minX) * scale,
        y: offsetY + (gy - minY) * scale,
      });

      const nodes = nodesRef.current;
      const vg = visibleGroups;

      // 绘制边
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(100, 116, 139, 0.2)";
      ctx.beginPath();
      for (const edge of edges) {
        const sn = nodes.find((n) => n.id === edge.source);
        const tn = nodes.find((n) => n.id === edge.target);
        if (!sn || !tn) continue;
        if (vg && !vg.has(sn.group) && !vg.has(tn.group)) continue;
        const s = toMini(sn.x, sn.y);
        const t = toMini(tn.x, tn.y);
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();

      // 绘制节点
      for (const node of nodes) {
        if (vg && !vg.has(node.group)) continue;
        const p = toMini(node.x, node.y);
        const r = Math.max(1, Math.min(3, node.size * 0.08));
        ctx.fillStyle = GROUP_COLORS[node.group as NodeGroup] || "#9ca3af";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 绘制视口矩形
      const t = transformRef.current;
      // 视口在图坐标中的范围
      const viewMinX = (0 - t.x) / t.scale;
      const viewMinY = (0 - t.y) / t.scale;
      const viewMaxX = (canvasSize.width - t.x) / t.scale;
      const viewMaxY = (canvasSize.height - t.y) / t.scale;

      const vp1 = toMini(viewMinX, viewMinY);
      const vp2 = toMini(viewMaxX, viewMaxY);
      const vpW = Math.max(2, vp2.x - vp1.x);
      const vpH = Math.max(2, vp2.y - vp1.y);

      ctx.strokeStyle = "rgba(79, 195, 247, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vp1.x, vp1.y, vpW, vpH);
      // 视口内半透明填充
      ctx.fillStyle = "rgba(79, 195, 247, 0.06)";
      ctx.fillRect(vp1.x, vp1.y, vpW, vpH);

      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [bounds, edges, nodesRef, transformRef, canvasSize, visibleGroups]);

  // 点击小地图导航
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bounds) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { minX, minY, w, h } = bounds;
    const scale = Math.min(
      (MINIMAP_WIDTH - PADDING * 2) / w,
      (MINIMAP_HEIGHT - PADDING * 2) / h
    );
    const offsetX = PADDING + (MINIMAP_WIDTH - PADDING * 2 - w * scale) / 2;
    const offsetY = PADDING + (MINIMAP_HEIGHT - PADDING * 2 - h * scale) / 2;

    // 小地图坐标 → 图坐标
    const graphX = (mx - offsetX) / scale + minX;
    const graphY = (my - offsetY) / scale + minY;
    onNavigate(graphX, graphY);
  };

  // 节点数过多时隐藏（性能保护）
  if (nodesRef.current.length > 200) return null;

  return (
    <div
      className="absolute bottom-20 left-4 z-20 hidden md:block"
      style={{ animation: "fadeIn 300ms ease-out" }}
    >
      <div className="relative overflow-hidden rounded-lg border border-space-500/60 shadow-xl backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="block cursor-pointer"
          style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
          title="点击导航到对应区域"
        />
        <div className="pointer-events-none absolute left-1.5 top-1 text-[9px] font-medium uppercase tracking-wider text-star-dim/40">
          概览
        </div>
      </div>
    </div>
  );
}
