"use client";

import { useState, useCallback, useRef } from "react";
import type { KnowledgeGraph } from "@/lib/types";

const MAX_HISTORY = 50;

/**
 * Undo/Redo Hook：
 * - 维护图谱状态历史栈
 * - push() 入栈新状态（自动截断 redo 分支）
 * - undo()/redo() 回退/前进
 * - 暴露 canUndo/canRedo 状态
 */
export function useUndoRedo(initialGraph: KnowledgeGraph) {
  const [history, setHistory] = useState<KnowledgeGraph[]>([initialGraph]);
  const [index, setIndex] = useState(0);
  const skipPushRef = useRef(false);

  const current = history[index];

  const push = useCallback((graphOrUpdater: KnowledgeGraph | ((prev: KnowledgeGraph) => KnowledgeGraph)) => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    setHistory((prevHistory) => {
      const prevGraph = prevHistory[index];
      const graph = typeof graphOrUpdater === "function" ? graphOrUpdater(prevGraph) : graphOrUpdater;
      const newHistory = prevHistory.slice(0, index + 1);
      newHistory.push(graph);
      // 超过上限时移除最早的记录
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(newHistory.length - MAX_HISTORY);
      }
      return newHistory;
    });
    setIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [index]);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
    skipPushRef.current = true;
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
    skipPushRef.current = true;
  }, [history.length]);

  const reset = useCallback((graph: KnowledgeGraph) => {
    setHistory([graph]);
    setIndex(0);
  }, []);

  return {
    current,
    push,
    undo,
    redo,
    reset,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    historyLength: history.length,
    currentIndex: index,
  };
}
