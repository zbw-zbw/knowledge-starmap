"use client";

import { useEffect, useRef, useState } from "react";
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  SimulationNode,
  SimulationConfig,
} from "@/lib/types";
import {
  DEFAULT_SIMULATION_CONFIG,
  STABILITY_THRESHOLD,
} from "@/lib/constants";

interface UseForceSimulationReturn {
  /** 带实时位置的节点数组（可变 ref，渲染循环与交互直接读取） */
  nodesRef: React.MutableRefObject<SimulationNode[]>;
  /** 边数组（模拟过程中不变） */
  edges: KnowledgeEdge[];
  /** 图谱是否已稳定 */
  isStable: boolean;
  /** 重新激活模拟（拖拽、添加节点后调用） */
  reheat: () => void;
}

/**
 * 力导向图模拟 Hook。
 * 内部用 ref 存储节点位置，requestAnimationFrame 驱动物理模拟，
 * 稳定后自动停止以节省性能。拖拽时被拖节点通过 fx/fy 固定。
 */
export function useForceSimulation(
  graph: KnowledgeGraph,
  canvasSize: { width: number; height: number }
): UseForceSimulationReturn {
  const configRef = useRef<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);
  const canvasSizeRef = useRef(canvasSize);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const nodeMapRef = useRef<Map<string, SimulationNode>>(new Map());

  // 初始化全新节点：围绕画布中心随机散布
  const initNodes = (g: KnowledgeGraph, w: number, h: number): SimulationNode[] => {
    const cx = w / 2;
    const cy = h / 2;
    return g.nodes.map((n) => ({
      ...n,
      x: cx + (Math.random() - 0.5) * Math.min(w, 400),
      y: cy + (Math.random() - 0.5) * Math.min(h, 400),
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));
  };

  /**
   * 增量更新节点：保留已有节点位置，仅给新节点随机位置。
   * 用于知识导入后图谱合并的场景，避免已有节点跳飞。
   */
  const updateNodes = (g: KnowledgeGraph, w: number, h: number): SimulationNode[] => {
    const cx = w / 2;
    const cy = h / 2;
    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    return g.nodes.map((n) => {
      const existing = existingMap.get(n.id);
      if (existing) {
        // 保留位置和速度，更新属性（如 size/description 可能变化）
        return {
          ...n,
          x: existing.x,
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
          fx: null,
          fy: null,
        };
      }
      // 新节点：在画布中心附近随机散布
      return {
        ...n,
        x: cx + (Math.random() - 0.5) * Math.min(w, 300),
        y: cy + (Math.random() - 0.5) * Math.min(h, 300),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
  };

  const nodesRef = useRef<SimulationNode[]>([]);

  // 首次或图谱变化时初始化节点
  const graphRef = useRef(graph);
  const initGraphRef = useRef<KnowledgeGraph | null>(null);
  const isFirstInit = useRef(true);
  const [isStable, setIsStable] = useState(false);

  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

  // 当画布尺寸就绪或图谱变化时初始化/更新节点
  useEffect(() => {
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;
    if (initGraphRef.current === graph) return; // 已为该图谱处理过

    initGraphRef.current = graph;
    graphRef.current = graph;

    if (isFirstInit.current) {
      // 首次初始化：全部节点随机位置
      nodesRef.current = initNodes(graph, width, height);
      isFirstInit.current = false;
    } else {
      // 后续更新：增量保留已有位置
      nodesRef.current = updateNodes(graph, width, height);
    }

    nodeMapRef.current = new Map(
      nodesRef.current.map((n) => [n.id, n])
    );
    setIsStable(false);
    startSimulation();
  }, [graph, canvasSize]);

  // 组件卸载时停止模拟
  useEffect(() => {
    return () => stopSimulation();
  }, []);

  /** 单步物理模拟 */
  const tick = () => {
    const nodes = nodesRef.current;
    const cfg = configRef.current;
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    const nodeMap = nodeMapRef.current;
    const n = nodes.length;

    // 1. 斥力（所有节点对，O(n²)）
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // 重合节点给个微小偏移
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          distSq = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(distSq);
        // 大节点斥力范围更大
        const sizeFactor = (a.size + b.size) / 40;
        const force = (cfg.repulsionStrength * sizeFactor) / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (a.fx === null || a.fx === undefined) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b.fx === null || b.fx === undefined) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    // 2. 弹簧力（有连线的节点对）
    for (const edge of graphRef.current.edges) {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) continue;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const displacement = dist - cfg.springLength;
      const force = displacement * cfg.springStrength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (s.fx === null || s.fx === undefined) {
        s.vx += fx;
        s.vy += fy;
      }
      if (t.fx === null || t.fx === undefined) {
        t.vx -= fx;
        t.vy -= fy;
      }
    }

    // 3. 中心引力 + 4. 阻尼 + 速度限制 + 位置更新 + 边界约束
    let totalVelocity = 0;
    const margin = 40;
    for (const node of nodes) {
      // 固定节点（拖拽中）
      if (node.fx !== null && node.fx !== undefined) {
        node.x = node.fx;
        node.y = node.fy!;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // 中心引力
      node.vx += (cx - node.x) * cfg.gravityStrength;
      node.vy += (cy - node.y) * cfg.gravityStrength;

      // 阻尼
      node.vx *= cfg.dampingFactor;
      node.vy *= cfg.dampingFactor;

      // 速度限制
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > cfg.maxVelocity) {
        node.vx = (node.vx / speed) * cfg.maxVelocity;
        node.vy = (node.vy / speed) * cfg.maxVelocity;
      }

      // 更新位置
      node.x += node.vx;
      node.y += node.vy;

      // 边界约束
      node.x = Math.max(margin, Math.min(width - margin, node.x));
      node.y = Math.max(margin, Math.min(height - margin, node.y));

      totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
    }

    // 稳定性检测
    if (totalVelocity < STABILITY_THRESHOLD) {
      stopSimulation();
      setIsStable(true);
    }
  };

  const startSimulation = () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsStable(false);

    const loop = () => {
      if (!isRunningRef.current) return;
      tick();
      if (isRunningRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopSimulation = () => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const reheat = () => {
    if (isStable) setIsStable(false);
    if (!isRunningRef.current) {
      startSimulation();
    }
  };

  return {
    nodesRef,
    edges: graph.edges,
    isStable,
    reheat,
  };
}
