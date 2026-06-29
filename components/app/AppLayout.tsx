"use client";

import { useState, useMemo, useCallback, type RefObject } from "react";
import type {
  KnowledgeGraph,
  KnowledgeNode,
  ImportRecord,
  Discovery,
  KnowledgeEdge,
} from "@/lib/types";
import { SITE } from "@/lib/constants";
import ForceGraph, { type ForceGraphHandle } from "@/components/graph/ForceGraph";
import Legend from "@/components/graph/Legend";
import ImportPanel from "@/components/import/ImportPanel";
import ImportHistory from "@/components/import/ImportHistory";
import SearchBar from "@/components/explore/SearchBar";
import DomainFilter from "@/components/explore/DomainFilter";
import NodeDetail from "@/components/explore/NodeDetail";
import DiscoveryPanel from "@/components/explore/DiscoveryPanel";
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
} from "@/components/ui/Icons";

interface AppLayoutProps {
  graph: KnowledgeGraph;
  graphRef: RefObject<ForceGraphHandle>;
  onImport: (text: string) => Promise<void>;
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
  } = props;

  const [mobileSheet, setMobileSheet] = useState<MobileSheetType>(null);
  const isGraphEmpty = graph.nodes.length === 0;

  // 统计信息
  const stats = useMemo(() => {
    const groupCount = new Set(graph.nodes.map((n) => n.group)).size;
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      groups: groupCount,
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

  // 左侧面板内容（桌面端）
  const PanelContent = (
    <div className="flex h-full flex-col">
      {/* 标题区域 */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <SparkleIcon size={18} className="text-node-blue" />
          <span className="text-lg font-semibold text-star-white">
            {SITE.name}
          </span>
        </div>
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

        {/* 导入面板 */}
        <div className="mb-6 pt-5">
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
        <div className="mb-6 pt-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
            图谱统计
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="节点" value={stats.nodes} />
            <StatCard label="关系" value={stats.edges} />
            <StatCard label="领域" value={stats.groups} />
          </div>
        </div>

        {/* 提示 */}
        {!selectedNode && !isGraphEmpty && (
          <div className="mb-6 rounded-xl border border-dashed border-space-500/50 p-3 text-center">
            <p className="text-xs text-star-dim">
              点击星图中的节点查看详情
            </p>
          </div>
        )}

        {/* 导入历史 */}
        {importHistory.length > 0 && (
          <div className="mb-6 pt-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-star-dim">
              导入历史
            </h3>
            <ImportHistory history={importHistory} />
          </div>
        )}

        {/* AI 关联发现 */}
        <div className="mb-6 pt-5">
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

        {/* 导出 + 清空按钮 */}
        {!isGraphEmpty && (
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-node-blue/40 hover:text-node-blue active:scale-95"
            >
              导出图片
            </button>
            <button
              onClick={handleClear}
              disabled={isImporting}
              className="flex-1 rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-red-400/40 hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              清空图谱
            </button>
          </div>
        )}
      </div>

      {/* 底部：领域筛选 + 图例 */}
      <div className="px-5 py-4">
        <div className="mb-3">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
            领域筛选
          </h4>
          <DomainFilter
            graph={graph}
            visibleGroups={visibleGroups}
            onToggle={onToggleGroup}
          />
        </div>
        <Legend />
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
            <SearchBar
              graph={graph}
              onSelectNode={(node) => {
                onSelectNodeFromSearch(node);
                setMobileSheet(null);
              }}
              onSearchChange={onSearchChange}
            />
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
                />
              </div>
              {/* 图例 */}
              <Legend />
              {/* 导入历史 */}
              {importHistory.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-star-dim">
                    导入历史
                  </h4>
                  <ImportHistory history={importHistory} />
                </div>
              )}
              {/* 导出 + 清空 */}
              {!isGraphEmpty && (
                <div className="flex gap-2">
                  <button
                    onClick={onExport}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-node-blue/40 hover:text-node-blue active:scale-95"
                  >
                    导出
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={isImporting}
                    className="flex-1 rounded-xl border border-space-500 px-4 py-2.5 text-sm text-star-dim transition-all hover:border-red-400/40 hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-space-900 md:h-[calc(100vh-4rem)]">
      {/* 左侧面板 - 桌面端 */}
      <aside className="hidden w-80 shrink-0 bg-space-800/80 md:flex md:flex-col">
        {PanelContent}
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
      />
    </div>
  );
}

/** 统计卡片 */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-space-500/50 bg-space-700/50 px-2 py-3 text-center">
      <div className="text-2xl font-bold text-node-blue transition-all duration-300">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-star-dim">{label}</div>
    </div>
  );
}
