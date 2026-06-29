/** Extract shared DeepSeek API utilities */

export const DEEPSEEK_DEFAULTS = {
  model: "deepseek-chat",
  temperature: 0.3,
  maxTokens: 2000,
} as const;

/** Try to extract JSON from text that may contain non-JSON content */
export function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

/** Call DeepSeek chat API with system prompt and user message */
export async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number; apiKey?: string; baseUrl?: string }
): Promise<string> {
  const apiKey = options?.apiKey || process.env.DEEPSEEK_API_KEY;
  const baseUrl = options?.baseUrl || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const timeout = options?.timeout || 30000;

  if (!apiKey || apiKey === "your-api-key-here") {
    throw new Error("DeepSeek API Key 未配置。请在 .env.local 中设置 DEEPSEEK_API_KEY。");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_DEFAULTS.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: DEEPSEEK_DEFAULTS.temperature,
        max_tokens: DEEPSEEK_DEFAULTS.maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "未知错误");
      throw new Error(`AI 服务返回错误 (${response.status}): ${errorText.slice(0, 100)}`);
    }

    const data = await response.json().catch(() => null);
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error("AI 返回内容为空");
    }

    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI 分析超时，请稍后重试");
    }
    throw error;
  }
}
