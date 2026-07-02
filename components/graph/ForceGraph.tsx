"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
} from "react";
import type { KnowledgeGraph, KnowledgeNode, SimulationNode } from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { MAX_DPR, HIGHLIGHT_DURATION } from "@/lib/constants";
import { PlusIcon, MinusIcon, ResetIcon, ArrowLeftIcon, ArrowRightIcon, EdgeIcon, CloseIcon, ForceLayoutIcon, CircleLayoutIcon, GridLayoutIcon } from "@/components/ui/Icons";
import { circularLayout, gridLayout } from "@/lib/layoutAlgorithms";
import { useForceSimulation } from "./useForceSimulation";
import { useGraphInteraction } from "./useGraphInteraction";
import { renderGraph } from "./graphRenderer";
import ContextMenu from "./ContextMenu";
import MiniMap from "./MiniMap";
import Legend from "./Legend";

/** ForceGraph 暴露给父组件的命令式接口 */
export interface ForceGraphHandle {
  /** 平滑聚焦到指定节点 */
  focusNode: (nodeId: string) => void;
  /** 重置视图 */
  resetView: () => void;
  /** 导出当前画布为 PNG 图片，返回是否成功 */
  exportPNG: (filename?: string) => boolean;
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
  /** 撤销回调 */
  onUndo?: () => void;
  /** 重做回调 */
  onRedo?: () => void;
  /** 是否可撤销 */
  canUndo?: boolean;
  /** 是否可重做 */
  canRedo?: boolean;
  /** 节点编辑回调（右键菜单触发） */
  onNodeEdit?: (node: KnowledgeNode) => void;
  /** 节点删除回调（右键菜单触发） */
  onNodeDelete?: (node: KnowledgeNode) => void;
  /** 空白区域双击回调（用于手动创建节点） */
  onCanvasDoubleClick?: (graphX: number, graphY: number) => void;
  /** 手动创建边回调 */
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
}

/**
 * 力导向图主组件：
 * - Canvas 占满父容器（ResizeObserver 监听尺寸变化）
 * - 组合 useForceSimulation + useGraphInteraction
 * - requestAnimationFrame 驱动渲染（DPR 适配 Retina）
 * - 右下角缩放控制按钮
 * - 新导入节点 2 秒高亮闪烁效果
 * - 悬停节点显示浮动 tooltip
 * - 双击节点聚焦放大
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
      onUndo,
      onRedo,
      canUndo = false,
      canRedo = false,
      onNodeEdit,
      onNodeDelete,
      onCanvasDoubleClick,
      onEdgeCreate,
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
      draggedNode,
      transform,
      transformRef,
      focusNode: focusNodeInternal,
      resetView,
      zoomBy,
      panTo,
      setSelectedNode,
      contextMenu,
      setContextMenu,
      mousePos,
      setOnCanvasDoubleClick,
    } = useGraphInteraction(canvasRef, nodesRef, canvasSize, reheat);

    // 同步外部双击回调到 hook
    useEffect(() => {
      setOnCanvasDoubleClick(onCanvasDoubleClick ?? null);
    }, [onCanvasDoubleClick, setOnCanvasDoubleClick]);

    // ---- 连线创建模式 ----
    const [connectionMode, setConnectionMode] = useState(false);
    const [connectionSource, setConnectionSource] = useState<SimulationNode | null>(null);
    const [connectionMousePos, setConnectionMousePos] = useState<{ x: number; y: number } | null>(null);
    const [activeLayout, setActiveLayout] = useState<"force" | "circular" | "grid">("force");
    const [showLabels, setShowLabels] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);

    // 连线模式下监听鼠标位置
    useEffect(() => {
      if (!connectionMode || !connectionSource) return;
      const onMove = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        setConnectionMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      };
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, [connectionMode, connectionSource]);

    // Esc 取消连线模式
    useEffect(() => {
      if (!connectionMode) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setConnectionMode(false);
          setConnectionSource(null);
          setConnectionMousePos(null);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [connectionMode]);

    // 连线模式下覆盖节点点击行为
    const handleConnectionNodeClick = useCallback((node: SimulationNode) => {
      if (!connectionSource) {
        // 第一个点击：选为源节点
        setConnectionSource(node);
      } else if (node.id !== connectionSource.id) {
        // 第二个点击：创建边
        onEdgeCreate?.(connectionSource.id, node.id);
        setConnectionSource(null);
        setConnectionMousePos(null);
        setConnectionMode(false);
      }
    }, [connectionSource, onEdgeCreate]);

    // 布局切换函数
    const applyLayout = useCallback((type: "force" | "circular" | "grid") => {
      setActiveLayout(type);
      if (type === "force") {
        reheat();
        return;
      }
      const nodes = nodesRef.current;
      if (nodes.length === 0) return;
      const t = transformRef.current;
      // 计算图谱中心（在图坐标中）
      const cx = (canvasSize.width / 2 - t.x) / t.scale;
      const cy = (canvasSize.height / 2 - t.y) / t.scale;
      const radius = Math.min(canvasSize.width, canvasSize.height) * 0.35 / t.scale;

      if (type === "circular") {
        circularLayout(nodes, cx, cy, radius);
      } else if (type === "grid") {
        gridLayout(nodes, cx, cy, 80);
      }
      // 重置视图使布局居中
      resetView(canvasSize.width, canvasSize.height);
    }, [reheat, resetView, canvasSize, transformRef, nodesRef]);

    // hover/selected 变化时同步到 ref 供渲染循环读取
    const hoveredRef = useRef(hoveredNode);
    const selectedRef = useRef(selectedNode);
    useEffect(() => {
      hoveredRef.current = hoveredNode;
    }, [hoveredNode]);
    useEffect(() => {
      selectedRef.current = selectedNode;
      // 连线模式下，节点点击用于选择连线端点，不触发普通选中
      if (connectionMode && selectedNode) {
        handleConnectionNodeClick(selectedNode);
        return;
      }
      onNodeSelect?.(selectedNode);
    }, [selectedNode, onNodeSelect, connectionMode, handleConnectionNodeClick]);

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

    // 获取 canvas 相对容器的偏移（用于 tooltip 定位）
    const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
    useEffect(() => {
      const updateRect = () => {
        if (canvasRef.current) {
          setCanvasRect(canvasRef.current.getBoundingClientRect());
        }
      };
      updateRect();
      const ro = new ResizeObserver(updateRect);
      if (canvasRef.current) ro.observe(canvasRef.current);
      window.addEventListener("scroll", updateRect, true);
      return () => {
        ro.disconnect();
        window.removeEventListener("scroll", updateRect, true);
      };
    }, []);

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
        exportPNG: (filename = "知识星图") => {
          const canvas = canvasRef.current;
          if (!canvas) return false;
          try {
            const link = document.createElement("a");
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            return true;
          } catch {
            return false;
          }
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

    // 力模拟稳定状态存入 ref 供渲染循环读取（稳定后降帧）
    const isStableRef = useRef(isStable);
    useEffect(() => {
      isStableRef.current = isStable;
    }, [isStable]);

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
      let lastRenderTime = 0;
      // 稳定状态下降帧：约 10fps（100ms 间隔）
      const STABLE_FRAME_INTERVAL = 100;
      // 检测是否有活跃交互（hover/drag/动画）
      const hasInteraction = () => {
        // 有 hover 节点时需要 60fps（tooltip 实时跟随）
        if (hoveredRef.current) return true;
        // 有拖拽中的节点时需要 60fps
        if (draggedNode) return true;
        // 有新节点高亮动画在进行时需要 60fps
        if (highlightIdsRef.current.size > 0) return true;
        // 力模拟未稳定时需要 60fps
        if (!isStableRef.current) return true;
        return false;
      };

      const render = (timestamp: number) => {
        const interactive = hasInteraction();
        if (!interactive) {
          // 稳定状态：降帧到 ~10fps
          if (timestamp - lastRenderTime < STABLE_FRAME_INTERVAL) {
            rafId = requestAnimationFrame(render);
            return;
          }
        }
        lastRenderTime = timestamp;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
          vgSet,
          showLabels
        );
        rafId = requestAnimationFrame(render);
      };
      rafId = requestAnimationFrame(render);

      return () => cancelAnimationFrame(rafId);
    }, [edges, canvasSize, nodesRef, transformRef, highlightVersion, draggedNode, showLabels]);

    const handleReset = useCallback(() => {
      resetView(canvasSize.width, canvasSize.height);
      setSelectedNode(null);
    }, [resetView, canvasSize, setSelectedNode]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 仅当离开容器时才隐藏
      if (e.currentTarget === e.target) {
        setIsDragOver(false);
      }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        // 触发自定义事件，由 page.tsx 处理
        window.dispatchEvent(
          new CustomEvent("knowledge-starmap:file-drop", { detail: { file } })
        );
      }
    }, []);

    const isGraphEmpty = graph.nodes.length === 0;

    // 计算 tooltip 位置
    const tooltipNode = hoveredNode && !selectedNode ? hoveredNode : null;
    const tooltipScreenPos = tooltipNode && mousePos && canvasRect
      ? { x: mousePos.x, y: mousePos.y }
      : null;

    return (
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          style={{
            cursor: connectionMode
              ? "crosshair"
              : draggedNode
              ? "grabbing"
              : hoveredNode
              ? "pointer"
              : "grab",
          }}
        />

        {/* 拖拽导入提示 */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-node-blue/10 backdrop-blur-[2px]">
            <div className="rounded-2xl border-2 border-dashed border-node-blue/50 bg-space-800/80 px-8 py-6 text-center">
              <div className="mb-2 text-3xl">📥</div>
              <p className="text-sm font-medium text-node-blue">释放以导入文件</p>
              <p className="mt-1 text-xs text-star-dim">支持 JSON 图谱文件</p>
            </div>
          </div>
        )}

        {/* 悬停 tooltip */}
        {tooltipNode && tooltipScreenPos && typeof document !== "undefined" && (
          <div
            className="pointer-events-none absolute z-30 animate-fade-in"
            style={{
              left: Math.min(tooltipScreenPos.x + 16, canvasSize.width - 200),
              top: Math.max(tooltipScreenPos.y - 48, 8),
            }}
          >
            <div className="rounded-lg border border-space-500/80 bg-space-800/95 px-3 py-2 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: GROUP_COLORS[tooltipNode.group],
                    boxShadow: `0 0 6px ${GROUP_COLORS[tooltipNode.group]}`,
                  }}
                />
                <span className="text-sm font-medium text-star-white">
                  {tooltipNode.label}
                </span>
                <span className="shrink-0 text-[10px] text-star-dim/70">
                  {GROUP_LABELS[tooltipNode.group]}
                </span>
              </div>
              {tooltipNode.description && (
                <p className="mt-1 max-w-[220px] line-clamp-2 text-xs text-star-dim/80">
                  {tooltipNode.description}
                </p>
              )}
              <div className="mt-1.5 text-[10px] text-star-dim/40">
                双击聚焦 · 单击查看详情
              </div>
            </div>
          </div>
        )}

        {/* 连线模式指示器 + 连线 */}
        {connectionMode && (
          <>
            {/* 顶部提示条 */}
            <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 animate-fade-in">
              <div className="flex items-center gap-2 rounded-full border border-node-blue/40 bg-space-800/90 px-4 py-1.5 shadow-lg backdrop-blur-sm">
                <EdgeIcon size={14} className="text-node-blue" />
                <span className="text-xs text-star-white">
                  {connectionSource
                    ? "点击另一个节点完成连线"
                    : "点击起始节点"}
                </span>
                <button
                  onClick={() => {
                    setConnectionMode(false);
                    setConnectionSource(null);
                    setConnectionMousePos(null);
                  }}
                  className="ml-1 text-star-dim hover:text-star-white"
                >
                  <CloseIcon size={12} />
                </button>
              </div>
            </div>
            {/* SVG 连线 */}
            {connectionSource && connectionMousePos && (() => {
              const t = transformRef.current;
              const sx = connectionSource.x * t.scale + t.x;
              const sy = connectionSource.y * t.scale + t.y;
              return (
                <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
                  <line
                    x1={sx} y1={sy}
                    x2={connectionMousePos.x} y2={connectionMousePos.y}
                    stroke="rgba(79,195,247,0.6)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <circle cx={sx} cy={sy} r="8" fill="none" stroke="rgba(79,195,247,0.8)" strokeWidth="2">
                    <animate attributeName="r" values="6;12;6" dur="1.5s" repeatCount="infinite" />
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="infinite" />
                  </circle>
                </svg>
              );
            })()}
          </>
        )}

        {/* 右下角缩放控制 */}
        <div className="absolute bottom-20 right-4 flex flex-col items-center gap-1.5 md:bottom-4">
          {/* 连线模式按钮 */}
          {onEdgeCreate && (
            <button
              onClick={() => {
                setConnectionMode((prev) => !prev);
                setConnectionSource(null);
                setConnectionMousePos(null);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-95 ${
                connectionMode
                  ? "border-node-blue/60 bg-node-blue/20 text-node-blue shadow-[0_0_12px_rgba(79,195,247,0.3)]"
                  : "border-space-500 bg-space-700/80 text-star-white hover:border-node-blue/60 hover:bg-space-600/80"
              }`}
              aria-label="连线模式"
              title="创建连线（点击两个节点）"
            >
              <EdgeIcon size={18} />
            </button>
          )}
          {/* 布局切换 */}
          <div className="mb-1 flex gap-1">
            <button
              onClick={() => applyLayout("force")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-95 ${
                activeLayout === "force"
                  ? "border-node-blue/60 bg-node-blue/20 text-node-blue"
                  : "border-space-500 bg-space-700/80 text-star-white hover:border-node-blue/60"
              }`}
              title="力导向布局"
            >
              <ForceLayoutIcon size={16} />
            </button>
            <button
              onClick={() => applyLayout("circular")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-95 ${
                activeLayout === "circular"
                  ? "border-node-blue/60 bg-node-blue/20 text-node-blue"
                  : "border-space-500 bg-space-700/80 text-star-white hover:border-node-blue/60"
              }`}
              title="环形布局"
            >
              <CircleLayoutIcon size={16} />
            </button>
            <button
              onClick={() => applyLayout("grid")}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-95 ${
                activeLayout === "grid"
                  ? "border-node-blue/60 bg-node-blue/20 text-node-blue"
                  : "border-space-500 bg-space-700/80 text-star-white hover:border-node-blue/60"
              }`}
              title="网格布局"
            >
              <GridLayoutIcon size={16} />
            </button>
          </div>
          {/* 标签显示开关 */}
          <button
            onClick={() => setShowLabels((prev) => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm transition-all active:scale-95 text-xs font-bold ${
              showLabels
                ? "border-node-blue/60 bg-node-blue/20 text-node-blue"
                : "border-space-500 bg-space-700/80 text-star-dim"
            }`}
            title={showLabels ? "隐藏标签" : "显示标签"}
          >
            Aa
          </button>
          <button
            onClick={() => zoomBy(1.2, canvasSize.width, canvasSize.height)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-star-white backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 active:scale-95"
            aria-label="放大"
          >
            <PlusIcon size={18} />
          </button>
          {/* 缩放百分比显示 */}
          <div className="flex h-7 w-9 items-center justify-center rounded-md bg-space-700/60 text-[11px] font-medium tabular-nums text-star-dim/80 backdrop-blur-sm">
            {Math.round(transform.scale * 100)}%
          </div>
          <button
            onClick={() => zoomBy(1 / 1.2, canvasSize.width, canvasSize.height)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-star-white backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 active:scale-95"
            aria-label="缩小"
          >
            <MinusIcon size={18} />
          </button>
          <button
            onClick={handleReset}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-space-500 bg-space-700/80 text-star-dim backdrop-blur-sm transition-all hover:border-node-blue/60 hover:bg-space-600/80 hover:text-star-white active:scale-95"
            aria-label="重置视图"
            title="重置视图 (Cmd+0)"
          >
            <ResetIcon size={16} />
          </button>
        </div>

        {/* 图例（桌面端，节点数 > 0 时显示） */}
        {!isGraphEmpty && (
          <div className="absolute left-4 top-4 z-10 hidden md:block">
            <Legend />
          </div>
        )}

        {/* 小地图概览（桌面端，节点数 ≤ 200 时显示） */}
        <MiniMap
          nodesRef={nodesRef}
          edges={edges}
          transformRef={transformRef}
          canvasSize={canvasSize}
          visibleGroups={visibleGroups ?? null}
          onNavigate={(gx, gy) => panTo(gx, gy, canvasSize.width, canvasSize.height)}
        />

        {/* 右键上下文菜单 */}
        {contextMenu && onNodeEdit && onNodeDelete && (() => {
          const node = nodesRef.current.find((n) => n.id === contextMenu.nodeId);
          if (!node) return null;
          return (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              node={node}
              onEdit={() => onNodeEdit(node)}
              onDelete={() => onNodeDelete(node)}
              onFocus={() => focusNodeInternal(node.id, canvasSize.width, canvasSize.height)}
              onClose={() => setContextMenu(null)}
            />
          );
        })()}
      </div>
    );
  }
);

export default ForceGraph;
