"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type {
  ImportRecord,
  ExtractResponse,
  DiscoverResponse,
  Discovery,
  KnowledgeNode,
  KnowledgeEdge,
} from "@/lib/types";
import { GROUP_COLORS } from "@/lib/types";
import { sampleGraph } from "@/lib/sampleData";
import { mergeGraphs } from "@/lib/graphMerge";
import { MAX_IMPORT_HISTORY, MIN_NODES_FOR_DISCOVERY } from "@/lib/constants";
import type { ForceGraphHandle } from "@/components/graph/ForceGraph";
import AppLayout from "@/components/app/AppLayout";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import OnboardingTip, { isOnboardingDismissed } from "@/components/ui/OnboardingTip";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGraphPersistence } from "@/lib/useGraphPersistence";
import { useUndoRedo } from "@/lib/useUndoRedo";
import { exportGraphJSON, importGraphJSON } from "@/lib/useGraphExport";
import { searchMatch } from "@/lib/fuzzySearch";
import { computeDegreeMap, degreeToSize } from "@/lib/graphUtils";
import { findShortestPath } from "@/lib/shortestPath";
import ShortcutPanel from "@/components/ui/ShortcutPanel";
import SpotlightSearch from "@/components/explore/SpotlightSearch";

/**
 * 主应用页面：力导向知识图谱可视化工作台。
 * 管理图谱状态、导入历史、导入流程、探索功能、AI 发现。
 * 集成 Toast 轻提示、首次使用引导、图谱持久化、键盘快捷键。
 */
export default function AppPage() {
  // 图谱持久化（localStorage 自动保存/恢复）
  const {
    graph: persistedGraph,
    setGraph: setPersistedGraph,
    importHistory,
    setImportHistory,
    isLoaded,
    clearStorage,
  } = useGraphPersistence();

  // 撤销/重做（基于持久化图谱初始化）
  const {
    current: graph,
    push: pushGraph,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoRedo(persistedGraph);

  // 当持久化从 localStorage 加载完成后，同步到撤销历史栈
  // 这解决了刷新后已保存图谱不显示的问题
  useEffect(() => {
    if (isLoaded) {
      resetHistory(persistedGraph);
    }
  }, [isLoaded]); // 仅在 isLoaded 变化时执行一次

  // 当 graph 变化（undo/redo 或操作）时同步到持久化
  useEffect(() => {
    if (isLoaded) {
      setPersistedGraph(graph);
    }
  }, [graph, setPersistedGraph, isLoaded]);

  const [isImporting, setIsImporting] = useState(false);
  const [showImportInput, setShowImportInput] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Spotlight 全局搜索
  const [showSpotlight, setShowSpotlight] = useState(false);

  // 探索功能状态
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(
    new Set(Object.keys(GROUP_COLORS))
  );
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryHoverNodes, setDiscoveryHoverNodes] = useState<string[] | null>(
    null
  );

  // 路径查找状态
  const [pathFindSource, setPathFindSource] = useState<string | null>(null);
  const [pathHighlight, setPathHighlight] = useState<Set<string> | null>(null);

  // Toast 轻提示
  const { toasts, showToast, dismissToast } = useToast();

  // 确认对话框
  const { dialog: confirmDialog, requestConfirm } = useConfirmDialog();

  // 首次使用引导步骤（延迟初始化避免 SSR localStorage 问题）
  const [onboardingStep, setOnboardingStep] = useState(4);

  useEffect(() => {
    if (isOnboardingDismissed("tip-graph")) {
      if (isOnboardingDismissed("tip-import")) {
        if (isOnboardingDismissed("tip-node")) {
          setOnboardingStep(4);
        } else {
          setOnboardingStep(3);
        }
      } else {
        setOnboardingStep(2);
      }
    } else {
      setOnboardingStep(1);
    }
  }, []);

  // ForceGraph ref for focusNode / exportPNG
  const graphRef = useRef<ForceGraphHandle>(null);

  // 搜索框 ref（用于键盘快捷键聚焦）
  const searchInputRef = useRef<HTMLDivElement>(null);

  // JSON 导入文件输入 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- 计算高亮节点集合（搜索 / discovery hover）----
  const highlightNodes = useMemo(() => {
    // 路径高亮优先
    if (pathHighlight && pathHighlight.size > 0) {
      return pathHighlight;
    }
    if (discoveryHoverNodes && discoveryHoverNodes.length > 0) {
      return new Set(discoveryHoverNodes);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      const matched = new Set<string>();
      for (const node of graph.nodes) {
        if (searchMatch(node.label, node.description, node.id, q)) {
          matched.add(node.id);
        }
      }
      return matched.size > 0 ? matched : new Set<string>();
    }
    return null;
  }, [pathHighlight, searchQuery, discoveryHoverNodes, graph.nodes]);

  // ---- 节点度数自适应大小 ----
  useEffect(() => {
    const degreeMap = computeDegreeMap(graph.edges);
    const needsUpdate = graph.nodes.some((n) => {
      const degree = degreeMap.get(n.id) || 0;
      const expectedSize = degreeToSize(degree);
      return Math.abs(n.size - expectedSize) > 1;
    });
    if (needsUpdate) {
      pushGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          const degree = degreeMap.get(n.id) || 0;
          return { ...n, size: degreeToSize(degree) };
        }),
      }));
    }
  }, [graph.edges.length]); // 仅当边数量变化时重新计算

  // ---- 导入流程 ----
  const handleImport = useCallback(
    async (text: string): Promise<boolean> => {
      setIsImporting(true);
      setImportError(null);
      try {
        const existingNodes = graph.nodes.map((n) => n.id);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, existingNodes }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "提取失败，请稍后重试");
        }

        const extracted = data as ExtractResponse;
        const newGraph = mergeGraphs(graph, {
          nodes: extracted.nodes,
          edges: extracted.edges,
        });
        pushGraph(newGraph);

        setImportHistory((prev) =>
          [
            {
              id: Date.now().toString(),
              title: extracted.title || text.slice(0, 20),
              text: text.slice(0, 200),
              nodesCount: extracted.nodes.length,
              edgesCount: extracted.edges.length,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, MAX_IMPORT_HISTORY)
        );

        setShowImportInput(false);
        showToast(
          `已导入 ${extracted.nodes.length} 个概念和 ${extracted.edges.length} 个关联`,
          "success"
        );
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "导入失败，请检查网络后重试";
        setImportError(msg);
        showToast(msg, "error");
        return false;
      } finally {
        setIsImporting(false);
      }
    },
    [graph, pushGraph, setImportHistory, showToast]
  );

  const handleClear = useCallback(() => {
    requestConfirm(
      {
        title: "确认清空图谱？",
        message: `当前图谱包含 ${graph.nodes.length} 个概念和 ${graph.edges.length} 个关联，清空后无法恢复。`,
        confirmText: "清空",
        cancelText: "取消",
      },
      () => {
        resetHistory({ nodes: [], edges: [] });
        setImportHistory([]);
        clearStorage();
        setImportError(null);
        setShowImportInput(false);
        setSelectedNode(null);
        setDiscoveries([]);
        setDiscoveryError(null);
        setSearchQuery("");
        setVisibleGroups(new Set(Object.keys(GROUP_COLORS)));
        showToast("图谱已清空", "info");
      }
    );
  }, [graph.nodes.length, graph.edges.length, requestConfirm, resetHistory, setImportHistory, clearStorage, showToast]);

  const handleReloadSample = useCallback(() => {
    resetHistory(sampleGraph);
    setImportHistory([]);
    setImportError(null);
    setShowImportInput(false);
    setSelectedNode(null);
    setDiscoveries([]);
    setDiscoveryError(null);
    setSearchQuery("");
    setVisibleGroups(new Set(Object.keys(GROUP_COLORS)));
    showToast("已重新加载示例数据", "success");
  }, [resetHistory, setImportHistory, showToast]);

  // 删除单条导入历史
  const handleDeleteHistoryItem = useCallback(
    (id: string) => {
      setImportHistory((prev) => prev.filter((item) => item.id !== id));
    },
    [setImportHistory]
  );

  // 清空导入历史
  const handleClearHistory = useCallback(() => {
    setImportHistory([]);
  }, [setImportHistory]);

  // 清空最近浏览
  const handleClearRecentNodes = useCallback(() => {
    setRecentNodes([]);
  }, []);

  // 从历史中快速回填文本到输入框
  const handleRestoreFromHistory = useCallback(
    (id: string) => {
      const item = importHistory.find((i) => i.id === id);
      if (!item) return;
      // 派发全局事件，由 ImportPanel 监听并填充文本
      window.dispatchEvent(
        new CustomEvent("knowledge-starmap:restore-text", { detail: item.text })
      );
      setShowImportInput(true);
      setImportError(null);
      showToast("已恢复文本到输入框", "info");
    },
    [importHistory, showToast]
  );

  // ---- 导出图谱 ----
  const handleExport = useCallback(() => {
    const success = graphRef.current?.exportPNG("知识星图") ?? false;
    if (success) {
      showToast("图谱已导出为 PNG 图片", "success");
    } else {
      showToast("导出失败，请重试", "error");
    }
  }, [showToast]);

  // ---- JSON 导出/导入 ----
  const handleExportJSON = useCallback(() => {
    exportGraphJSON(graph, importHistory);
    showToast("图谱数据已导出为 JSON", "success");
  }, [graph, importHistory, showToast]);

  const handleImportJSON = useCallback((file: File) => {
    importGraphJSON(file).then((data) => {
      requestConfirm(
        { title: "导入图谱数据？", message: `导入将替换当前图谱数据（${data.graph.nodes.length} 个节点）。`, confirmText: "导入", cancelText: "取消" },
        () => {
          resetHistory(data.graph);
          if (data.importHistory) setImportHistory(data.importHistory);
          setSelectedNode(null);
          showToast(`已导入 ${data.graph.nodes.length} 个节点`, "success");
        }
      );
    }).catch((err) => {
      showToast(err instanceof Error ? err.message : "导入失败", "error");
    });
  }, [requestConfirm, resetHistory, setImportHistory, setSelectedNode, showToast]);

  const handleImportJSONFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportJSON(file);
      e.target.value = "";
    }
  }, [handleImportJSON]);

  // 监听画布文件拖拽事件
  useEffect(() => {
    const handleFileDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const file = detail?.file as File;
      if (!file) return;

      if (file.name.endsWith(".json")) {
        // JSON 文件：使用现有的 JSON 导入逻辑
        importGraphJSON(file).then((data) => {
          requestConfirm(
            { title: "导入图谱数据？", message: `导入将替换当前图谱数据（${data.graph.nodes.length} 个节点）。`, confirmText: "导入", cancelText: "取消" },
            () => {
              resetHistory(data.graph);
              if (data.importHistory) setImportHistory(data.importHistory);
              setSelectedNode(null);
              showToast(`已导入 ${data.graph.nodes.length} 个节点`, "success");
            }
          );
        }).catch((err) => {
          showToast(err instanceof Error ? err.message : "导入失败", "error");
        });
      } else if (file.type.startsWith("text/")) {
        // 文本文件：读取内容后用 AI 提取
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          handleImport(text);
        };
        reader.readAsText(file);
      } else {
        showToast("不支持的文件类型，请拖入 JSON 或文本文件", "error");
      }
    };
    window.addEventListener("knowledge-starmap:file-drop", handleFileDrop);
    return () => window.removeEventListener("knowledge-starmap:file-drop", handleFileDrop);
  }, [requestConfirm, resetHistory, setImportHistory, showToast, handleImport]);

  // ---- 探索功能 ----

  // selectedNode 变化时更新最近浏览历史（去重，最新在前，最多 8 个）
  useEffect(() => {
    if (!selectedNode) return;
    setRecentNodes((prev) => {
      const filtered = prev.filter((n) => n.id !== selectedNode.id);
      return [selectedNode, ...filtered].slice(0, 8);
    });
  }, [selectedNode]);

  const handleSelectNodeFromSearch = useCallback((node: KnowledgeNode) => {
    // 选中节点（打开详情面板）并聚焦
    setSelectedNode(node);
    graphRef.current?.focusNode(node.id);
  }, []);

  const handleNavigateNode = useCallback((node: KnowledgeNode) => {
    setSelectedNode(node);
    graphRef.current?.focusNode(node.id);
  }, []);

  // 当前节点在图谱中的前/后节点（用于详情面板的导航按钮与 Alt+↑/↓）
  const { prevNode, nextNode } = useMemo(() => {
    if (!selectedNode) return { prevNode: null, nextNode: null };
    const idx = graph.nodes.findIndex((n) => n.id === selectedNode.id);
    if (idx === -1) return { prevNode: null, nextNode: null };
    return {
      prevNode: idx > 0 ? graph.nodes[idx - 1] : null,
      nextNode: idx < graph.nodes.length - 1 ? graph.nodes[idx + 1] : null,
    };
  }, [selectedNode, graph.nodes]);

  const handlePrevNode = useCallback(() => {
    if (prevNode) handleNavigateNode(prevNode);
  }, [prevNode, handleNavigateNode]);

  const handleNextNode = useCallback(() => {
    if (nextNode) handleNavigateNode(nextNode);
  }, [nextNode, handleNavigateNode]);

  const handleFocusNode = useCallback((nodeId: string) => {
    graphRef.current?.focusNode(nodeId);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleToggleGroup = useCallback((group: string) => {
    setVisibleGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        if (next.size > 1) {
          next.delete(group);
        }
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  // 仅显示指定分组（其它全部隐藏）
  const handleShowOnlyGroup = useCallback((group: string) => {
    setVisibleGroups(new Set([group]));
  }, []);

  // 全部显示（图谱中实际存在的所有分组）
  const handleShowAllGroups = useCallback(() => {
    setVisibleGroups(new Set(Object.keys(GROUP_COLORS)));
  }, []);

  // 反选：激活的隐藏、非激活的显示；至少保留一个
  const handleInvertGroups = useCallback(() => {
    setVisibleGroups((prev) => {
      const all = Object.keys(GROUP_COLORS);
      const inverted = all.filter((g) => !prev.has(g));
      // 至少保留一个：若全选反转后为空，则全选
      return new Set(inverted.length > 0 ? inverted : all);
    });
  }, []);

  // ---- AI 关联发现 ----
  const handleDiscover = useCallback(async () => {
    if (graph.nodes.length < MIN_NODES_FOR_DISCOVERY) return;
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: graph.nodes, edges: graph.edges }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "分析失败，请稍后重试");
      }
      const result = data as DiscoverResponse;
      setDiscoveries(result.discoveries);
      showToast(
        `发现了 ${result.discoveries.length} 条隐藏关联`,
        "success"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "发现失败，请检查网络后重试";
      setDiscoveryError(msg);
      showToast(msg, "error");
    } finally {
      setIsDiscovering(false);
    }
  }, [graph, showToast]);

  const handleAddEdges = useCallback(
    (edges: KnowledgeEdge[]) => {
      const existingKeys = new Set(
        graph.edges.map((e) => `${e.source}->${e.target}`)
      );
      const newEdges = edges.filter(
        (e) => !existingKeys.has(`${e.source}->${e.target}`)
      );
      if (newEdges.length === 0) return;
      pushGraph((prev) => ({
        ...prev,
        edges: [...prev.edges, ...newEdges],
      }));
      showToast("已添加新的知识关联", "success");
    },
    [graph.edges, pushGraph, showToast]
  );

  const handleIgnoreDiscovery = useCallback((id: string) => {
    setDiscoveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleHoverNodes = useCallback((nodeIds: string[] | null) => {
    setDiscoveryHoverNodes(nodeIds);
  }, []);

  // ---- 手动创建边 ----
  const handleCreateEdge = useCallback((sourceId: string, targetId: string) => {
    // 检查是否已存在
    const exists = graph.edges.some(
      (e) => e.source === sourceId && e.target === targetId
    );
    if (exists) {
      showToast("该连线已存在", "info");
      return;
    }
    const sourceNode = graph.nodes.find((n) => n.id === sourceId);
    const targetNode = graph.nodes.find((n) => n.id === targetId);
    pushGraph((prev) => ({
      ...prev,
      edges: [
        ...prev.edges,
        {
          source: sourceId,
          target: targetId,
          relation: "关联",
        },
      ],
    }));
    showToast(
      `已连接「${sourceNode?.label ?? sourceId}」→「${targetNode?.label ?? targetId}」`,
      "success"
    );
  }, [graph.edges, graph.nodes, pushGraph, showToast]);

  // ---- 路径查找 ----
  const handleStartPathFind = useCallback((sourceId: string) => {
    if (pathFindSource === sourceId) {
      setPathFindSource(null);
      setPathHighlight(null);
    } else {
      setPathFindSource(sourceId);
      setPathHighlight(null);
      // 关闭当前详情面板让用户选择目标
      setSelectedNode(null);
    }
  }, [pathFindSource]);

  const handlePathFindSelect = useCallback((targetNode: KnowledgeNode) => {
    if (!pathFindSource || !targetNode) return;
    const path = findShortestPath(pathFindSource, targetNode.id, graph.edges);
    if (path) {
      setPathHighlight(new Set(path));
      setSelectedNode(targetNode);
      showToast(`找到路径：经过 ${path.length - 2} 个中间节点`, "success");
    } else {
      setPathHighlight(null);
      setSelectedNode(targetNode);
      showToast("两个节点之间不存在路径", "info");
    }
    setPathFindSource(null);
  }, [pathFindSource, graph.edges, showToast]);

  const handleNodeSelect = useCallback((node: KnowledgeNode | null) => {
    if (node && pathFindSource) {
      handlePathFindSelect(node);
      return;
    }
    setSelectedNode(node);
  }, [pathFindSource, handlePathFindSelect]);

  // ---- 手动创建节点 ----
  const handleCreateNode = useCallback((data: { label: string; description?: string; group: import("@/lib/types").NodeGroup }) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNode: KnowledgeNode = {
      id,
      label: data.label,
      description: data.description,
      group: data.group,
      size: 10,
    };
    pushGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    showToast(`已创建节点「${data.label}」`, "success");
  }, [pushGraph, showToast]);

  // ---- 节点编辑/删除 ----
  const handleUpdateNode = useCallback((id: string, updates: Partial<KnowledgeNode>) => {
    pushGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
    showToast("节点已更新", "success");
  }, [pushGraph, showToast]);

  const handleDeleteNode = useCallback((id: string) => {
    requestConfirm(
      { title: "确认删除节点？", message: "删除后该节点及其所有关联将无法恢复（可通过撤销恢复）。", confirmText: "删除", cancelText: "取消" },
      () => {
        pushGraph((prev) => ({
          nodes: prev.nodes.filter((n) => n.id !== id),
          edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
        }));
        setSelectedNode(null);
        showToast("节点已删除", "info");
      }
    );
  }, [pushGraph, setSelectedNode, requestConfirm, showToast]);

  // ---- 键盘快捷键 ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: 打开 Spotlight 全局搜索
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSpotlight((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + E: 导出图谱
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        handleExport();
        return;
      }

      // Cmd/Ctrl + Z: 撤销
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z 或 Ctrl + Y: 重做
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") ||
          ((e.ctrlKey || e.metaKey) && e.key === "y")) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Escape: 关闭面板
      if (e.key === "Escape") {
        if (pathFindSource) {
          setPathFindSource(null);
          setPathHighlight(null);
          return;
        }
        if (showImportInput) {
          setShowImportInput(false);
        } else if (selectedNode) {
          setSelectedNode(null);
        }
        return;
      }

      // Cmd/Ctrl + 0: 重置视图
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        graphRef.current?.resetView();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathFindSource, showImportInput, selectedNode, handleExport, canUndo, canRedo, undo, redo]);

  return (
    <>
      <div ref={searchInputRef} className="contents">
        {/* Hidden file input for JSON import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSONFileChange}
        />
        <AppLayout
          graph={graph}
          graphRef={graphRef}
          onImport={handleImport}
          onClear={handleClear}
          onReloadSample={handleReloadSample}
          onExport={handleExport}
          importHistory={importHistory}
          isImporting={isImporting}
          showImportInput={showImportInput}
          setShowImportInput={setShowImportInput}
          importError={importError}
          // 探索功能
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
          onSelectNodeFromSearch={handleSelectNodeFromSearch}
          onNavigateNode={handleNavigateNode}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          visibleGroups={visibleGroups}
          onToggleGroup={handleToggleGroup}
          highlightNodes={highlightNodes}
          discoveries={discoveries}
          isDiscovering={isDiscovering}
          discoveryError={discoveryError}
          onDiscover={handleDiscover}
          onAddEdges={handleAddEdges}
          onIgnoreDiscovery={handleIgnoreDiscovery}
          onHoverNodes={handleHoverNodes}
          selectedNodeId={selectedNode?.id ?? null}
          // 撤销/重做
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          // 节点编辑/删除
          onNodeUpdate={handleUpdateNode}
          onNodeDelete={handleDeleteNode}
          // JSON 导出/导入
          onExportJSON={handleExportJSON}
          onImportJSONTrigger={() => fileInputRef.current?.click()}
          // 聚焦节点
          onFocusNode={handleFocusNode}
          // 上下节点导航
          onPrevNode={handlePrevNode}
          onNextNode={handleNextNode}
          hasPrev={!!prevNode}
          hasNext={!!nextNode}
          // 领域筛选
          onShowOnlyGroup={handleShowOnlyGroup}
          onShowAllGroups={handleShowAllGroups}
          onInvertGroups={handleInvertGroups}
          // 导入历史
          onRestoreFromHistory={handleRestoreFromHistory}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          onClearHistory={handleClearHistory}
          // 最近浏览节点
          recentNodes={recentNodes}
          onClearRecentNodes={handleClearRecentNodes}
          // 手动创建节点
          onNodeCreate={handleCreateNode}
          // 手动创建边
          onEdgeCreate={handleCreateEdge}
          // 路径查找
          pathHighlightNodes={pathHighlight}
          onStartPathFind={handleStartPathFind}
          isPathFindMode={pathFindSource !== null}
          // 边编辑/删除
          onEdgeDelete={(sourceId, targetId) => {
            const sourceNode = graph.nodes.find((n) => n.id === sourceId);
            const targetNode = graph.nodes.find((n) => n.id === targetId);
            const deletedEdge = graph.edges.find(
              (e) => e.source === sourceId && e.target === targetId
            );
            pushGraph((prev) => ({
              ...prev,
              edges: prev.edges.filter(
                (e) => !(e.source === sourceId && e.target === targetId)
              ),
            }));
            showToast(
              `已删除「${sourceNode?.label ?? sourceId}」→「${targetNode?.label ?? targetId}」的连线（Ctrl+Z 撤销）`,
              "info"
            );
          }}
          onEdgeUpdate={(sourceId, targetId, newRelation) => {
            pushGraph((prev) => ({
              ...prev,
              edges: prev.edges.map((e) =>
                e.source === sourceId && e.target === targetId
                  ? { ...e, relation: newRelation }
                  : e
              ),
            }));
            showToast("关系已更新", "success");
          }}
        />
      </div>

      {/* Toast 轻提示 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 确认对话框 */}
      {confirmDialog}

      {/* 快捷键帮助面板 */}
      <ShortcutPanel />

      {/* Spotlight 全局搜索 */}
      <SpotlightSearch
        graph={graph}
        onSelectNode={(node) => {
          handleSelectNodeFromSearch(node);
          setShowSpotlight(false);
        }}
        open={showSpotlight}
        onClose={() => setShowSpotlight(false)}
      />

      {/* 首次使用引导 */}
      {onboardingStep === 1 && (
        <OnboardingTip
          stepKey="tip-graph"
          text="这是你的知识星图，试试拖拽和缩放探索"
          onDismiss={() => setOnboardingStep(2)}
          delay={2000}
        />
      )}
      {onboardingStep === 2 && (
        <OnboardingTip
          stepKey="tip-import"
          text="粘贴笔记或文章，AI 会自动提取知识概念"
          onDismiss={() => setOnboardingStep(3)}
        />
      )}
      {onboardingStep === 3 && (
        <OnboardingTip
          stepKey="tip-node"
          text="点击节点查看详情和关联概念"
          onDismiss={() => setOnboardingStep(4)}
        />
      )}
    </>
  );
}
