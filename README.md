# 饮水的博客

> 把踩过的坑、拆过的代码、正在观察的技术趋势，整理成一份可以反复翻阅的个人知识库。

这里不追求“每日更新”的流水账，更像是一个长期打磨的技术花园：

- **前端与工程实践**：记录 Hybrid App、微信 H5、性能优化、工具函数等真实项目里遇到的问题。
- **JavaScript 与基础能力**：用源码、算法和小实验，把常见概念拆到能自己实现的程度。
- **AI 与产业观察**：关注 AI Agent、数字员工、AI 基建等方向，尽量把热点概念拆成可判断的逻辑。
- **代码与文章互相印证**：文章按分类放在 `doc/` 的子目录中，实践代码放在 `lib/` 和 `basic-algorithm/`，避免只写观点不留证据。

## 怎么阅读

- 想快速看最近写了什么，可以从「最新文章」开始。
- 想按主题找内容，可以跳到「分类浏览」。
- 想回顾完整时间线，可以看「归档」。
- 想看早期 GitHub Issues 里的旧文章，可以看「旧文章索引」。

## 最新文章

| 日期 | 文章 | 分类 | 标签 |
| --- | --- | --- | --- |
| 2026-05-29 | [面向企业的 AI 数字员工：概念、产品形态与基础设施缺口](doc/AI%20观察/ai-digital-employees-enterprise-agents.md) | AI 观察 | AI Agent、数字员工、企业软件 |
| 2026-05-28 | [AI 资本开支、光通信与存储股票逻辑拆解](doc/AI%20观察/ai-capex-stocks-analysis-2026-05-28.md) | AI 观察 | AI 基建、投资逻辑、光通信、存储 |
| 2018-02-09 | [Hybrid App 框架架构思考](doc/前端工程/Hybrid%20App%E6%A1%86%E6%9E%B6%E6%9E%B6%E6%9E%84%E6%80%9D%E8%80%83.md) | 前端工程 | Hybrid App、JsBridge、移动端 |
| 2018-02-09 | [关于 Promise 的一些理解](doc/JavaScript/%E5%85%B3%E4%BA%8EPromise%E7%9A%84%E4%B8%80%E4%BA%9B%E7%90%86%E8%A7%A3.md) | JavaScript | Promise、JavaScript、异步编程 |

## 分类浏览

### AI 观察

- 2026-05-29 · [面向企业的 AI 数字员工：概念、产品形态与基础设施缺口](doc/AI%20观察/ai-digital-employees-enterprise-agents.md)
  从企业级落地角度理解 AI 数字员工，重点讨论岗位化、权限、审计、协作与基础设施缺口。
- 2026-05-28 · [AI 资本开支、光通信与存储股票逻辑拆解](doc/AI%20观察/ai-capex-stocks-analysis-2026-05-28.md)
  对 AI 资本开支带来的产业链观点进行拆解，并强调高风险观点不能直接作为投资依据。

### 前端工程

- 2018-02-09 · [Hybrid App 框架架构思考](doc/前端工程/Hybrid%20App%E6%A1%86%E6%9E%B6%E6%9E%B6%E6%9E%84%E6%80%9D%E8%80%83.md)
  梳理 H5 与 Native 通信场景中的痛点、目标、交互规则和 JsBridge 方案。

### JavaScript

- 2018-02-09 · [关于 Promise 的一些理解](doc/JavaScript/%E5%85%B3%E4%BA%8EPromise%E7%9A%84%E4%B8%80%E4%BA%9B%E7%90%86%E8%A7%A3.md)
  从 Promise/A+ 的核心约束出发，逐步实现一个简化版 Promise。

## 代码笔记

这个仓库里也保存了一些可复用代码和算法练习，后续可以把成熟内容整理成文章：

- `lib/`：前端工具函数、Promise 实现、BetterScroll 等实践代码。
- `basic-algorithm/`：数组、排序和基础算法练习。
- `test/`：与代码片段配套的简单测试或示例。

## 归档

### 2026

- 2026-05-29 · [面向企业的 AI 数字员工：概念、产品形态与基础设施缺口](doc/AI%20观察/ai-digital-employees-enterprise-agents.md) · AI 观察
- 2026-05-28 · [AI 资本开支、光通信与存储股票逻辑拆解](doc/AI%20观察/ai-capex-stocks-analysis-2026-05-28.md) · AI 观察

### 2018

- 2018-02-09 · [Hybrid App 框架架构思考](doc/前端工程/Hybrid%20App%E6%A1%86%E6%9E%B6%E6%9E%B6%E6%9E%84%E6%80%9D%E8%80%83.md) · 前端工程
- 2018-02-09 · [关于 Promise 的一些理解](doc/JavaScript/%E5%85%B3%E4%BA%8EPromise%E7%9A%84%E4%B8%80%E4%BA%9B%E7%90%86%E8%A7%A3.md) · JavaScript

## 旧文章索引

下面保留早期通过 GitHub Issues 记录的文章入口，后续可以逐步迁移到 `doc/` 并补齐元信息。

| 序号 | 标题 | 链接 | 建议分类 |
| --- | --- | --- | --- |
| 13 | 关于 Promise 的一些理解 | [Issue #16](https://github.com/Liqihan/blog/issues/16) | JavaScript |
| 12 | 狠扣代码的细节，性能提升 40 倍：Node 程序性能分析和优化 | [历史文档](https://github.com/Liqihan/blog/blob/master/doc/%E8%B5%84%E8%AE%AF%E5%90%8E%E5%8F%B0%E5%88%86%E4%BA%AB%EF%BC%9ANode%E7%A8%8B%E5%BA%8F%E6%80%A7%E8%83%BD%E5%88%86%E6%9E%90%E5%92%8C%E4%BC%98%E5%8C%96%EF%BC%88%E7%AC%AC%E4%B8%80%E5%BC%B9%EF%BC%89%EF%BC%89%EF%BC%88%E7%BB%84%E5%86%85%E5%88%86%E4%BA%AB%EF%BC%89.md) | Node.js |
| 11 | 淘宝 flexible.js 漏洞修补：记一次 rem 踩坑记录（转载） | [Issue #11](https://github.com/Liqihan/blog/issues/11) | 移动端 |
| 10 | Hybrid APP 架构设计思路（转载） | [Issue #9](https://github.com/Liqihan/blog/issues/9) | 前端工程 |
| 9 | 前端代码异常监控 | [Issue #9](https://github.com/Liqihan/blog/issues/9) | 前端工程 |
| 8 | node 文件更新自动重载 | [Issue #6](https://github.com/Liqihan/blog/issues/6) | Node.js |
| 7 | scrollIntoView 方法 | [Issue #8](https://github.com/Liqihan/blog/issues/8) | Web API |
| 6 | 用户操作的历史记录（前进，后退，清空） | [Issue #7](https://github.com/Liqihan/blog/issues/7) | Web API |
| 5 | 前端持久化 -- evercookie | [Issue #5](https://github.com/Liqihan/blog/issues/5) | 前端工程 |
| 4 | Git 如何提交只改了文件名大小写的变更？ | [Issue #4](https://github.com/Liqihan/blog/issues/4) | 工程效率 |
| 3 | 控制微信中点击返回事件 | [Issue #3](https://github.com/Liqihan/blog/issues/3) | 微信 H5 |
| 2 | 单页应用在微信中设置标题 | [Issue #2](https://github.com/Liqihan/blog/issues/2) | 微信 H5 |
| 1 | 无处不在的 path 模块 | [Issue #1](https://github.com/Liqihan/blog/issues/1) | Node.js |

## 文章维护约定

新增文章时建议在 Markdown 文件顶部补齐如下元信息，方便 README、静态站点或脚本自动生成索引：

```yaml
---
title: 文章标题
date: YYYY-MM-DD
category: 分类
tags:
  - 标签一
  - 标签二
summary: 一句话摘要
---
```

推荐目录组织：

```text
doc/
  AI 观察/
    文章标题.md
  前端工程/
    文章标题.md
  JavaScript/
    文章标题.md
lib/
  可复用代码片段
basic-algorithm/
  算法练习
```

## 关于作者

- 作者：饮水
- Email：grovelqh@gmail.com / liqi_han@163.com
- GitHub：[https://github.com/Liqihan](https://github.com/Liqihan)
- 掘金：[https://juejin.im/user/57c2ed595bbb5000633c4d13](https://juejin.im/user/57c2ed595bbb5000633c4d13)
