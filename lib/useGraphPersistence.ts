"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { KnowledgeGraph, ImportRecord } from "@/lib/types";
import { sampleGraph } from "@/lib/sampleData";

const STORAGE_KEY = "starmap-graph-v1";
const HISTORY_KEY = "starmap-history-v1";
const MAX_HISTORY = 50;

interface PersistedState {
  graph: KnowledgeGraph;
  importHistory: ImportRecord[];
}

/**
 * 图谱持久化 Hook：
 * - 初始化时从 localStorage 恢复保存的图谱和历史
 * - 图谱变更时自动保存（debounce 500ms）
 * - 如果 localStorage 无数据，回退到示例图谱
 */
export function useGraphPersistence() {
  const [graph, setGraph] = useState<KnowledgeGraph>(sampleGraph);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedHistory = localStorage.getItem(HISTORY_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as KnowledgeGraph;
        if (
          parsed &&
          Array.isArray(parsed.nodes) &&
          Array.isArray(parsed.edges)
        ) {
          setGraph(parsed);
        }
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as ImportRecord[];
        if (Array.isArray(parsedHistory)) {
          setImportHistory(parsedHistory.slice(0, MAX_HISTORY));
        }
      }
    } catch {
      // 解析失败时静默回退到示例数据
    }
    setIsLoaded(true);
  }, []);

  // 自动保存（debounce 500ms）
  useEffect(() => {
    if (!isLoaded) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
      } catch {
        // 存储空间不足时静默失败
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [graph, isLoaded]);

  // 保存导入历史
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(importHistory));
    } catch {
      // 静默失败
    }
  }, [importHistory, isLoaded]);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // 静默失败
    }
  }, []);

  return {
    graph,
    setGraph,
    importHistory,
    setImportHistory,
    isLoaded,
    clearStorage,
  };
}
