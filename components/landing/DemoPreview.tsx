"use client";

import { useEffect, useRef } from "react";
import { COLORS, MAX_DPR } from "@/lib/constants";

/** 演示节点：x/y 为 0-1 的相对坐标，渲染时乘以画布尺寸；r 为像素半径 */
interface DemoNode {
  x: number;
  y: number;
  r: number;
  color: string;
}

/** 演示节点（颜色取自 COLORS.node，覆盖 blue/green/purple/orange 四色） */
const DEMO_NODES: readonly DemoNode[] = [
  { x: 0.3, y: 0.4, r: 8, color: COLORS.node.blue },
  { x: 0.5, y: 0.3, r: 6, color: COLORS.node.blue },
  { x: 0.7, y: 0.45, r: 7, color: COLORS.node.purple },
  { x: 0.4, y: 0.6, r: 5, color: COLORS.node.green },
  { x: 0.6, y: 0.65, r: 6, color: COLORS.node.orange },
  { x: 0.2, y: 0.55, r: 4, color: COLORS.node.blue },
  { x: 0.8, y: 0.3, r: 5, color: COLORS.node.green },
  { x: 0.5, y: 0.8, r: 4, color: COLORS.node.purple },
];

/** 演示连线：节点索引对 */
const DEMO_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [3, 4],
  [1, 3],
  [0, 5],
  [2, 6],
  [3, 7],
];

/**
 * 每个节点的漂移参数：速度 / 相位 / 振幅各不相同，
 * 使各节点错落漂移，避免整齐划一的机械感。
 */
const DRIFT_PARAMS = DEMO_NODES.map((_, i) => ({
  speedX: 0.00018 + (i % 3) * 0.00004,
  speedY: 0.00015 + (i % 4) * 0.00005,
  phaseX: i * 1.3,
  phaseY: i * 0.7 + 1.1,
  ampX: 0.015 + (i % 2) * 0.008,
  ampY: 0.012 + (i % 3) * 0.006,
}));

/** 当前帧计算出的节点位置（像素坐标） */
interface NodePosition {
  x: number;
  y: number;
  r: number;
  color: string;
}

/**
 * DemoPreview：纯装饰性的小型力导向图谱预览，用于 Landing 页 Hero 区背景。
 * - 整体 opacity 0.15，不可交互（pointer-events: none）
 * - 节点使用正弦函数缓慢漂移：x = baseX + sin(time * speed + phase) * amplitude
 * - 节点之间有连线，颜色取自 COLORS.node
 * - requestAnimationFrame 驱动，正确处理 DPR 高清屏
 * - 移动端隐藏（hidden md:block）
 * - 不接收任何 props
 */
export default function DemoPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // 重设画布尺寸并处理 DPR，使绘制处于 CSS 像素空间
    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();

    // 监听容器尺寸变化（断点切换 / 窗口缩放）
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // 尊重用户的动效偏好：开启时停止漂移
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const startTime = performance.now();
    let rafId = 0;

    const render = (now: number) => {
      // 不可见（移动端 hidden）或尺寸为 0 时跳过绘制，仅继续调度
      if (width > 0 && height > 0) {
        // reduced-motion 下时间固定为 0，节点停在初始位置
        const t = prefersReduced ? 0 : now - startTime;

        // 将 ctx 置于 CSS 像素空间（DPR 适配）
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // 计算当前帧每个节点的位置：baseX/Y + 正弦漂移
        const positions: NodePosition[] = DEMO_NODES.map((node, i) => {
          const drift = DRIFT_PARAMS[i];
          const dx = Math.sin(t * drift.speedX + drift.phaseX) * drift.ampX;
          const dy = Math.sin(t * drift.speedY + drift.phaseY) * drift.ampY;
          return {
            x: (node.x + dx) * width,
            y: (node.y + dy) * height,
            r: node.r,
            color: node.color,
          };
        });

        // 1. 先绘制连线（一次性 beginPath 批量描边，性能更佳）
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(232,234,237,0.18)";
        ctx.beginPath();
        for (const [a, b] of DEMO_EDGES) {
          const pa = positions[a];
          const pb = positions[b];
          if (!pa || !pb) continue;
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
        }
        ctx.stroke();

        // 2. 再绘制节点（带柔光，模拟星点发光）
        for (const p of positions) {
          ctx.save();
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden opacity-15 will-change-transform md:block"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
