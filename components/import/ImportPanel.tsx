"use client";

import { useState } from "react";
import TextInput from "./TextInput";
import SampleTexts from "./SampleTexts";
import ImportProgress from "./ImportProgress";

interface ImportPanelProps {
  showImportInput: boolean;
  setShowImportInput: (show: boolean) => void;
  onImport: (text: string) => Promise<void>;
  isImporting: boolean;
  isGraphEmpty: boolean;
  importError: string | null;
}

/**
 * 导入面板主组件：
 * - 未展开时显示「导入知识」按钮
 * - 展开时显示文本输入区 + 示例文本 + 提取按钮
 * - 导入中显示进度遮罩
 * - 错误信息显示在底部
 */
export default function ImportPanel({
  showImportInput,
  setShowImportInput,
  onImport,
  isImporting,
  isGraphEmpty,
  importError,
}: ImportPanelProps) {
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (text.trim().length === 0) return;
    await onImport(text.trim());
    // 导入成功后清空文本并收起（由父组件控制 showImportInput）
    setText("");
  };

  const handleSampleSelect = (sampleText: string) => {
    setText(sampleText);
  };

  const handleToggle = () => {
    setShowImportInput(!showImportInput);
    if (showImportInput) {
      setText("");
    }
  };

  return (
    <div className="relative">
      {/* 导入按钮 / 收起按钮 */}
      <button
        onClick={handleToggle}
        disabled={isImporting}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          showImportInput
            ? "border border-space-500 text-star-dim hover:border-space-500/60"
            : "bg-node-blue/90 text-space-900 hover:bg-node-blue hover:shadow-[0_0_16px_rgba(79,195,247,0.4)]"
        }`}
      >
        {showImportInput ? "▼ 收起" : "📥 导入知识"}
      </button>

      {/* 展开的输入区域 */}
      {showImportInput && (
        <div className="relative mt-3 space-y-3">
          <ImportProgress isVisible={isImporting} />

          <TextInput
            value={text}
            onChange={setText}
            onSubmit={handleSubmit}
            isImporting={isImporting}
          />

          <SampleTexts onSelect={handleSampleSelect} disabled={isImporting} />

          {importError && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2">
              <p className="text-xs text-red-300">{importError}</p>
            </div>
          )}
        </div>
      )}

      {/* 空图谱提示 */}
      {isGraphEmpty && !showImportInput && (
        <p className="mt-2 text-center text-xs text-star-dim/60">
          图谱为空，导入知识开始构建你的星图
        </p>
      )}
    </div>
  );
}
