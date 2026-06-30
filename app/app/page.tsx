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
import ShortcutPanel from "@/components/ui/ShortcutPanel";

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

  // 当 graph 变化（undo/redo 或初始加载）时同步到持久化
  useEffect(() => {
    setPersistedGraph(graph);
  }, [graph, setPersistedGraph]);

  const [isImporting, setIsImporting] = useState(false);
  const [showImportInput, setShowImportInput] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // 探索功能状态
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
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
    if (discoveryHoverNodes && discoveryHoverNodes.length > 0) {
      return new Set(discoveryHoverNodes);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      const matched = new Set<string>();
      for (const node of graph.nodes) {
        if (
          node.label.toLowerCase().includes(q) ||
          (node.description?.toLowerCase().includes(q) ?? false) ||
          node.id.toLowerCase().includes(q)
        ) {
          matched.add(node.id);
        }
      }
      return matched.size > 0 ? matched : new Set<string>();
    }
    return null;
  }, [searchQuery, discoveryHoverNodes, graph.nodes]);

  // ---- 导入流程 ----
  const handleImport = useCallback(
    async (text: string) => {
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "导入失败，请检查网络后重试";
        setImportError(msg);
        showToast(msg, "error");
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

  // ---- 导出图谱 ----
  const handleExport = useCallback(() => {
    graphRef.current?.exportPNG("知识星图");
    showToast("图谱已导出为 PNG 图片", "success");
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

  // ---- 探索功能 ----
  const handleNodeSelect = useCallback((node: KnowledgeNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleSelectNodeFromSearch = useCallback((node: KnowledgeNode) => {
    graphRef.current?.focusNode(node.id);
  }, []);

  const handleNavigateNode = useCallback((node: KnowledgeNode) => {
    graphRef.current?.focusNode(node.id);
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
      // Cmd/Ctrl + K: 聚焦搜索框
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = searchInputRef.current?.querySelector("input");
        if (input) {
          input.focus();
        }
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

      // Cmd/Ctrl + Shift + Z: 重做
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Escape: 关闭面板
      if (e.key === "Escape") {
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
  }, [showImportInput, selectedNode, handleExport, canUndo, canRedo, undo, redo]);

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
        />
      </div>

      {/* Toast 轻提示 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 确认对话框 */}
      {confirmDialog}

      {/* 快捷键帮助面板 */}
      <ShortcutPanel />

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
