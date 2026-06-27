"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
} from "react";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/types";
import { MAX_DPR, HIGHLIGHT_DURATION } from "@/lib/constants";
import { useForceSimulation } from "./useForceSimulation";
import { useGraphInteraction } from "./useGraphInteraction";
import { renderGraph } from "./graphRenderer";

/** ForceGraph 暴露给父组件的命令式接口 */
export interface ForceGraphHandle {
  /** 平滑聚焦到指定节点 */
  focusNode: (nodeId: string) => void;
  /** 重置视图 */
  resetView: () => void;
}

interface ForceGraphProps {
  graph: KnowledgeGraph;
  onNodeSelect?: (node: KnowledgeNode | null) => void;
  onNodeHover?: (node: KnowledgeNode | null) => void;
  /** 需要高亮的节点 id 集合（搜索/discovery hover），非集合内节点变暗 */
  highlightNodes?: Set<string> | null;
  /** 可见分组集合，null 表示全部可见 */
  visibleGroups?: Set<string> | null;
  /** 外部选中的节点 id（用于同步：当外部清除选中时，内部也清除） */
  selectedNodeId?: string | null;
  className?: string;
}

/**
 * 力导向图主组件：
 * - Canvas 占满父容器（ResizeObserver 监听尺寸变化）
 * - 组合 useForceSimulation + useGraphInteraction
 * - requestAnimationFrame 驱动渲染（DPR 适配 Retina）
 * - 右下角缩放控制按钮
 * - 新导入节点 2 秒高亮闪烁效果
 * - 通过 ref 暴露 focusNode 方法供搜索/详情面板调用
 */
const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(
    {
      graph,
      onNodeSelect,
      onNodeHover,
      highlightNodes = null,
      visibleGroups = null,
      selectedNodeId = null,
      className = "",
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const { nodesRef, edges, isStable, reheat } = useForceSimulation(
      graph,
      canvasSize
    );

    const {
      hoveredNode,
      selectedNode,
      transformRef,
      focusNode: focusNodeInternal,
      resetView,
      zoomBy,
      setSelectedNode,
    } = useGraphInteraction(canvasRef, nodesRef, canvasSize, reheat);

    // hover/selected 变化时同步到 ref 供渲染循环读取
    const hoveredRef = useRef(hoveredNode);
    const selectedRef = useRef(selectedNode);
    useEffect(() => {
      hoveredRef.current = hoveredNode;
    }, [hoveredNode]);
    useEffect(() => {
      selectedRef.current = selectedNode;
      onNodeSelect?.(selectedNode);
    }, [selectedNode, onNodeSelect]);

    // 外部 selectedNodeId 变化时同步内部状态：
    // 当外部清除选中（null）时，内部也需要清除，保持双向同步
    useEffect(() => {
      if (selectedNodeId === null) {
        setSelectedNode(null);
      }
    }, [selectedNodeId, setSelectedNode]);
    useEffect(() => {
      onNodeHover?.(hoveredNode);
    }, [hoveredNode, onNodeHover]);

    // 暴露命令式接口
    useImperativeHandle(
      ref,
      () => ({
        focusNode: (nodeId: string) => {
          focusNodeInternal(nodeId, canvasSize.width, canvasSize.height);
        },
        resetView: () => {
          resetView(canvasSize.width, canvasSize.height);
        },
      }),
      [focusNodeInternal, resetView, canvasSize]
    );

    // ---- 新导入节点高亮追踪 ----
    const prevNodeIdsRef = useRef<Set<string> | null>(null);
    const highlightIdsRef = useRef<Set<string>>(new Set());
    const [highlightVersion, setHighlightVersion] = useState(0);

    useEffect(() => {
      const currentNodeIds = new Set(graph.nodes.map((n) => n.id));

      // 首次加载或从空图谱切换时不做高亮（全新加载，非增量导入）
      if (
        prevNodeIdsRef.current === null ||
        prevNodeIdsRef.current.size === 0
      ) {
        prevNodeIdsRef.current = currentNodeIds;
        return;
      }

      // 找出新增的节点 id
      const newIds = new Set<string>();
      for (const id of currentNodeIds) {
        if (!prevNodeIdsRef.current.has(id)) {
          newIds.add(id);
        }
      }

      if (newIds.size > 0) {
        highlightIdsRef.current = newIds;
        setHighlightVersion((v) => v + 1);

        const timer = setTimeout(() => {
          highlightIdsRef.current = new Set();
          setHighlightVersion((v) => v + 1);
        }, HIGHLIGHT_DURATION);

        prevNodeIdsRef.current = currentNodeIds;
        return () => clearTimeout(timer);
      }

      prevNodeIdsRef.current = currentNodeIds;
    }, [graph]);

    // ResizeObserver：监听容器尺寸变化
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resize = () => {
        const rect = container.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        });
      };
      resize();

      const ro = new ResizeObserver(resize);
      ro.observe(container);
      return () => ro.disconnect();
    }, []);

    // 初始化视图：首次有尺寸时居中
    const hasInitView = useRef(false);
    useEffect(() => {
      if (
        !hasInitView.current &&
        canvasSize.width > 0 &&
        canvasSize.height > 0
      ) {
        hasInitView.current = true;
        const id = setTimeout(() => {
          resetView(canvasSize.width, canvasSize.height);
        }, 600);
        return () => clearTimeout(id);
      }
    }, [canvasSize, resetView]);

    // highlightNodes / visibleGroups 存入 ref 供渲染循环读取
    const highlightNodesRef = useRef(highlightNodes);
    const visibleGroupsRef = useRef(visibleGroups);
    useEffect(() => {
      highlightNodesRef.current = highlightNodes;
    }, [highlightNodes]);
    useEffect(() => {
      visibleGroupsRef.current = visibleGroups;
    }, [visibleGroups]);

    // 渲染循环
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvasSize.width === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = canvasSize.width * dpr;
      canvas.height = canvasSize.height * dpr;
      canvas.style.width = `${canvasSize.width}px`;
      canvas.style.height = `${canvasSize.height}px`;

      let rafId: number;

      const render = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 将 highlightNodes（需保持高亮的节点）转换为 dimNodeIds（需变暗的节点）
        const hlSet = highlightNodesRef.current;
        let dimNodeIds: Set<string> | null = null;
        if (hlSet && hlSet.size > 0) {
          dimNodeIds = new Set<string>();
          for (const node of nodesRef.current) {
            if (!hlSet.has(node.id)) {
              dimNodeIds.add(node.id);
            }
          }
        }

        // visibleGroups Set -> 传给 renderer
        const vgSet = visibleGroupsRef.current;

        renderGraph(
          ctx,
          nodesRef.current,
          edges,
          transformRef.current,
          hoveredRef.current,
          selectedRef.current,
          canvasSize.width,
          canvasSize.height,
          highlightIdsRef.current.size > 0 ? highlightIdsRef.current : null,
          dimNodeIds,
          vgSet
        );
        rafId = requestAnimationFrame(render);
      };
      render();

      return () => cancelAnimationFrame(rafId);
    }, [edges, canvasSize, nodesRef, transformRef, highlightVersion]);

    const handleReset = useCallback(() => {
      resetView(canvasSize.width, canvasSize.height);
      setSelectedNode(null);
    }, [resetView, canvasSize, setSelectedNode]);

    return (
      <div
        ref={containerRef}
        className={`graph-grid-bg relative h-full w-full overflow-hidden ${className}`}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          style={{ cursor: "grab" }}
        />

        {/* 右下角缩放控制 */}
        <div className="absolute bottom-20 right-4 flex flex-col gap-2 md:bottom-4">
          <button
            onClick={() => zoomBy(1.2, canvasSize.width, canvasSize.height)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-lg text-star-white backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 active:scale-95"
            aria-label="放大"
          >
            +
          </button>
          <button
            onClick={() => zoomBy(1 / 1.2, canvasSize.width, canvasSize.height)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-lg text-star-white backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 active:scale-95"
            aria-label="缩小"
          >

            −
          </button>
          <button
            onClick={handleReset}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-sm text-star-dim backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 hover:text-star-white active:scale-95"
            aria-label="重置视图"
            title="重置视图"
          >

            ⟲
          </button>
        </div>
      </div>
    );
  }
);

export default ForceGraph;
