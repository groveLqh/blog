---
title: Agent 面试知识点 #002：子 Agent 如何传递上下文？
date: 2026-06-12
category: Agent面试知识点
tags:
  - AI Agent
  - Multi-Agent
  - Context
  - State Management
summary: 子 Agent 间上下文传递的关键不是传完整历史，而是传结构化状态、关键产出和可恢复的任务上下文。
---

# Agent 面试知识点 #002：子 Agent 如何传递上下文？

## 问题

子 Agent 之间的上下文怎么传递？

或者换一种问法：

> 在 Multi-Agent 系统里，Agent A 的执行结果如何交给 Agent B？

例如一个任务：

> 帮我调研小米汽车竞争格局，生成 PPT，并写一封邮件发给老板。

系统里可能有多个 Agent：

```text
Research Agent：负责资料搜索
Analysis Agent：负责分析总结
PPT Agent：负责生成 PPT
Email Agent：负责写邮件
Supervisor Agent：负责整体调度
```

问题来了：

Research Agent 搜到的内容，应该怎么交给 Analysis Agent？

Analysis Agent 的结论，应该怎么交给 PPT Agent？

PPT Agent 生成的文件，应该怎么交给 Email Agent？

这就是子 Agent 上下文传递问题。

---

## 面试官在考什么？

这个问题表面上是在问“上下文怎么传”。

实际上是在考 Multi-Agent 架构设计。

面试官想知道的是：

> 你是否理解 Agent 间通信、状态管理、上下文压缩和任务恢复？

很多人会直接回答：

> 把上一个 Agent 的输出放到下一个 Agent 的 Prompt 里。

这只能处理 Demo。

真实系统里这样做很快会崩。

因为 Agent 数量一多、任务一长、工具调用一复杂，就会遇到：

- 上下文爆炸；
- 成本升高；
- 信息丢失；
- 状态不可恢复；
- Agent 之间互相污染；
- 任务失败后无法继续。

所以这个问题的本质是：

> Multi-Agent 系统如何管理共享状态，而不是如何拼 Prompt。

---

## 核心知识点一：为什么不能直接传完整历史？

最简单的做法是：

```text
Agent A 完整对话历史
↓
Agent B
```

例如 Research Agent 搜到了 2 万字资料，直接全部传给 Analysis Agent。

这样看起来简单，但有几个问题。

### 1. Token 成本暴涨

如果每个 Agent 都传完整上下文：

```text
Agent A：5k tokens
Agent B：10k tokens
Agent C：20k tokens
Agent D：40k tokens
```

任务越长，成本越高。

### 2. 噪音越来越多

完整历史里有很多内容对下游 Agent 没用。

例如：

- 工具调用日志；
- 失败重试记录；
- 中间推理过程；
- 已经过时的信息；
- 与当前子任务无关的上下文。

下游 Agent 看到太多噪音，反而更容易判断错误。

### 3. 责任边界混乱

每个 Agent 应该只关注自己的任务。

PPT Agent 不需要知道所有搜索过程。

Email Agent 不需要知道所有中间分析细节。

它只需要最终文件、邮件目标和关键摘要。

### 4. 不利于任务恢复

如果上下文只存在 Prompt 里，一旦任务中断，状态就丢了。

真实系统必须支持：

```text
任务中断
↓
恢复状态
↓
继续执行
```

这就要求上下文不能只放在模型上下文窗口里。

---

## 核心知识点二：上下文传递到底传什么？

子 Agent 间不应该传完整历史，而应该传结构化上下文。

一般包括五类信息。

### 1. Task Context：当前任务

告诉子 Agent 它要完成什么。

```json
{
  "task_id": "task_001",
  "objective": "生成小米汽车竞品分析 PPT",
  "current_step": "生成 PPT 大纲"
}
```

### 2. Input Context：必要输入

只传完成当前任务所需的信息。

```json
{
  "inputs": {
    "analysis_summary": "小米 SU7 的核心优势是品牌流量、智能座舱和性价比，主要竞争对手包括特斯拉 Model 3、极氪 007、问界 M5。",
    "target_audience": "老板",
    "output_format": "10 页 PPT"
  }
}
```

### 3. State Context：执行状态

告诉子 Agent 当前任务处于什么状态。

```json
{
  "status": "ready",
  "previous_steps": [
    {
      "step": "research",
      "status": "finished",
      "artifact_id": "research_report_001"
    },
    {
      "step": "analysis",
      "status": "finished",
      "artifact_id": "analysis_summary_001"
    }
  ]
}
```

### 4. Artifact Context：产物引用

对于大文件、长报告、PPT、图片，不要直接塞进上下文。

应该传引用。

```json
{
  "artifacts": [
    {
      "type": "markdown",
      "name": "竞品分析报告",
      "uri": "artifact://analysis_report_001"
    },
    {
      "type": "pptx",
      "name": "竞品分析PPT",
      "uri": "artifact://ppt_001"
    }
  ]
}
```

### 5. Constraint Context：约束

告诉子 Agent 什么能做，什么不能做。

```json
{
  "constraints": {
    "language": "zh-CN",
    "style": "适合老板快速阅读",
    "must_confirm_before_send_email": true
  }
}
```

---

## 核心知识点三：Context Compression

Context Compression 是上下文压缩。

它的目标是：

> 保留对下游任务有用的信息，删除无关信息。

例如 Research Agent 原始输出可能是：

```text
20 篇网页资料
10 次搜索日志
3 次失败访问
若干中间摘要
```

但给 Analysis Agent 的上下文应该是：

```json
{
  "companies": ["小米汽车", "特斯拉", "极氪", "问界"],
  "dimensions": ["产品", "价格", "渠道", "品牌", "智能化"],
  "key_findings": [
    "小米汽车依靠品牌流量和生态优势快速破圈",
    "特斯拉在品牌、成本和补能体系上仍有优势",
    "国内新势力在智能座舱和渠道上竞争激烈"
  ],
  "open_questions": [
    "小米汽车长期交付能力仍需观察",
    "价格战可能影响利润率"
  ]
}
```

这就是从 Raw Context 到 Task Context 的压缩。

好的上下文压缩不是简单总结。

而是面向下游任务重写信息。

Research Agent 给 Analysis Agent 的上下文，和给 PPT Agent 的上下文，应该不一样。

前者需要证据和对比维度。

后者需要结构、标题和关键结论。

---

## 核心知识点四：State Store

真实 Multi-Agent 系统里，上下文不应该只存在模型 Prompt 里。

应该有统一的 State Store。

可以是：

```text
Redis
Postgres
MongoDB
文件系统
对象存储
向量数据库
```

它的作用是保存：

- 任务状态；
- Agent 输出；
- 工具调用结果；
- 中间产物；
- 执行日志；
- 用户确认状态。

典型结构是：

```text
Supervisor Agent
↓
State Store
↑
Worker Agents
```

Agent 之间不直接传一大段 Prompt。

而是通过 State Store 读写状态。

例如：

```json
{
  "task_id": "task_001",
  "status": "running",
  "steps": [
    {
      "id": "research",
      "agent": "ResearchAgent",
      "status": "finished",
      "output_ref": "artifact://research_001"
    },
    {
      "id": "analysis",
      "agent": "AnalysisAgent",
      "status": "running",
      "input_refs": ["artifact://research_001"]
    }
  ]
}
```

这样做的好处是：

1. Agent 可以无状态运行；
2. 任务中断后可以恢复；
3. 上下文可以被审计；
4. 多个 Agent 可以共享同一份事实状态；
5. 系统可以做权限控制和版本管理。

---

## 核心知识点五：Event Bus

当 Multi-Agent 系统变复杂后，Agent 之间最好不要互相直接调用。

更好的方式是事件驱动。

例如：

```text
Research Agent
↓ publish event
research.finished
↓
Event Bus
↓ subscribe event
Analysis Agent
```

事件可以长这样：

```json
{
  "event_type": "research.finished",
  "task_id": "task_001",
  "producer": "ResearchAgent",
  "payload": {
    "artifact_ref": "artifact://research_001",
    "summary": "已完成小米汽车和主要竞品资料收集"
  }
}
```

Analysis Agent 监听到事件后，再从 State Store 读取详细内容。

这种方式的优势是：

- Agent 解耦；
- 易扩展；
- 易审计；
- 易恢复；
- 可以支持异步长期任务。

它和微服务架构很像。

Agent 不再是几个 Prompt 拼在一起，而是一组可以协作的任务执行单元。

---

## 工业界常见架构

一个相对完整的 Multi-Agent 上下文架构通常是：

```text
User Goal
↓
Supervisor Agent
↓
Task Plan
↓
State Store ←→ Worker Agents
↓
Artifacts / Logs / Events
↓
Final Response
```

其中：

### Supervisor Agent

负责：

- 理解用户目标；
- 拆解任务；
- 分配子 Agent；
- 控制流程；
- 汇总结果。

### Worker Agent

负责具体任务：

- 搜索；
- 分析；
- 写作；
- 生成 PPT；
- 发邮件；
- 操作浏览器。

### State Store

负责保存状态：

- 当前执行到哪一步；
- 每一步输入输出是什么；
- 哪些任务成功；
- 哪些任务失败；
- 哪些任务等待用户确认。

### Artifact Store

负责保存大产物：

- 文档；
- 表格；
- PPT；
- 图片；
- 网页快照；
- 代码文件。

### Event Bus

负责 Agent 之间异步协作：

- research.finished；
- analysis.failed；
- ppt.generated；
- user.confirmed；
- email.sent。

---

## 常见误区

### 误区一：把上下文等同于聊天记录

聊天记录只是上下文的一部分。

Agent 真正需要的是任务状态。

包括：

```text
目标
计划
输入
输出
约束
产物
执行状态
用户确认
```

### 误区二：所有 Agent 共享同一份上下文

这很危险。

不同 Agent 应该看到不同上下文。

Research Agent 不需要看到邮件发送权限。

Email Agent 不需要看到全部搜索日志。

权限和上下文都应该按角色裁剪。

### 误区三：只传自然语言，不传结构化数据

自然语言适合模型理解。

结构化数据适合系统执行。

真实系统通常两者都需要。

例如：

```json
{
  "summary": "自然语言摘要",
  "status": "finished",
  "artifact_ref": "artifact://xxx",
  "next_step": "generate_ppt"
}
```

### 误区四：没有版本管理

Agent 的输出可能被修改。

用户也可能要求回滚。

所以重要产物应该有版本。

例如：

```text
analysis_summary_v1
analysis_summary_v2
ppt_v1
ppt_v2
```

否则后续很难追踪。

### 误区五：没有处理敏感信息

企业 Agent 里，上下文可能包含：

- 客户信息；
- 合同信息；
- 财务数据；
- 员工信息；
- 业务机密。

不能随便传给所有子 Agent。

上下文传递必须结合权限控制和审计。

---

## 面试加分答案

可以这样回答：

> 子 Agent 之间不应该直接传完整对话历史，而应该通过统一的 Context Schema 和 State Store 传递结构化状态。每个子 Agent 只接收完成当前任务所需的目标、输入、约束、关键产出和 artifact 引用。大文本、大文件和中间产物存到外部存储，通过引用传递。Supervisor Agent 负责上下文裁剪和路由。复杂系统里可以进一步引入 Event Bus，让 Agent 通过事件解耦协作，并通过 State Store 支持任务恢复、审计和权限控制。

更简洁一点：

> Multi-Agent 的上下文传递，本质不是 Prompt 拼接，而是状态管理、上下文压缩和任务协作协议设计。

---

## 一句话总结

子 Agent 之间传递的不是完整历史，而是面向任务裁剪后的结构化上下文。

真正可靠的 Multi-Agent 系统，核心是 Context Schema + State Store + Artifact Store + Event Bus。
