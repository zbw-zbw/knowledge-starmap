/**
 * 模糊搜索工具函数
 * 基于 Levenshtein 编辑距离实现
 */

/**
 * 计算两个字符串的 Levenshtein 编辑距离
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * 模糊匹配：检查 query 是否与 text 的某个子串足够相似。
 * 使用滑动窗口取与 query 等长的子串，计算编辑距离。
 * 阈值：query 长度 <= 3 时允许 1 次编辑，<= 6 时 2 次，否则 3 次。
 */
export function fuzzyMatch(text: string, query: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q.length < 2) return false;
  const maxDist = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;
  if (t.includes(q)) return true;
  const qLen = q.length;
  for (let i = 0; i <= t.length - qLen; i++) {
    const sub = t.substring(i, i + qLen);
    if (levenshtein(sub, q) <= maxDist) return true;
  }
  if (t.length < qLen && levenshtein(t, q) <= maxDist) return true;
  return false;
}

/**
 * 综合搜索匹配：先精确子串，再模糊匹配。
 * 返回是否匹配。
 */
export function searchMatch(label: string, description: string | undefined, id: string, query: string): boolean {
  const q = query.toLowerCase();
  // 精确匹配
  if (
    label.toLowerCase().includes(q) ||
    (description?.toLowerCase().includes(q) ?? false) ||
    id.toLowerCase().includes(q)
  ) {
    return true;
  }
  // 模糊匹配（query >= 2 字符时启用）
  if (q.length >= 2) {
    return fuzzyMatch(label, q) || fuzzyMatch(description || "", q);
  }
  return false;
}
