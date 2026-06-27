# ✦ 知识星图 — AI 知识图谱可视化工具

> 让你的知识像星空一样可见、可探索、可连接。

知识星图是一款基于 AI 的知识图谱可视化工具。粘贴你的笔记或文章，AI 会自动提取概念和关系，生成可交互的力导向知识图谱，帮助你发现知识间的隐藏关联。

**TRAE AI 创造力大赛 · 学习工作赛道**

---

## 核心功能

### 📥 智能导入
粘贴笔记、文章或 Markdown，DeepSeek AI 自动提取知识概念和关系，零手动整理。

### ✨ 星图可视化
力导向图谱渲染，节点是概念，连线是关系，颜色是领域。支持拖拽、缩放、点击探索。

### 🔗 AI 关联发现
AI 主动分析你的知识图谱，发现你可能没注意到的隐藏关联，打破信息孤岛。

### 📖 知识探索
点击节点展开知识卡片，查看概念详情、来源摘要、关联概念，一键导航。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | Tailwind CSS 4 |
| AI | DeepSeek API |
| 图谱渲染 | Canvas 2D + 自研力导向模拟 |
| 包管理 | pnpm |
| 部署 | Vercel |

### 零额外依赖

项目仅依赖 `next`、`react`、`react-dom` 三个运行时包，力导向模拟、Canvas 渲染、所有 UI 组件均为自研实现。

---

## 快速开始

### 环境要求

- Node.js >= 18.17
- pnpm >= 8

### 安装

```bash
git clone https://github.com/zbw-zbw/knowledge-starmap.git
cd knowledge-starmap
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

> 获取 API Key: https://platform.deepseek.com

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 项目结构

```
knowledge-starmap/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── extract/route.ts    # 知识提取 API
│   │   └── discover/route.ts   # AI 关联发现 API
│   ├── app/page.tsx            # 应用主页面
│   ├── layout.tsx              # 根布局（metadata、SEO）
│   ├── page.tsx                # Landing 首页
│   ├── globals.css             # 全局样式
│   └── icon.svg                # Favicon
├── components/
│   ├── graph/                  # 力导向图谱核心
│   │   ├── ForceGraph.tsx      # 图谱主组件
│   │   ├── graphRenderer.ts    # Canvas 渲染引擎
│   │   ├── useForceSimulation.ts  # 力导向物理模拟
│   │   └── useGraphInteraction.ts # 交互（拖拽/缩放/点击）
│   ├── explore/                # 探索功能
│   │   ├── SearchBar.tsx       # 搜索
│   │   ├── NodeDetail.tsx      # 节点详情面板
│   │   ├── DomainFilter.tsx    # 领域筛选
│   │   └── DiscoveryPanel.tsx  # AI 发现面板
│   ├── import/                 # 导入功能
│   │   ├── ImportPanel.tsx     # 导入面板
│   │   ├── ImportHistory.tsx   # 导入历史
│   │   └── SampleTexts.tsx     # 示例文本
│   ├── landing/                # Landing 页面组件
│   │   ├── Hero.tsx            # 首屏
│   │   ├── DemoPreview.tsx     # 装饰性图谱预览
│   │   ├── PainPoints.tsx     # 痛点
│   │   ├── Features.tsx        # 功能介绍
│   │   └── HowItWorks.tsx      # 使用流程
│   ├── ui/                     # 通用 UI 组件
│   │   ├── Toast.tsx           # 轻提示
│   │   ├── EmptyState.tsx      # 空状态
│   │   ├── Skeleton.tsx        # 骨架屏
│   │   ├── OnboardingTip.tsx   # 引导提示
│   │   ├── Button.tsx          # 按钮
│   │   └── Card.tsx            # 卡片
│   ├── app/                    # 应用布局
│   │   ├── AppLayout.tsx       # 主布局
│   │   └── MobileToolbar.tsx   # 移动端工具栏
│   └── layout/                 # 页面布局
│       ├── Navbar.tsx          # 导航栏
│       └── Starfield.tsx       # 星空背景
├── lib/                        # 核心库
│   ├── types.ts                # 类型定义
│   ├── constants.ts            # 常量
│   ├── sampleData.ts           # 示例图谱数据
│   ├── graphMerge.ts           # 图谱合并逻辑
│   └── sampleTexts.ts          # 示例文本
├── public/                     # 静态资源
│   ├── favicon.jpg             # Favicon 图片
│   └── og-image.png            # Open Graph 预览图
├── next.config.mjs             # Next.js 配置
├── tailwind.config.ts          # Tailwind 配置
├── vercel.json                 # Vercel 部署配置
└── .env.example                # 环境变量模板
```

---

## 功能详解

### 力导向图谱引擎

自研力导向模拟，支持：

- **物理模拟**：节点斥力 + 边吸引力 + 中心引力，实时计算节点位置
- **Canvas 渲染**：DPR 适配 Retina 屏幕，支持 60fps 流畅渲染
- **交互**：拖拽节点、滚轮缩放、平移画布、点击选中
- **视觉效果**：节点呼吸动画、选中节点扩散光环、网格背景、新节点入场闪烁
- **性能优化**：稳定后自动降低帧率、prefers-reduced-motion 支持

### AI 知识提取

通过 DeepSeek API 从文本中提取：

- **概念节点**：识别文本中的关键知识概念
- **关系边**：识别概念间的关联关系
- **分类标注**：自动归类到对应知识领域
- **去重合并**：与已有图谱智能合并，避免重复节点

### AI 关联发现

分析当前图谱中尚未连接的概念对，发现潜在的隐藏关联：

- 基于节点语义和图谱拓扑结构分析
- 每条发现包含关联说明和置信度
- 支持一键添加或忽略

### 响应式适配

| 断点 | 布局 |
|------|------|
| ≥ 1280px (xl) | 三栏：左面板 + 图谱 + 右详情面板 |
| ≥ 768px (md) | 两栏：左面板 + 图谱，详情覆盖 |
| < 768px (sm) | 全屏图谱 + 底部工具栏 + 浮层面板 |

移动端支持：底部工具栏、底部浮层面板、触摸优化、双指缩放。

---

## 部署

### Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量 `DEEPSEEK_API_KEY`
4. 部署

`vercel.json` 已包含所需配置。

### 其他平台

```bash
pnpm build
pnpm start
```

确保设置环境变量 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_BASE_URL`。

---

## 设计理念

知识星图的核心隐喻：**每个知识概念都是宇宙中的一颗星，概念间的关联是星座的连线。**

- **深空美学**：深蓝黑色背景 + 星空粒子效果，营造探索宇宙的氛围
- **色彩编码**：不同知识领域使用不同颜色（前端-蓝、后端-绿、设计-紫、工程-橙）
- **力导向布局**：节点自然分布，相关概念自动聚集，形成有机的知识地图
- **微交互**：节点呼吸动画、选中光环、按钮脉冲发光，让界面充满生命力

---

## 开发说明

### 技术决策

- **零 UI 库依赖**：所有组件自研，使用 Tailwind CSS 实现，保持极简依赖
- **Canvas 而非 SVG**：力导向图使用 Canvas 渲染，性能更优，支持更多节点
- **App Router**：使用 Next.js 14 App Router，利用 Server Components 和 API Routes
- **TypeScript strict**：全项目严格类型检查，确保代码质量

### 性能优化

- Canvas 渲染稳定后降低帧率
- prefers-reduced-motion 媒体查询支持
- Toast 使用 Portal 渲染避免重排
- will-change GPU 加速提示
- 图片 unoptimized 避免额外处理

---

## License

MIT License

---

## 致谢

- [Next.js](https://nextjs.org) — React 全栈框架
- [Tailwind CSS](https://tailwindcss.com) — 原子化 CSS 框架
- [DeepSeek](https://deepseek.com) — AI 大语言模型
- [TRAE](https://trae.ai) — AI IDE 开发环境

---

<p align="center">
  <strong>✦ 知识星图</strong><br>
  让你的知识像星空一样可见 · 可探索 · 可连接<br><br>
  TRAE AI 创造力大赛 · 学习工作赛道 · 2026
</p>
