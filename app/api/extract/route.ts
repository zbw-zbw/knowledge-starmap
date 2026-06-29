import { NextResponse } from "next/server";
import type {
  ExtractRequest,
  ExtractResponse,
  KnowledgeEdge,
  KnowledgeNode,
} from "@/lib/types";
import { API_TIMEOUT } from "@/lib/constants";
import { extractJson, callDeepSeek } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `你是一个知识图谱分析专家。你的任务是从用户提供的文本中提取知识概念和它们之间的关系，用于构建知识图谱。

## 输出要求

请以 JSON 格式输出，包含以下字段：

{
  "title": "内容的简短标题（10字以内）",
  "summary": "内容的一句话摘要（30字以内）",
  "nodes": [
    {
      "id": "小写英文或拼音，用-连接，如 react-hooks",
      "label": "概念名称（中文优先，简短）",
      "group": "frontend | backend | pattern | engineering | general",
      "size": 10-28之间的整数，核心概念给大值，细节概念给小值,
      "description": "一句话描述这个概念（20字以内）"
    }
  ],
  "edges": [
    {
      "source": "源节点id",
      "target": "目标节点id",
      "relation": "关系描述（如：基于、使用、属于、实现、包含、影响）"
    }
  ]
}

## 提取规则

1. 提取 5-15 个最关键的知识概念作为节点，不要过于细碎
2. 每个节点必须有明确的 group 分类
3. 关系（边）应该反映概念之间的真实逻辑关系
4. id 必须唯一，使用小写英文，多个单词用-连接
5. 如果文本涉及的概念与用户已有的知识节点相关，在 edges 中建立连接（source/target 使用已有节点的 id）
6. group 分类说明：
   - frontend: 前端技术相关（UI、框架、浏览器、CSS等）
   - backend: 后端技术相关（服务器、数据库、API等）
   - pattern: 设计模式、编程范式、算法思想
   - engineering: 工程化实践（构建、测试、部署、版本控制等）
   - general: 通用知识、跨领域概念

只输出 JSON，不要输出任何其他内容。`;

function buildUserPrompt(text: string, existingNodes: string[]): string {
  const existingHint =
    existingNodes.length > 0
      ? `\n\n用户已有的知识节点：${existingNodes.join(
          ", "
        )}。如果新概念与这些已有节点有关联，请在 edges 中建立连接。`
      : "";

  return `请从以下文本中提取知识概念和关系：

---
${text}
---${existingHint}`;
}

/** 验证并规范化 API 返回的数据 */
function validateResponse(data: unknown): ExtractResponse {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object") {
    throw new Error("返回数据格式无效");
  }

  const title =
    typeof obj.title === "string" ? obj.title : "未命名内容";
  const summary =
    typeof obj.summary === "string" ? obj.summary : "";

  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];

  const validGroups = new Set([
    "frontend",
    "backend",
    "pattern",
    "engineering",
    "general",
  ]);

  const nodeIds = new Set<string>();
  const nodes: KnowledgeNode[] = [];
  for (const raw of rawNodes) {
    const n = raw as Record<string, unknown>;
    if (!n || typeof n.id !== "string" || typeof n.label !== "string") {
      continue;
    }
    const group = validGroups.has(n.group as string)
      ? (n.group as KnowledgeNode["group"])
      : "general";
    const size =
      typeof n.size === "number" && n.size >= 10 && n.size <= 28
        ? Math.round(n.size)
        : 14;
    const id = n.id as string;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);
    nodes.push({
      id,
      label: n.label as string,
      group,
      size,
      description:
        typeof n.description === "string" ? n.description : undefined,
    });
  }

  const edges: KnowledgeEdge[] = [];
  const edgeKeys = new Set<string>();
  for (const raw of rawEdges) {
    const e = raw as Record<string, unknown>;
    if (
      !e ||
      typeof e.source !== "string" ||
      typeof e.target !== "string" ||
      typeof e.relation !== "string"
    ) {
      continue;
    }
    const source = e.source as string;
    const target = e.target as string;
    // 过滤引用不存在节点的边
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({
      source,
      target,
      relation: e.relation as string,
    });
  }

  return { nodes, edges, title, summary };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ExtractRequest;
    const text: string = body?.text ?? "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "缺少 text 字段或内容为空" },
        { status: 400 }
      );
    }

    const existingNodes = body.existingNodes ?? [];

    const content = await callDeepSeek(
      SYSTEM_PROMPT,
      buildUserPrompt(text, existingNodes),
      { timeout: API_TIMEOUT }
    );

    const parsed = extractJson(content);

    if (!parsed) {
      return NextResponse.json(
        { error: "AI 返回内容无法解析为 JSON", raw: content.slice(0, 200) },
        { status: 422 }
      );
    }

    const result = validateResponse(parsed);

    if (result.nodes.length === 0) {
      return NextResponse.json(
        { error: "AI 未能从文本中提取到有效的知识概念" },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "服务异常，请稍后重试",
        detail: String(error).slice(0, 200),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/extract",
    method: "POST",
    description: "AI 知识提取接口 — 调用 DeepSeek 从文本中提取概念与关系",
  });
}
