/**
 * 高亮匹配文本组件
 * 在文本中高亮显示匹配查询的子串
 */

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export default function HighlightedText({
  text,
  query,
  className = "",
  highlightClassName = "rounded bg-node-blue/30 px-0.5 text-node-blue",
}: HighlightedTextProps) {
  if (!query.trim()) return <span className={className}>{text}</span>;
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <mark className={highlightClassName}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}
