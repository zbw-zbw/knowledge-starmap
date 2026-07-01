"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { KnowledgeGraph } from "@/lib/types";

const MAX_HISTORY = 50;

/**
 * Undo/Redo Hook：
 * - 维护图谱状态历史栈
 * - push() 入栈新状态（自动截断 redo 分支）
 * - undo()/redo() 回退/前进
 * - 暴露 canUndo/canRedo 状态
 *
 * 注意：undo/redo 不会触发 push，因为 push 仅由外部显式调用。
 * 持久化同步（setPersistedGraph）不经过 push，因此无需 skip 机制。
 */
export function useUndoRedo(initialGraph: KnowledgeGraph) {
  const [history, setHistory] = useState<KnowledgeGraph[]>([initialGraph]);
  const [index, setIndex] = useState(0);

  const current = history[index];
  const indexRef = useRef(index);
  const historyRef = useRef(history);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const push = useCallback((graphOrUpdater: KnowledgeGraph | ((prev: KnowledgeGraph) => KnowledgeGraph)) => {
    const curIndex = indexRef.current;
    const curHistory = historyRef.current;
    const prevGraph = curHistory[curIndex];
    const graph = typeof graphOrUpdater === "function" ? graphOrUpdater(prevGraph) : graphOrUpdater;

    const newHistory = curHistory.slice(0, curIndex + 1);
    newHistory.push(graph);
    // 超过上限时移除最早的记录
    const trimmed = newHistory.length > MAX_HISTORY
      ? newHistory.slice(newHistory.length - MAX_HISTORY)
      : newHistory;

    setHistory(trimmed);
    setIndex(trimmed.length - 1);
  }, []);

  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((prev) => Math.min(historyRef.current.length - 1, prev + 1));
  }, []);

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
