"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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

/**
 * 主应用页面：力导向知识图谱可视化工作台。
 * 管理图谱状态、导入历史、导入流程、探索功能、AI 发现。
 * 集成 Toast 轻提示和首次使用引导。
 */
export default function AppPage() {
  const [graph, setGraph] = useState(sampleGraph);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
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

  // 首次使用引导步骤（根据 localStorage 确定起始步骤）
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    if (isOnboardingDismissed("tip-graph")) {
      if (isOnboardingDismissed("tip-import")) {
        if (isOnboardingDismissed("tip-node")) return 4;
        return 3;
      }
      return 2;
    }
    return 1;
  });

  // ForceGraph ref for focusNode
  const graphRef = useRef<ForceGraphHandle>(null);

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
        setGraph(newGraph);

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
    [graph, showToast]
  );

  const handleClear = useCallback(() => {
    setGraph({ nodes: [], edges: [] });
    setImportHistory([]);
    setImportError(null);
    setShowImportInput(false);
    setSelectedNode(null);
    setDiscoveries([]);
    setDiscoveryError(null);
    setSearchQuery("");
    setVisibleGroups(new Set(Object.keys(GROUP_COLORS)));
    showToast("图谱已清空", "info");
  }, [showToast]);

  const handleReloadSample = useCallback(() => {
    setGraph(sampleGraph);
    setImportHistory([]);
    setImportError(null);
    setShowImportInput(false);
    setSelectedNode(null);
    setDiscoveries([]);
    setDiscoveryError(null);
    setSearchQuery("");
    setVisibleGroups(new Set(Object.keys(GROUP_COLORS)));
  }, []);

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
        // 至少保留一个分组
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
      // 去重添加边
      const existingKeys = new Set(
        graph.edges.map((e) => `${e.source}->${e.target}`)
      );
      const newEdges = edges.filter(
        (e) => !existingKeys.has(`${e.source}->${e.target}`)
      );
      if (newEdges.length === 0) return;
      setGraph((prev) => ({
        ...prev,
        edges: [...prev.edges, ...newEdges],
      }));
      showToast("已添加新的知识关联", "success");
    },
    [graph.edges, showToast]
  );

  const handleIgnoreDiscovery = useCallback((id: string) => {
    setDiscoveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleHoverNodes = useCallback((nodeIds: string[] | null) => {
    setDiscoveryHoverNodes(nodeIds);
  }, []);

  return (
    <>
      <AppLayout
        graph={graph}
        graphRef={graphRef}
        onImport={handleImport}
        onClear={handleClear}
        onReloadSample={handleReloadSample}
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
      />

      {/* Toast 轻提示 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
