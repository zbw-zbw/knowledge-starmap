"use client";

import type { KnowledgeGraph, ImportRecord } from "@/lib/types";

interface GraphExportData {
  version: 1;
  exportedAt: string;
  graph: KnowledgeGraph;
  importHistory: ImportRecord[];
}

export function exportGraphJSON(graph: KnowledgeGraph, importHistory: ImportRecord[]) {
  const data: GraphExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    graph,
    importHistory,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `知识星图-${new Date().toLocaleDateString("zh-CN")}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importGraphJSON(file: File): Promise<GraphExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data?.version === 1 && data?.graph?.nodes && data?.graph?.edges) {
          resolve(data as GraphExportData);
        } else {
          reject(new Error("文件格式无效"));
        }
      } catch {
        reject(new Error("JSON 解析失败"));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}
