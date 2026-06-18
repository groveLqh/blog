---
title: Agent 面试知识点 #005：Agent 为什么需要 Reflection？
date: 2026-06-18
category: Agent面试知识点
tags:
  - AI Agent
  - Reflection
  - Agent Runtime
  - MCP
  - A2A
  - ACP
  - 数字员工
summary: Reflection 不是让 Agent 多想一遍，而是让 Agent 在执行前、执行中、执行后具备自我检查、错误诊断和策略修正能力。
---

# Agent 面试知识点 #005：Agent 为什么需要 Reflection？

## 摘要

Reflection 是 Agent 从“能执行任务”走向“能稳定完成任务”的关键能力。

很多人把 Reflection 理解成一句提示词：

```text
请你反思一下刚才的回答。
```

但在真正的 Agent 系统里，Reflection 不是简单“再想一遍”，而是一套运行时机制：

```text
执行前检查计划
执行中观察异常
执行后复盘结果
把错误经验写入状态或记忆
下一轮用这些经验修正策略
```

如果说 Planning 解决“下一步做什么”，State 解决“当前做到哪一步”，那么 Reflection 解决的是：

> 做错了、做偏了、做慢了、做失败了之后，Agent 如何发现并修正。

---

## 问题

Agent 为什么需要 Reflection？

它和普通的重试、重新生成答案有什么区别？

---

## 面试官在考什么？

这个问题表面上是在问一个 Agent 技巧，本质上是在考你是否理解 Agent 的稳定性问题。

普通 ChatBot 的失败，通常只是“答案不好”。

但 Agent 的失败更复杂：

```text
任务理解错了
工具选错了
参数填错了
中间状态污染了
调用外部系统失败了
多个 Agent 协作时信息传错了
已经失败了却还在重复同一个动作
```

在数字员工场景里，这个问题会更严重。

比如一个法务数字员工要完成合同审查：

```text
读取合同 → 提取条款 → 检索历史案例 → 判断风险等级 → 生成修改建议 → 写回系统
```

如果它把“付款违约条款”误判成“交付条款”，后面所有风险分析都会偏掉。

这时候只靠重试不够，因为重试可能只是把同样的错误再做一次。

Reflection 的核心价值是：

```text
识别错误原因，而不是简单重复执行。
```

---

## 核心知识点

### 1. Reflection 是 Agent 的自我纠错机制

Reflection 的本质是让 Agent 对自己的行为轨迹做评估。

它关心的不是一句回答是否流畅，而是整个执行过程是否可靠。

一个典型 Reflection 会看这些问题：

```text
目标是否理解正确？
计划是否合理？
工具是否选对？
参数是否填对？
观察结果是否支持当前结论？
是否需要回退、重试或换路径？
这次失败对后续有什么经验？
```

所以 Reflection 更接近“运行时诊断”，而不是“语言润色”。

---

### 2. Reflection 可以发生在三个阶段

很多人只知道“执行后反思”，但工业界更常见的是三类 Reflection。

第一类是执行前 Reflection。

也就是在行动前先检查计划。

```text
这个工具是否真的需要调用？
这个参数是否足够？
这个动作有没有权限风险？
这个操作是否可能修改线上数据？
```

例如数字员工准备通过 MCP 调用订单系统接口，在真正执行前，Runtime 可以让 Agent 先反思：

```text
这是查询动作，还是写入动作？
是否需要用户确认？
是否会影响真实业务数据？
```

第二类是执行中 Reflection。

也就是根据 Observation 判断当前路径是否还正确。

例如浏览器 Agent 正在填表，发现页面返回“字段格式错误”，它不应该继续点提交，而应该停下来诊断字段、修正参数。

第三类是执行后 Reflection。

也就是任务完成或失败后复盘。

```text
这次为什么失败？
失败是工具问题、参数问题，还是目标理解问题？
下次遇到类似任务应该避免什么？
哪些经验需要写入 Memory？
```

这类 Reflection 适合沉淀到长期记忆、团队知识库或评审规则里。

---

### 3. Reflection 不是 Retry

Retry 是重新执行。

Reflection 是先诊断，再决定是否重新执行。

二者区别很大：

```text
Retry：刚才失败了，再来一次。
Reflection：刚才为什么失败？应该原路重试、换工具、改参数，还是请求人工介入？
```

比如 Agent 调 MCP 工具失败。

普通 Retry 可能连续调用三次同一个错误参数。

Reflection 会先判断：

```text
是网络问题？
是鉴权失败？
是工具 schema 理解错了？
是缺少必填字段？
是当前用户没有权限？
```

然后再决定下一步。

这就是 Agent 从 Demo 到生产系统必须补上的能力。

---

## 工业界方案

在真实工程里，Reflection 通常不是一个单独 Prompt，而是 Runtime 里的一个闭环。

可以简化成：

```text
Plan → Act → Observe → Reflect → Update State → Replan
```

### 1. Runtime 负责记录可反思的轨迹

如果没有执行轨迹，Agent 就无法反思。

所以 Runtime 至少要记录：

```text
用户目标
任务计划
每一步 Action
工具调用参数
Observation
错误信息
中间结论
最终输出
```

这些信息构成 Agent 的“可审计执行历史”。

没有这些历史，Reflection 就会变成凭空编理由。

---

### 2. MCP 场景：反思工具调用是否正确

MCP 解决的是 Agent 连接外部工具和数据源的问题。

但工具多了之后，Agent 更容易选错工具、填错参数、误读返回结果。

所以 MCP 场景里的 Reflection 重点是：

```text
工具是否该调用？
调用参数是否符合 schema？
返回结果是否被正确解释？
失败后是否应该换工具？
写操作是否需要确认？
```

例如数字员工要查合同审批状态，应该调用“查询审批流”工具，而不是调用“更新审批状态”工具。

Reflection 可以在动作前做一层保护。

---

### 3. A2A 场景：反思协作是否有效

A2A 解决的是 Agent 与 Agent 之间的协作。

多 Agent 协作时，Reflection 不只是单个 Agent 的自检，还包括协作质量检查。

例如：

```text
子 Agent 是否理解了主 Agent 的任务？
返回内容是否覆盖了问题？
是否出现职责重叠？
多个 Agent 的结论是否冲突？
是否需要重新分派任务？
```

比如法务数字员工把任务分给“条款识别 Agent”和“案例检索 Agent”。

如果案例检索 Agent 返回的是旧法规或无关案例，主 Agent 就应该通过 Reflection 发现结果不可靠，而不是直接拼进最终报告。

---

### 4. ACP 场景：反思 Agent 对应用的操作是否可控

ACP 更偏向 Agent 和应用、编辑器、桌面环境之间的交互协议。

在 IDE、桌面端或企业系统里，Agent 不只是回答问题，还会操作界面、改文件、提交表单。

这时候 Reflection 要关注：

```text
是否真的需要修改文件？
修改范围是否超过任务要求？
是否需要生成 diff 给用户确认？
是否有回滚方案？
是否影响当前工作区状态？
```

例如一个 Coding Agent 通过 ACP 在编辑器里改代码，Reflection 应该检查：

```text
有没有改到无关文件？
测试是否通过？
是否引入新的风险？
用户是否还需要 review？
```

这类反思能力，是 Agent 能否进入真实工作流的关键。

---

## 常见误区

### 误区一：Reflection 就是“请再检查一遍”

这只是最浅层的用法。

真正有价值的 Reflection 应该基于执行轨迹、工具返回、错误信息和业务规则，而不是凭感觉自我评价。

---

### 误区二：Reflection 越多越好

不是所有步骤都需要反思。

Reflection 会增加成本和延迟。

工业界通常只在这些节点使用：

```text
高风险写操作前
工具调用失败后
多 Agent 结果冲突时
最终输出前
任务长时间无进展时
```

简单问答不一定需要 Reflection。

---

### 误区三：Reflection 可以替代权限和风控

Reflection 只能降低错误概率，不能替代系统级约束。

如果 Agent 要删除数据、提交审批、发送邮件、修改合同，就必须有权限控制、操作审计和人工确认。

Reflection 是安全带，不是刹车系统本身。

---

### 误区四：把失败经验都写进 Memory

不是所有反思都应该长期保存。

临时错误写入长期记忆，反而可能污染 Agent。

比较合理的做法是：

```text
本轮任务错误 → 写入短期 State
可复用经验 → 写入长期 Memory
团队级规则 → 写入知识库或 Skill
高风险案例 → 写入审计日志
```

---

## 面试加分答案

如果面试官问：

> Agent 为什么需要 Reflection？

可以这样回答：

```text
Agent 需要 Reflection，是因为 Agent 面对的不是一次性问答，而是多步骤、可失败、可恢复的任务执行过程。

在任务执行中，Agent 可能会理解错目标、选错工具、填错参数、误读 Observation，或者在多 Agent 协作中接收质量不高的结果。Reflection 的价值不是简单重试，而是基于执行轨迹诊断失败原因，并决定是重试、回退、换工具、重新规划，还是请求人工介入。

从工程实现上，我会把 Reflection 放到 Agent Runtime 里，形成 Plan、Act、Observe、Reflect、Update State、Replan 的闭环。MCP 场景重点反思工具调用是否正确，A2A 场景重点反思协作结果是否可靠，ACP 场景重点反思对应用和工作区的操作是否可控。

所以 Reflection 不是一句 Prompt，而是 Agent 稳定性、可恢复性和可审计性的关键机制。
```

这个回答的加分点在于：

你把 Reflection 从“提示词技巧”提升到了“Runtime 机制”。

---

## 一句话总结

Reflection 不是让 Agent 多想一遍，而是让 Agent 在失败、偏航和高风险动作前后，具备诊断错误、修正策略、更新状态并继续完成任务的能力。

---

## 延伸阅读

- Reflexion: Language Agents with Verbal Reinforcement Learning
- ReAct: Synergizing Reasoning and Acting in Language Models
- Model Context Protocol Documentation
- Agent2Agent Protocol Specification
- Zed Agent Client Protocol
