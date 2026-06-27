"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SimulationNode, Transform } from "@/lib/types";
import { MIN_SCALE, MAX_SCALE, ZOOM_SENSITIVITY, FOCUS_ANIMATION_DURATION } from "@/lib/constants";

interface UseGraphInteractionReturn {
  hoveredNode: SimulationNode | null;
  selectedNode: SimulationNode | null;
  draggedNode: SimulationNode | null;
  transform: Transform;
  transformRef: React.MutableRefObject<Transform>;
  setSelectedNode: (node: SimulationNode | null) => void;
  /** 平滑聚焦到指定节点（动画过渡约 500ms） */
  focusNode: (nodeId: string, width: number, height: number) => void;
  resetView: (width: number, height: number) => void;
  zoomBy: (factor: number, width: number, height: number) => void;
}

interface PanState {
  startX: number;
  startY: number;
  transformX: number;
  transformY: number;
}

const DRAG_THRESHOLD = 4; // 像素，小于此位移视为点击

/**
 * 图谱交互 Hook：处理拖拽节点、平移画布、缩放、hover、点击选中。
 * 所有事件监听在内部通过 useEffect 挂载，自动清理。
 */
export function useGraphInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodesRef: React.MutableRefObject<SimulationNode[]>,
  canvasSize: { width: number; height: number },
  reheat: () => void
): UseGraphInteractionReturn {
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const [transform, setTransformState] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimulationNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);

  // 内部状态 ref（供事件回调读取最新值，避免闭包陷阱）
  const draggedNodeRef = useRef<SimulationNode | null>(null);
  const isDraggingNode = useRef(false);
  const isPanning = useRef(false);
  const panState = useRef<PanState>({ startX: 0, startY: 0, transformX: 0, transformY: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const focusAnimRef = useRef<number | null>(null);

  const setTransform = useCallback((t: Transform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);

  /** 屏幕坐标 -> 图谱坐标 */
  const screenToGraph = useCallback(
    (screenX: number, screenY: number) => {
      const t = transformRef.current;
      return {
        x: (screenX - t.x) / t.scale,
        y: (screenY - t.y) / t.scale,
      };
    },
    []
  );

  /** 命中检测：返回鼠标位置下的节点 */
  const hitTest = useCallback(
    (screenX: number, screenY: number): SimulationNode | null => {
      const { x: gx, y: gy } = screenToGraph(screenX, screenY);
      const nodes = nodesRef.current;
      // 从后向前检测（后绘制的在上层）
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const r = Math.max(4, node.size * 0.5) + 3; // 命中半径含 3px 填充
        const dx = gx - node.x;
        const dy = gy - node.y;
        if (dx * dx + dy * dy <= r * r) {
          return node;
        }
      }
      return null;
    },
    [nodesRef, screenToGraph]
  );

  /** 获取鼠标相对 canvas 的坐标 */
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, [canvasRef]);

  // ---- 鼠标事件 ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      const pos = getCanvasPos(e.clientX, e.clientY);
      dragStartPos.current = pos;
      hasMoved.current = false;

      const node = hitTest(pos.x, pos.y);
      if (node) {
        // 拖拽节点
        isDraggingNode.current = true;
        draggedNodeRef.current = node;
        setDraggedNode(node);
        const { x: gx, y: gy } = screenToGraph(pos.x, pos.y);
        node.fx = gx;
        node.fy = gy;
        node.vx = 0;
        node.vy = 0;
        reheat();
      } else {
        // 平移画布
        isPanning.current = true;
        panState.current = {
          startX: pos.x,
          startY: pos.y,
          transformX: transformRef.current.x,
          transformY: transformRef.current.y,
        };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getCanvasPos(e.clientX, e.clientY);

      // 检测是否超过拖拽阈值
      if (
        !hasMoved.current &&
        (Math.abs(pos.x - dragStartPos.current.x) > DRAG_THRESHOLD ||
          Math.abs(pos.y - dragStartPos.current.y) > DRAG_THRESHOLD)
      ) {
        hasMoved.current = true;
      }

      if (isDraggingNode.current && draggedNodeRef.current) {
        // 更新被拖节点位置
        const { x: gx, y: gy } = screenToGraph(pos.x, pos.y);
        const node = draggedNodeRef.current;
        node.fx = gx;
        node.fy = gy;
        reheat();
        return;
      }

      if (isPanning.current) {
        // 平移画布
        const dx = pos.x - panState.current.startX;
        const dy = pos.y - panState.current.startY;
        setTransform({
          x: panState.current.transformX + dx,
          y: panState.current.transformY + dy,
          scale: transformRef.current.scale,
        });
        return;
      }

      // hover 检测
      const node = hitTest(pos.x, pos.y);
      setHoveredNode((prev) => (prev?.id === node?.id ? prev : node));
      canvas.style.cursor = node ? "pointer" : "grab";
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDraggingNode.current && draggedNodeRef.current) {
        // 释放节点
        const node = draggedNodeRef.current;
        node.fx = null;
        node.fy = null;

        // 未移动则视为点击选中
        if (!hasMoved.current) {
          setSelectedNode(node);
        }
        isDraggingNode.current = false;
        draggedNodeRef.current = null;
        setDraggedNode(null);
        reheat();
      } else if (isPanning.current) {
        isPanning.current = false;
        // 未移动则视为点击空白 -> 取消选中
        if (!hasMoved.current) {
          setSelectedNode(null);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pos = getCanvasPos(e.clientX, e.clientY);
      const t = transformRef.current;

      // 缩放因子
      const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * factor));

      if (newScale === t.scale) return;

      // 以鼠标位置为中心缩放
      const graphX = (pos.x - t.x) / t.scale;
      const graphY = (pos.y - t.y) / t.scale;
      setTransform({
        scale: newScale,
        x: pos.x - graphX * newScale,
        y: pos.y - graphY * newScale,
      });
    };

    const onLeave = () => {
      if (!isDraggingNode.current && !isPanning.current) {
        setHoveredNode(null);
        canvas.style.cursor = "default";
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [canvasRef, getCanvasPos, hitTest, screenToGraph, setTransform, reheat]);

  // ---- 触摸事件 ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);
      dragStartPos.current = pos;
      hasMoved.current = false;

      const node = hitTest(pos.x, pos.y);
      if (node) {
        isDraggingNode.current = true;
        draggedNodeRef.current = node;
        setDraggedNode(node);
        const { x: gx, y: gy } = screenToGraph(pos.x, pos.y);
        node.fx = gx;
        node.fy = gy;
        node.vx = 0;
        node.vy = 0;
        reheat();
        e.preventDefault();
      } else {
        isPanning.current = true;
        panState.current = {
          startX: pos.x,
          startY: pos.y,
          transformX: transformRef.current.x,
          transformY: transformRef.current.y,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const pos = getCanvasPos(touch.clientX, touch.clientY);

      if (
        !hasMoved.current &&
        (Math.abs(pos.x - dragStartPos.current.x) > DRAG_THRESHOLD ||
          Math.abs(pos.y - dragStartPos.current.y) > DRAG_THRESHOLD)
      ) {
        hasMoved.current = true;
      }

      if (isDraggingNode.current && draggedNodeRef.current) {
        const { x: gx, y: gy } = screenToGraph(pos.x, pos.y);
        const node = draggedNodeRef.current;
        node.fx = gx;
        node.fy = gy;
        reheat();
        e.preventDefault();
        return;
      }

      if (isPanning.current) {
        const dx = pos.x - panState.current.startX;
        const dy = pos.y - panState.current.startY;
        setTransform({
          x: panState.current.transformX + dx,
          y: panState.current.transformY + dy,
          scale: transformRef.current.scale,
        });
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (isDraggingNode.current && draggedNodeRef.current) {
        const node = draggedNodeRef.current;
        node.fx = null;
        node.fy = null;
        if (!hasMoved.current) {
          setSelectedNode(node);
        }
        isDraggingNode.current = false;
        draggedNodeRef.current = null;
        setDraggedNode(null);
        reheat();
      } else if (isPanning.current) {
        isPanning.current = false;
        if (!hasMoved.current) {
          setSelectedNode(null);
        }
      }
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [canvasRef, getCanvasPos, hitTest, screenToGraph, setTransform, reheat]);

  /**
   * 平滑聚焦到指定节点：用 requestAnimationFrame 插值 transform，
   * 让目标节点在约 500ms 内移动到画布中心并适当放大。
   */
  const focusNode = useCallback(
    (nodeId: string, width: number, height: number) => {
      const nodes = nodesRef.current;
      const target = nodes.find((n) => n.id === nodeId);
      if (!target || width === 0) return;

      // 取消正在进行的聚焦动画
      if (focusAnimRef.current !== null) {
        cancelAnimationFrame(focusAnimRef.current);
        focusAnimRef.current = null;
      }

      const startTransform = { ...transformRef.current };
      // 目标缩放：当前缩放与 1.5 取较大值，但不超 MAX_SCALE
      const targetScale = Math.min(MAX_SCALE, Math.max(transformRef.current.scale, 1.5));
      // 让节点居中： x = width/2 - node.x * scale
      const targetX = width / 2 - target.x * targetScale;
      const targetY = height / 2 - target.y * targetScale;

      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / FOCUS_ANIMATION_DURATION);
        // easeInOutCubic
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        setTransform({
          scale: startTransform.scale + (targetScale - startTransform.scale) * eased,
          x: startTransform.x + (targetX - startTransform.x) * eased,
          y: startTransform.y + (targetY - startTransform.y) * eased,
        });

        if (t < 1) {
          focusAnimRef.current = requestAnimationFrame(animate);
        } else {
          focusAnimRef.current = null;
        }
      };
      focusAnimRef.current = requestAnimationFrame(animate);

      // 同时选中该节点
      setSelectedNode(target);
    },
    [nodesRef, setTransform]
  );

  // 组件卸载时清理聚焦动画
  useEffect(() => {
    return () => {
      if (focusAnimRef.current !== null) {
        cancelAnimationFrame(focusAnimRef.current);
      }
    };
  }, []);

  /** 重置视图到中心 */
  const resetView = useCallback(
    (width: number, height: number) => {
      const nodes = nodesRef.current;
      if (nodes.length === 0 || width === 0) {
        setTransform({ x: 0, y: 0, scale: 1 });
        return;
      }
      // 计算节点包围盒
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
      const graphW = maxX - minX || 100;
      const graphH = maxY - minY || 100;
      const padding = 80;
      const scale = Math.max(
        MIN_SCALE,
        Math.min(
          MAX_SCALE,
          Math.min(
            (width - padding * 2) / graphW,
            (height - padding * 2) / graphH
          )
        )
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setTransform({
        scale,
        x: width / 2 - cx * scale,
        y: height / 2 - cy * scale,
      });
    },
    [nodesRef, setTransform]
  );

  /** 按比例缩放（以画布中心为锚点） */
  const zoomBy = useCallback(
    (factor: number, width: number, height: number) => {
      const t = transformRef.current;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * factor));
      if (newScale === t.scale) return;
      const cx = width / 2;
      const cy = height / 2;
      const graphX = (cx - t.x) / t.scale;
      const graphY = (cy - t.y) / t.scale;
      setTransform({
        scale: newScale,
        x: cx - graphX * newScale,
        y: cy - graphY * newScale,
      });
    },
    [setTransform]
  );

  return {
    hoveredNode,
    selectedNode,
    draggedNode,
    transform,
    transformRef,
    setSelectedNode,
    focusNode,
    resetView,
    zoomBy,
  };
}
