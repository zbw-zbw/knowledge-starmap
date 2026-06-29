import { NextResponse } from "next/server";
import type {
  DiscoverRequest,
  DiscoverResponse,
  Discovery,
  KnowledgeEdge,
} from "@/lib/types";
import { API_TIMEOUT } from "@/lib/constants";
import { extractJson, callDeepSeek } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `你是一个知识关联分析专家。分析用户的知识图谱，发现隐藏的关联和知识盲区。

## 输出要求

以 JSON 格式输出，包含 discoveries 数组：

{
  "discoveries": [
    {
      "type": "hidden-link | knowledge-gap | cluster",
      "title": "发现标题（15字以内）",
      "description": "详细说明（50字以内）",
      "relatedNodes": ["node-id-1", "node-id-2"],
      "suggestedEdges": [
        { "source": "node-id-1", "target": "node-id-2", "relation": "关系描述" }
      ],
      "confidence": 0.0-1.0
    }
  ]
}

## 发现类型说明

- hidden-link: 两个概念之间存在但用户可能没意识到的隐藏关联
- knowledge-gap: 知识图谱中缺失的概念或关联，建议补充的学习方向
- cluster: 发现概念群组/主题集群，帮助用户理解知识结构

## 分析规则

1. 重点发现跨领域(group)的隐藏关联——这些最有价值
2. 知识盲区分析：根据现有节点推测应该存在但缺失的关键概念
3. 每次返回 3-5 条发现
4. confidence 根据关联的明确程度设置，0.9+ 表示非常确定
5. suggestedEdges 中引用的节点 id 必须是用户提供的已有节点

只输出 JSON，不要输出任何其他内容。`;

function buildUserPrompt(
  nodes: DiscoverRequest["nodes"],
  edges: DiscoverRequest["edges"]
): string {
  const nodeText = nodes
    .map((n) => `- ${n.id} (${n.label}, ${n.group}): ${n.description || ""}`)
    .join("\n");

  const edgeText = edges
    .map((e) => `- ${e.source} → ${e.target}: ${e.relation}`)
    .join("\n");

  return `请分析以下知识图谱，发现隐藏关联和知识盲区：

节点列表：
${nodeText}

已有关系：
${edgeText}`;
}

const VALID_TYPES = new Set(["hidden-link", "knowledge-gap", "cluster"]);

function validateResponse(data: unknown, validNodeIds: Set<string>): Discovery[] {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object") {
    throw new Error("返回数据格式无效");
  }

  const rawDiscoveries = Array.isArray(obj.discoveries) ? obj.discoveries : [];
  const discoveries: Discovery[] = [];

  for (const raw of rawDiscoveries) {
    const d = raw as Record<string, unknown>;
    if (!d || typeof d !== "object") continue;

    const type = VALID_TYPES.has(d.type as string)
      ? (d.type as Discovery["type"])
      : "hidden-link";

    const title = typeof d.title === "string" ? d.title : "未命名发现";
    const description =
      typeof d.description === "string" ? d.description : "";

    const relatedNodes = Array.isArray(d.relatedNodes)
      ? (d.relatedNodes as unknown[]).filter(
          (id): id is string =>
            typeof id === "string" && validNodeIds.has(id)
        )
      : [];

    const suggestedEdges: KnowledgeEdge[] = Array.isArray(d.suggestedEdges)
      ? (d.suggestedEdges as unknown[])
          .map((e) => e as Record<string, unknown>)
          .filter(
            (e) =>
              e &&
              typeof e.source === "string" &&
              typeof e.target === "string" &&
              typeof e.relation === "string" &&
              validNodeIds.has(e.source as string) &&
              validNodeIds.has(e.target as string)
          )
          .map((e) => ({
            source: e.source as string,
            target: e.target as string,
            relation: e.relation as string,
          }))
      : [];

    const confidence =
      typeof d.confidence === "number"
        ? Math.max(0, Math.min(1, d.confidence))
        : 0.5;

    discoveries.push({
      id: `discovery-${discoveries.length}-${Date.now()}`,
      type,
      title,
      description,
      relatedNodes,
      suggestedEdges,
      confidence,
    });
  }

  return discoveries;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DiscoverRequest;
    const nodes = body?.nodes ?? [];
    const edges = body?.edges ?? [];

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "缺少 nodes 字段或节点为空" },
        { status: 400 }
      );
    }

    const validNodeIds = new Set(nodes.map((n) => n.id));

    const content = await callDeepSeek(
      SYSTEM_PROMPT,
      buildUserPrompt(nodes, edges),
      { timeout: API_TIMEOUT }
    );

    const parsed = extractJson(content);

    if (!parsed) {
      return NextResponse.json(
        { error: "AI 返回内容无法解析为 JSON", raw: content.slice(0, 200) },
        { status: 422 }
      );
    }

    const discoveries = validateResponse(parsed, validNodeIds);

    return NextResponse.json({ discoveries } as DiscoverResponse);
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
    endpoint: "/api/discover",
    method: "POST",
    description: "AI 关联发现接口 — 调用 DeepSeek 分析隐藏关联和知识盲区",
  });
}
