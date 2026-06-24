# 饮水的博客

记录技术、产品、组织与自我认知的持续演化。

很多文章从技术开始，最终却在讨论产品、组织与人。

---

## About

这里记录一个技术人在 AI 时代不断变化的认知过程。

有些文章在研究技术。

有些文章在理解产品。

有些文章在观察组织。

还有一些文章在重新理解自己。

我关注的主题包括：

- Agent 与 AI Native Software
- 产品与平台设计
- 技术组织与个人成长
- AI 时代的产业与投资机会

这些文章并不试图提供标准答案。

更多时候，它们只是记录一个问题：

> 当 AI 开始改变软件、组织和工作方式时，我们应该如何重新理解技术、产品和自己。

---

## 如何阅读

这个 Blog 主要由六条主线构成：

### 01. 技术与系统

回答：

> 它是什么？

关注：

- Agent
- MCP / ACP
- A2A
- Browser Use
- AI Coding
- Agent Runtime
- 系统架构设计

这部分更多是技术研究与概念拆解。

---

### 02. 产品与平台

回答：

> 为什么这样设计？

关注：

- AI Native Product
- 数字员工
- Agent OS
- 企业平台能力
- AI 产品形态演化

这部分更多是产品与平台思考。

---

### 03. 组织与成长

回答：

> 为什么事情会这样运转？

关注：

- 技术人成长
- 专家角色
- 团队协作
- 技术影响力
- 组织认知

这部分记录技术人成长过程中遇到的真实问题与认知变化。

推荐阅读：

- [《技术人的成长：如何让自己的价值穿过组织》](doc/组织与成长/技术人的成长：如何让自己的价值穿过组织.md)
- [《专家的工作，不是解决问题，而是定义问题》](doc/组织与成长/专家的工作，不是解决问题，而是定义问题.md)

---

### 04. 产业与投资

回答：

> 技术如何改变商业世界？

关注：

- AI Infra
- GPU
- 光通信
- 存储
- 核能
- AI 产业链
- 投资逻辑

这里的重点不是股价，而是理解技术趋势如何影响产业结构。

---

### 05. 认知演化

回答：

> 我的理解是如何变化的？

记录：

- 长期思考
- 观察与判断
- 职业成长
- AI 时代的个人变化

如果说前面几个分类在研究世界，那么这一部分更多是在研究自己。

---

### 06. Agent 面试知识点

回答：

> 如何快速理解一个 Agent / AI 系统设计知识点？

关注：

- Agent Planning
- Memory & Context
- Tool Use
- Multi-Agent
- MCP / A2A / ACP
- Agent Runtime
- Enterprise Agent
- Browser Use / Computer Use
- AI Native Software

这部分不是长文章，而是面向面试、技术讨论、团队培训和知识库沉淀的短知识点。

推荐阅读：

- [《Agent 面试知识点》](doc/Agent面试知识点/README.md)

---

## 目录结构

文章统一按六条主线归档，目录结构保持为：

```text
doc/
├── 技术与系统
├── 产品与平台
├── 组织与成长
├── 产业与投资
├── 认知演化
└── Agent面试知识点
```

## 推荐文章

### 组织与成长

- [《技术人的成长：如何让自己的价值穿过组织》](doc/组织与成长/技术人的成长：如何让自己的价值穿过组织.md)
- [《专家的工作，不是解决问题，而是定义问题》](doc/组织与成长/专家的工作，不是解决问题，而是定义问题.md)

---

### 产品与平台

- [《面向企业的 AI 数字员工：概念、产品形态与基础设施缺口》](doc/产品与平台/ai-digital-employees-enterprise-agents.md)

---

### 技术与系统

- [《VNC：Agent 云沙箱里的可视化远程控制层》](doc/技术与系统/vnc-remote-control-agent-sandbox.md)

---

### Agent 面试知识点

- [《Agent 面试知识点总览》](doc/Agent面试知识点/README.md)

---


## 基于 CharanMunur/Portfolio 模板改造

这个博客现在直接迁移为 React + Vite + TypeScript 的 portfolio/blog 应用结构，并保留 `doc/` 里的 Markdown 作为内容来源。参考模板仓库：`CharanMunur/Portfolio`。

### 保留的模板结构

- `/`：portfolio 首页，包含 Hero、Skills、Featured Blogs、Topics 和 Quote Section。
- `/blogs`：博客列表页。
- `/blogs/:slug`：博客详情页，使用 `react-markdown` 渲染 Markdown。
- `/contact`：联系页。
- `src/components/`：Navbar、Footer、BlogCard 等复用组件。
- `src/pages/`：路由页面。
- `src/data/`：站点资料与自动生成的博客数据。

### 内容生成

构建前会运行：

```bash
node scripts/generate-blog-data.mjs
```

它会扫描 `doc/**/*.md`，提取标题、摘要、分类、标签和正文，生成 `src/data/generated-blog.ts`，再由 Vite 构建成静态站点。

### 部署到 GitHub Pages

1. 把仓库推送到 GitHub。
2. 进入 **Settings → Pages**。
3. 在 **Build and deployment** 选择 **GitHub Actions**。
4. 推送到 `main` 或 `master` 后，workflow 会执行：
   - `npm install`
   - `npm run build`
   - 上传 `dist/` 到 GitHub Pages

如果仓库名不是 `yourname.github.io`，workflow 会自动设置 `BASE_PATH=/<repo-name>`，让 Vite 在项目站点路径下正确加载资源。

### 本地开发

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
```
