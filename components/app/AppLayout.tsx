"use client";

import { useState, useMemo, useCallback, useRef, useEffect, type RefObject } from "react";
import Link from "next/link";
import type {
  KnowledgeGraph,
  KnowledgeNode,
  ImportRecord,
  Discovery,
  KnowledgeEdge,
} from "@/lib/types";
import { GROUP_COLORS, GROUP_LABELS } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { computeDegreeMap } from "@/lib/graphUtils";
import ForceGraph, { type ForceGraphHandle } from "@/components/graph/ForceGraph";
import ImportPanel from "@/components/import/ImportPanel";
import ImportHistory from "@/components/import/ImportHistory";
import SearchBar from "@/components/explore/SearchBar";
import DomainFilter from "@/components/explore/DomainFilter";
import NodeDetail from "@/components/explore/NodeDetail";
import DiscoveryPanel from "@/components/explore/DiscoveryPanel";
import RecentNodes from "@/components/explore/RecentNodes";
import CreateNodeModal from "@/components/explore/CreateNodeModal";
import EmptyState from "@/components/ui/EmptyState";
import MobileToolbar, { type MobileSheetType } from "@/components/app/MobileToolbar";
import {
  SparkleIcon,
  ImportIcon,
  SearchIcon,
  DiscoverIcon,
  SettingsIcon,
  CloseIcon,
  ChevronDownIcon,
  DownloadIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "@/components/ui/Icons";

interface AppLayoutProps {
  graph: KnowledgeGraph;
  graphRef: RefObject<ForceGraphHandle>;
  onImport: (text: string) => Promise<boolean>;
  onClear: () => void;
  onReloadSample: () => void;
  onExport: () => void;
  importHistory: ImportRecord[];
  isImporting: boolean;
  showImportInput: boolean;
  setShowImportInput: (show: boolean) => void;
  importError: string | null;
  // 探索功能
  selectedNode: KnowledgeNode | null;
  onNodeSelect: (node: KnowledgeNode | null) => void;
  onSelectNodeFromSearch: (node: KnowledgeNode) => void;
  onNavigateNode: (node: KnowledgeNode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  visibleGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  highlightNodes: Set<string> | null;
  discoveries: Discovery[];
  isDiscovering: boolean;
  discoveryError: string | null;
  onDiscover: () => void;
  onAddEdges: (edges: KnowledgeEdge[]) => void;
  onIgnoreDiscovery: (id: string) => void;
  onHoverNodes: (nodeIds: string[] | null) => void;
  selectedNodeId: string | null;
  // 撤销/重做
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // 节点编辑/删除
  onNodeUpdate: (id: string, updates: Partial<KnowledgeNode>) => void;
  onNodeDelete: (id: string) => void;
  // JSON 导出/导入
  onExportJSON: () => void;
  onImportJSONTrigger: () => void;
  // 聚焦节点
  onFocusNode?: (nodeId: string) => void;
  // 上下节点导航
  onPrevNode?: () => void;
  onNextNode?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // 领域筛选：仅显示 / 全部 / 反选
  onShowOnlyGroup: (group: string) => void;
  onShowAllGroups: () => void;
  onInvertGroups: () => void;
  // 导入历史
  onRestoreFromHistory: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  // 最近浏览节点
  recentNodes: KnowledgeNode[];
  onClearRecentNodes: () => void;
  // 手动创建节点
  onNodeCreate: (data: { label: string; description?: string; group: import("@/lib/types").NodeGroup }) => void;
  // 手动创建边
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  // 路径查找
  pathHighlightNodes?: Set<string> | null;
  onStartPathFind?: (nodeId: string) => void;
  isPathFindMode?: boolean;
  // 边编辑/删除
  onEdgeDelete?: (sourceId: string, targetId: string) => void;
  onEdgeUpdate?: (sourceId: string, targetId: string, newRelation: string) => void;
}

/**
 * 主应用页布局：
 * 桌面端：左侧面板（320px）+ 力导向图谱区域 + 节点详情面板（右侧滑入）
 * 移动端：全屏图谱 + 底部工具栏 + 底部浮层面板
 */
export default function AppLayout(props: AppLayoutProps) {
  const {
    graph,
    graphRef,
    onImport,
    onClear,
    onReloadSample,
    onExport,
    importHistory,
    isImporting,
    showImportInput,
    setShowImportInput,
    importError,
    selectedNode,
    onNodeSelect,
    onSelectNodeFromSearch,
    onNavigateNode,
    onSearchChange,
    visibleGroups,
    onToggleGroup,
    highlightNodes,
    discoveries,
    isDiscovering,
    discoveryError,
    onDiscover,
    onAddEdges,
    onIgnoreDiscovery,
    onHoverNodes,
    selectedNodeId,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onNodeUpdate,
    onNodeDelete,
    onExportJSON,
    onImportJSONTrigger,
    onFocusNode,
    onPrevNode,
    onNextNode,
    hasPrev,
    hasNext,
    onShowOnlyGroup,
    onShowAllGroups,
    onInvertGroups,
    onRestoreFromHistory,
    onDeleteHistoryItem,
    onClearHistory,
    recentNodes,
    onClearRecentNodes,
    onNodeCreate,
    onEdgeCreate,
    pathHighlightNodes,
    onStartPathFind,
    isPathFindMode,
    onEdgeDelete,
    onEdgeUpdate,
  } = props;

  const [mobileSheet, setMobileSheet] = useState<MobileSheetType>(null);
  const [showCreateNode, setShowCreateNode] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("starmap-sidebar-collapsed") === "true"; } catch { return false; }
  });
  const isGraphEmpty = graph.nodes.length === 0;
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // 切换侧边栏折叠状态
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("starmap-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  // 统计信息（含领域分布 + 度数排行）
  const stats = useMemo(() => {
    const groupCount = new Set(graph.nodes.map((n) => n.group)).size;
    // 领域分布
    const groupDistribution = new Map<string, number>();
    for (const n of graph.nodes) {
      groupDistribution.set(n.group, (groupDistribution.get(n.group) || 0) + 1);
    }
    const domainBars = Array.from(groupDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([group, count]) => ({ group, count, pct: Math.round((count / Math.max(1, graph.nodes.length)) * 100) }));
    // 度数排行 Top5
    const degreeMap = computeDegreeMap(graph.edges);
    const topDegree = Array.from(degreeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nodeId, degree]) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        return { nodeId, degree, label: node?.label ?? nodeId, group: node?.group ?? "general" };
      });
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      groups: groupCount,
      domainBars,
      topDegree,
    };
  }, [graph]);

  const handleClear = () => {
    onClear();
    onNodeSelect(null);
    setMobileSheet(null);
  };

  const handleCloseDetail = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // 点击外部关闭导出下拉菜单
  useEffect(() => {
    if (!showExportDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportDropdown]);

  // 左侧面板内容（桌面端）
  const PanelContent = (
    <div className="flex h-full flex-col">
      {/* 标题区域 */}
      <div className="px-5 py-5">
        <Link
          href="/"
          className="group flex items-center gap-2"
          title="返回首页"
        >
          <SparkleIcon size={18} className="text-node-blue transition-transform duration-200 group-hover:scale-110" />
          <span className="text-lg font-semibold text-star-white transition-colors group-hover:text-node-blue">
            {SITE.name}
          </span>
        </Link>
        <p className="mt-1 text-xs text-star-dim">
          让你的知识像星空一样可见
        </p>
      </div>

      {/* 滚动内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 搜索栏 */}
        <div className="mb-5">
          <SearchBar
            graph={graph}
            onSelectNode={onSelectNodeFromSearch}
            onSearchChange={onSearchChange}
          />
        </div>

        {/* 最近浏览节点 */}
        {recentNodes.length > 0 && (
          <div className="mb-5">
            <RecentNodes
              nodes={recentNodes}
              activeNodeId={selectedNodeId ?? null}
              onNavigate={onNavigateNode}
              onClear={onClearRecentNodes}
            />
          </div>
        )}

        {/* 导入面板 */}
        <div className="mb-5">
          <ImportPanel
            showImportInput={showImportInput}
            setShowImportInput={setShowImportInput}
            onImport={onImport}
            isImporting={isImporting}
            isGraphEmpty={isGraphEmpty}
            importError={importError}
          />
        </div>

        {/* 统计信息 */}
        <div className="mb-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
            图谱统计
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="节点" value={stats.nodes} />
            <StatCard label="关系" value={stats.edges} />
            <StatCard label="领域" value={stats.groups} />
          </div>
          {/* 领域分布条形图 */}
          {stats.domainBars.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {stats.domainBars.map(({ group, count, pct }) => (
                <div key={group} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 truncate text-[11px] text-star-dim" title={GROUP_LABELS[group]}>
                    {GROUP_LABELS[group]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-space-600/50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: GROUP_COLORS[group as keyof typeof GROUP_COLORS] || "#4fc3f7",
                        boxShadow: `0 0 6px ${GROUP_COLORS[group as keyof typeof GROUP_COLORS] || "#4fc3f7"}40`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-star-dim">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* 度数排行 Top5 */}
          {stats.topDegree.length > 0 && (
            <div className="mt-3">
              <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-star-dim/60">
                连接排行 Top5
              </h4>
              <div className="space-y-1">
                {stats.topDegree.map(({ nodeId, degree, label, group }, idx) => (
                  <div key={nodeId} className="flex items-center gap-2 rounded-md px-1 py-0.5">
                    <span className="w-4 text-center text-[10px] font-bold text-star-dim/50">
                      {idx + 1}
                    </span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: GROUP_COLORS[group as keyof typeof GROUP_COLORS] || "#4fc3f7" }}
                    />
                    <span className="flex-1 truncate text-[11px] text-star-white/80">
                      {label}
                    </span>
                    <span className="text-[10px] tabular-nums text-node-blue/80">
                      {degree}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 导入历史 */}
        {importHistory.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
              导入历史
            </h3>
            <ImportHistory
              history={importHistory}
              onRestore={onRestoreFromHistory}
              onDelete={onDeleteHistoryItem}
              onClearAll={onClearHistory}
            />
          </div>
        )}

        {/* AI 关联发现 */}
        <div className="mb-5">
          <DiscoveryPanel
            discoveries={discoveries}
            isDiscovering={isDiscovering}
            error={discoveryError}
            nodeCount={stats.nodes}
            onDiscover={onDiscover}
            onAddEdges={onAddEdges}
            onIgnore={onIgnoreDiscovery}
            onHoverNodes={onHoverNodes}
          />
        </div>

        {/* 导出 + 导入 + 清空按钮 */}
        {!isGraphEmpty && (
          <div className="mb-5 flex gap-2">
            {/* 导出下拉 */}
            <div className="relative flex-1 min-w-0" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown((prev) => !prev)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-space-500 px-3 py-2 text-sm whitespace-nowrap text-star-dim transition-all hover:border-node-blue/40 hover:text-node-blue active:scale-95"
              >
                <DownloadIcon size={16} />
                <span className="truncate">导出</span>
                <ChevronDownIcon size={14} className="shrink-0" />
              </button>
              {showExportDropdown && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-space-500 bg-space-700 shadow-lg">
                  <button
                    onClick={() => {
                      onExport();
                      setShowExportDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-star-dim transition-all hover:bg-space-600 hover:text-star-white"
                  >
                    导出图片
                  </button>
                  <button
                    onClick={() => {
                      onExportJSON();
                      setShowExportDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-star-dim transition-all hover:bg-space-600 hover:text-star-white"
                  >
                    导出 JSON
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onImportJSONTrigger}
              className="flex-1 min-w-0 rounded-xl border border-space-500 px-3 py-2 text-sm whitespace-nowrap text-star-dim transition-all hover:border-node-blue/40 hover:text-node-blue active:scale-95"
            >
              <span className="truncate">导入 JSON</span>
            </button>
            <button
              onClick={handleClear}
              disabled={isImporting}
              className="flex-1 min-w-0 rounded-xl border border-space-500 px-3 py-2 text-sm whitespace-nowrap text-star-dim transition-all hover:border-red-400/40 hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="truncate">清空图谱</span>
            </button>
          </div>
        )}

        {/* 重新加载示例（图谱为空时） */}
        {isGraphEmpty && (
          <button
            onClick={onReloadSample}
            className="mb-5 w-full rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-node-blue/60 hover:text-star-white active:scale-95"
          >
            重新加载示例数据
          </button>
        )}
      </div>

      {/* 底部：领域筛选 */}
      <div className="px-5 py-4">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
          领域筛选
        </h4>
        <DomainFilter
          graph={graph}
          visibleGroups={visibleGroups}
          onToggle={onToggleGroup}
          onShowOnly={onShowOnlyGroup}
          onShowAll={onShowAllGroups}
          onInvert={onInvertGroups}
        />
      </div>
    </div>
  );

  // 移动端底部浮层内容
  const renderMobileSheetContent = () => {
    if (!mobileSheet) return null;

    return (
      <>
        {/* 遮罩 */}
        <div
          className="fixed inset-0 z-40 bg-space-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSheet(null)}
        />
        {/* 底部浮层 */}
        <div className="fixed bottom-16 left-0 right-0 z-40 max-h-[60vh] overflow-y-auto rounded-t-2xl bg-space-800 p-4 shadow-2xl animate-slide-in-bottom md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-star-white">
              {mobileSheet === "search" && (
                <>
                  <SearchIcon size={16} /> 搜索知识概念
                </>
              )}
              {mobileSheet === "import" && (
                <>
                  <ImportIcon size={16} /> 导入知识
                </>
              )}
              {mobileSheet === "discover" && (
                <>
                  <DiscoverIcon size={16} /> AI 关联发现
                </>
              )}
              {mobileSheet === "settings" && (
                <>
                  <SettingsIcon size={16} /> 设置
                </>
              )}
            </h3>
            <button
              onClick={() => setMobileSheet(null)}
              className="text-star-dim hover:text-star-white"
              aria-label="关闭"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {mobileSheet === "search" && (
            <>
              <SearchBar
                graph={graph}
                onSelectNode={(node) => {
                  onSelectNodeFromSearch(node);
                  setMobileSheet(null);
                }}
                onSearchChange={onSearchChange}
              />
              {recentNodes.length > 0 && (
                <div className="mt-3">
                  <RecentNodes
                    nodes={recentNodes}
                    activeNodeId={selectedNodeId ?? null}
                    onNavigate={(node) => {
                      onNavigateNode(node);
                      setMobileSheet(null);
                    }}
                    onClear={onClearRecentNodes}
                  />
                </div>
              )}
            </>
          )}

          {mobileSheet === "import" && (
            <ImportPanel
              showImportInput={showImportInput}
              setShowImportInput={setShowImportInput}
              onImport={onImport}
              isImporting={isImporting}
              isGraphEmpty={isGraphEmpty}
              importError={importError}
            />
          )}

          {mobileSheet === "discover" && (
            <DiscoveryPanel
              discoveries={discoveries}
              isDiscovering={isDiscovering}
              error={discoveryError}
              nodeCount={stats.nodes}
              onDiscover={onDiscover}
              onAddEdges={onAddEdges}
              onIgnore={onIgnoreDiscovery}
              onHoverNodes={onHoverNodes}
            />
          )}

          {mobileSheet === "settings" && (
            <div className="space-y-4">
              {/* 统计 */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
                  图谱统计
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="节点" value={stats.nodes} />
                  <StatCard label="关系" value={stats.edges} />
                  <StatCard label="领域" value={stats.groups} />
                </div>
              </div>
              {/* 领域筛选 */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
                  领域筛选
                </h4>
                <DomainFilter
                  graph={graph}
                  visibleGroups={visibleGroups}
                  onToggle={onToggleGroup}
                  onShowOnly={onShowOnlyGroup}
                  onShowAll={onShowAllGroups}
                  onInvert={onInvertGroups}
                />
              </div>
              {/* 导入历史 */}
              {importHistory.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
                    导入历史
                  </h4>
                  <ImportHistory
                  history={importHistory}
                  onRestore={onRestoreFromHistory}
                  onDelete={onDeleteHistoryItem}
                  onClearAll={onClearHistory}
                />
                </div>
              )}
              {/* 导出 + 清空 */}
              {!isGraphEmpty && (
                <div className="flex gap-2">
                  <button
                    onClick={onExport}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-space-500 px-4 py-2.5 text-sm whitespace-nowrap text-star-dim transition-all hover:border-node-blue/40 hover:text-node-blue active:scale-95"
                  >
                    导出
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={isImporting}
                    className="flex-1 rounded-xl border border-space-500 px-4 py-2.5 text-sm whitespace-nowrap text-star-dim transition-all hover:border-red-400/40 hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    清空
                  </button>
                </div>
              )}
              {/* 重新加载示例 */}
              <button
                onClick={onReloadSample}
                className="w-full rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-node-blue/60 hover:text-star-white active:scale-95"
              >
                重新加载示例
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // 折叠态侧边栏（仅图标按钮）
  const CollapsedSidebar = (
    <div className="flex h-full flex-col items-center py-4">
      {/* 折叠切换按钮 */}
      <button
        onClick={toggleSidebar}
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg text-star-dim transition-all hover:bg-space-700 hover:text-node-blue"
        title="展开侧边栏"
      >
        <PanelLeftOpenIcon size={18} />
      </button>
      {/* Logo */}
      <Link href="/" className="mb-4 flex h-9 w-9 items-center justify-center" title="返回首页">
        <SparkleIcon size={18} className="text-node-blue" />
      </Link>
      {/* 快捷操作图标 */}
      <div className="flex flex-1 flex-col items-center gap-2">
        <button
          onClick={() => { toggleSidebar(); }}
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-star-dim transition-all hover:bg-space-700 hover:text-node-blue"
          title="搜索"
        >
          <SearchIcon size={18} />
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-space-700 px-2 py-1 text-xs text-star-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            搜索
          </span>
        </button>
        <button
          onClick={() => { toggleSidebar(); setShowImportInput(true); }}
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-star-dim transition-all hover:bg-space-700 hover:text-node-blue"
          title="导入"
        >
          <ImportIcon size={18} />
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-space-700 px-2 py-1 text-xs text-star-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            导入
          </span>
        </button>
        <button
          onClick={() => { toggleSidebar(); }}
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-star-dim transition-all hover:bg-space-700 hover:text-node-blue"
          title="发现"
        >
          <DiscoverIcon size={18} />
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-space-700 px-2 py-1 text-xs text-star-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            发现
          </span>
        </button>
      </div>
      {/* 底部统计迷你显示 */}
      <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-space-600/30 pt-3">
        <div className="flex h-8 w-8 flex-col items-center justify-center rounded-lg bg-space-700/50">
          <span className="text-xs font-bold tabular-nums text-node-blue">{stats.nodes}</span>
          <span className="text-[8px] leading-none text-star-dim">节点</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-star-dim transition-all hover:bg-space-700 hover:text-star-white"
          title="设置"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-space-900">
      {/* 左侧面板 - 桌面端（支持折叠/展开过渡动画） */}
      <aside
        className="hidden relative shrink-0 bg-space-800/80 transition-all duration-300 ease-in-out md:flex md:flex-col"
        style={{ width: sidebarCollapsed ? 56 : 320 }}
      >
        {sidebarCollapsed ? CollapsedSidebar : PanelContent}
        {/* 折叠/展开切换按钮（悬浮在侧边栏右边缘） */}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2 flex h-8 w-5 items-center justify-center rounded-r-md border border-l-0 border-space-500/50 bg-space-700/80 text-star-dim backdrop-blur-sm transition-all hover:bg-space-600 hover:text-node-blue"
            title="收起侧边栏"
          >
            <PanelLeftCloseIcon size={14} />
          </button>
        )}
      </aside>

      {/* 右侧图谱区域 */}
      <main className="relative flex-1">
        {isGraphEmpty ? (
          <div className="flex h-full items-center justify-center px-5 pb-20 md:pb-0">
            <EmptyState
              icon="sparkle"
              title="你的知识宇宙等待探索"
              description="导入你的第一篇笔记或文章，开始构建知识星图"
              action={
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportInput(true)}
                    className="flex items-center gap-2 rounded-xl bg-node-blue/90 px-6 py-2.5 text-sm font-medium text-space-900 transition-all hover:bg-node-blue hover:shadow-[0_0_16px_rgba(79,195,247,0.4)] active:scale-95"
                  >
                    <ImportIcon size={16} />
                    导入知识
                  </button>
                  <button
                    onClick={onReloadSample}
                    className="rounded-xl border border-space-500 px-6 py-2.5 text-sm text-star-white transition-all hover:border-node-blue/60 hover:bg-space-600/40 active:scale-95"
                  >
                    重新加载示例
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <ForceGraph
            ref={graphRef}
            graph={graph}
            onNodeSelect={onNodeSelect}
            highlightNodes={highlightNodes}
            visibleGroups={visibleGroups}
            selectedNodeId={selectedNodeId}
            className="bg-space-900"
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onNodeEdit={(node) => onNodeSelect(node)}
            onNodeDelete={(node) => onNodeDelete(node.id)}
            onCanvasDoubleClick={() => setShowCreateNode(true)}
            onEdgeCreate={onEdgeCreate}
          />
        )}

        {/* 移动端底部浮层 */}
        {renderMobileSheetContent()}
      </main>

      {/* 移动端底部工具栏 */}
      <MobileToolbar activeSheet={mobileSheet} onSheetChange={setMobileSheet} />

      {/* 节点详情面板（右侧滑入 / 移动端底部滑入） */}
      <NodeDetail
        node={selectedNode}
        graph={graph}
        onClose={handleCloseDetail}
        onNavigateNode={onNavigateNode}
        onNodeUpdate={onNodeUpdate}
        onNodeDelete={onNodeDelete}
        onFocusNode={onFocusNode}
        onPrevNode={onPrevNode}
        onNextNode={onNextNode}
        hasPrev={hasPrev}
        hasNext={hasNext}
        pathHighlightNodes={pathHighlightNodes}
        onStartPathFind={onStartPathFind}
        isPathFindMode={isPathFindMode}
        onEdgeDelete={onEdgeDelete}
        onEdgeUpdate={onEdgeUpdate}
      />

      {/* 手动创建节点弹窗 */}
      <CreateNodeModal
        open={showCreateNode}
        onClose={() => setShowCreateNode(false)}
        onCreate={(data) => {
          onNodeCreate(data);
          setShowCreateNode(false);
        }}
      />
    </div>
  );
}

/** 统计卡片（数字变化时带计数动画） */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-space-500/50 bg-space-700/50 px-2 py-3 text-center">
      <div className="text-2xl font-bold tabular-nums text-node-blue transition-all duration-300">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-star-dim">{label}</div>
    </div>
  );
}
