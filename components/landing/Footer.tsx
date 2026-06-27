import { SITE } from "@/lib/constants";

/**
 * 页脚：深色背景 + 顶部细分割线。
 * 左侧品牌与描述，右侧大赛信息，底部居中构建说明。
 */
export default function Footer() {
  return (
    <footer className="border-t border-space-500/60 bg-space-900/60">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-star-white">
              <span className="text-node-blue">✦</span>
              <span className="font-semibold">知识星图</span>
            </div>
            <p className="mt-2 text-sm text-star-dim">
              让你的知识像星空一样可见 · 可探索 · 可连接
            </p>
          </div>

          <p className="text-sm text-star-dim">{SITE.contest}</p>
        </div>

        <div className="mt-8 border-t border-space-500/40 pt-6 text-center">
          <p className="text-xs text-star-dim/70">{SITE.builtWith}</p>
        </div>
      </div>
    </footer>
  );
}
