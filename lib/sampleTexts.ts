/**
 * 示例文本数据：让用户快速体验知识导入功能。
 * 每段文本涵盖不同领域，导入后会在图谱中形成新的星座。
 */
export const sampleTexts = [
  {
    id: "react-patterns",
    title: "🔵 React 设计模式",
    text: `React组件设计中，组合模式（Composition）比继承更灵活。通过children prop和render props，我们可以创建高度可复用的组件。

自定义Hooks是React最强大的代码复用机制。它将状态逻辑从组件中抽离，遵循了单一职责原则。useState和useEffect是最基础的Hooks，而useReducer则适用于复杂状态管理场景。

React的虚拟DOM和Diff算法是性能优化的基础。配合React.memo、useMemo和useCallback，可以避免不必要的重渲染。Suspense和lazy则实现了组件级的代码分割。`,
  },
  {
    id: "system-design",
    title: "🟢 系统设计基础",
    text: `微服务架构将单体应用拆分为独立部署的服务。每个服务有自己的数据库，通过API网关统一对外。服务间通信可以用REST或gRPC，异步场景用消息队列（如Kafka）。

负载均衡是高可用的基础，Nginx可以做反向代理和负载均衡。缓存策略（Redis）可以显著降低数据库压力。CDN则将静态资源分发到离用户最近的节点。

数据库设计中，SQL（如PostgreSQL）适合事务性强的场景，NoSQL（如MongoDB）适合灵活的文档存储。索引设计直接影响查询性能。`,
  },
  {
    id: "ai-ml-basics",
    title: "🟣 AI与机器学习入门",
    text: `机器学习是人工智能的子领域，通过数据训练模型来做预测。监督学习（如分类、回归）需要标注数据，无监督学习（如聚类）则自动发现数据结构。

深度学习基于神经网络，Transformer架构是当前NLP的主流。大语言模型（LLM）如GPT和DeepSeek通过海量文本预训练获得语言理解能力，再通过微调适配具体任务。

Prompt Engineering是使用LLM的关键技能。好的提示词需要明确任务、提供上下文、指定输出格式。RAG（检索增强生成）结合了信息检索和文本生成，提升了LLM的准确性。`,
  },
];
