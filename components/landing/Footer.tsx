import { SparkleIcon } from "@/components/ui/Icons";

/**
 * 页脚：深色背景。
 * 左侧品牌与描述，底部居中版权说明。
 */
export default function Footer() {
  return (
    <footer className="bg-space-900/60">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-star-white">
              <SparkleIcon size={16} className="text-node-blue" />
              <span className="font-semibold">知识星图</span>
            </div>
            <p className="mt-2 text-sm text-star-dim">
              让你的知识像星空一样可见 · 可探索 · 可连接
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 text-center">
          <p className="text-xs text-star-dim/70">
            © 2026 知识星图 · 让你的知识像星空一样可见
          </p>
        </div>
      </div>
    </footer>
  );
}
