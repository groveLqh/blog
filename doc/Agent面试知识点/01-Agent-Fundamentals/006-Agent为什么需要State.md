---
title: Agent 面试知识点 #006：Agent 为什么需要 State？
date: 2026-06-19
category: Agent面试知识点
tags:
  - AI Agent
  - State
  - Agent Runtime
  - MCP
  - A2A
  - ACP
  - 数字员工
summary: State 不是 Memory 的同义词，而是 Agent Runtime 在任务执行过程中用来记录当前进度、环境观察、工具结果和下一步决策的运行时状态。
---

# Agent 面试知识点 #006：Agent 为什么需要 State？

## 摘要

State 是 Agent 从“一次性回答”走向“持续执行任务”的基础能力。

很多人会把 State 和 Memory 混在一起，但它们不是一回事。

简单说：

```text
Memory 更像长期经验和知识。
State 更像当前任务的运行现场。
```

一个 Agent 如果没有 State，就不知道自己已经做了什么、当前卡在哪一步、哪些工具调用成功了、哪些结果还没有验证、下一步应该继续执行还是回退重试。

在数字员工、MCP 工具调用、A2A 多 Agent 协作、ACP 桌面/IDE 操作这些真实场景里，State 不是可选项，而是 Agent Runtime 的核心数据结构。

---

## 问题

Agent 为什么需要 State？

State 和 Memory、Context 有什么区别？

---

## 面试官在考什么？

这个问题表面是在问一个概念，实际上是在考你是否理解 Agent 和 ChatBot 的根本区别。

ChatBot 通常是：

```text
用户问一句
模型答一句
```

但 Agent 面对的是任务执行：

```text
理解目标 → 制定计划 → 调用工具 → 观察结果 → 更新状态 → 决定下一步 → 直到完成
```

这里最关键的变化是：

> Agent 不是只生成答案，而是在一个持续变化的执行过程中做决策。

既然是过程，就一定需要 State。

否则 Agent 每一步都像“失忆重启”：

```text
不知道任务目标是什么
不知道已经执行到哪一步
不知道上一步工具返回了什么
不知道哪些分支失败过
不知道是否需要人工确认
不知道下一步该继续、重试还是终止
```

所以面试官真正想听到的不是“State 用来保存上下文”，而是：

> State 是 Agent Runtime 管理任务进度、执行历史、工具结果、错误恢复和多 Agent 协作的核心机制。

---

## 核心知识点

### 1. State 是当前任务的运行时现场

State 记录的是“当前任务正在发生什么”。

它通常包括：

```text
任务目标
当前步骤
计划列表
已完成动作
工具调用参数
工具返回结果
中间结论
错误信息
权限状态
用户确认状态
下一步候选动作
```

举个例子，一个法务数字员工要审查合同。

它的 State 里可能会有：

```text
当前任务：审查采购合同风险
当前阶段：付款条款检查
已读取文件：contract_v3.pdf
已识别条款：付款周期、违约责任、验收条件
已调用工具：合同解析 MCP、历史案例检索 MCP
当前风险：付款节点不清晰
下一步：生成修改建议，等待用户确认
```

这不是长期记忆，而是这一次任务的执行现场。

任务结束后，一部分 State 可以进入 Memory，但不是全部都要保存。

---

### 2. State 解决的是连续决策问题

Agent 的每一步动作都依赖前一步结果。

比如：

```text
如果文件读取成功 → 继续分析
如果文件读取失败 → 换工具或要求用户重新上传
如果工具返回为空 → 检查参数
如果发现高风险写操作 → 请求用户确认
```

这些判断都依赖 State。

没有 State，Agent 就只能靠当前 prompt 猜测发生了什么。

这也是很多 Agent Demo 不稳定的原因：

```text
看起来会调用工具
但不知道自己为什么调用
看起来会执行多步
但中途失败后无法恢复
看起来会协作
但多个 Agent 的结果无法对齐
```

State 让 Agent 从“会动”变成“能连续执行”。

---

### 3. State、Context、Memory 的区别

这三个词经常混用，但面试时最好讲清楚。

```text
Context：当前模型这次推理能看到的信息。
State：Runtime 维护的任务执行状态。
Memory：跨任务沉淀下来的长期知识、偏好和经验。
```

可以这样理解：

```text
Context 是模型的输入窗口。
State 是任务的运行账本。
Memory 是长期经验库。
```

比如一个数字员工正在帮用户写周报。

Context 里可能有：当前用户问题、最近几条对话、被引用的文件片段。

State 里可能有：周报已经生成了哪些模块、哪些数据已经拉取、哪些内容还没确认。

Memory 里可能有：用户喜欢的汇报风格、团队长期关注的指标、历史周报模板。

工业系统里，三者通常会被 Runtime 分层管理，而不是全部塞进 prompt。

---

## 工业界方案

### 1. Runtime 用 State Machine 或 State Graph 管理任务

在真实工程里，State 通常不会只是一个字符串，而是一组结构化字段。

更复杂的 Agent Runtime 会把它设计成：

```text
状态机 State Machine
任务图 Task Graph
执行图 Execution Graph
状态图 State Graph
```

例如：

```text
created → planning → executing → waiting_user_confirm → verifying → completed
                                      ↓
                                    failed → replanning
```

这样 Runtime 才能知道任务处于哪个阶段，哪些动作允许执行，哪些动作必须暂停。

这对数字员工尤其重要。

数字员工不是聊天机器人，它会连接企业系统、浏览器、桌面应用、审批流、邮件、IM。如果没有明确 State，执行过程就不可控，也不可审计。

---

### 2. MCP 场景：State 记录工具调用和外部系统结果

MCP 让 Agent 可以连接外部工具、数据源和工作流。

但只要开始调工具，就一定需要 State。

例如 Agent 调用订单系统 MCP：

```text
工具名称：query_order_status
参数：order_id=12345
返回：待发货
下一步：询问是否需要催发货
```

这些信息不能只存在模型的临时输出里，必须被 Runtime 记录下来。

否则后续 Agent 很可能重复调用、漏掉结果，甚至把查询动作误当成写入动作。

对于写操作，State 还要记录：

```text
是否涉及数据变更
是否已获得用户确认
是否有回滚方案
是否写入审计日志
```

这就是 Agent 工程和普通 API 调用最大的区别：Agent 需要在不确定推理中管理确定的执行状态。

---

### 3. A2A 场景：State 记录多 Agent 协作进度

A2A 解决的是 Agent 和 Agent 之间如何通信、发现能力、协作完成任务。

多 Agent 一旦出现，State 就更重要。

主 Agent 需要知道：

```text
任务分给了哪个子 Agent
子 Agent 当前状态是什么
哪个子任务已经完成
哪个结果可信度不足
哪些结论互相冲突
是否需要重新分派任务
```

比如法务数字员工把合同审查拆成三个子任务：

```text
条款识别 Agent
案例检索 Agent
风险评级 Agent
```

如果案例检索 Agent 还没返回，风险评级 Agent 就不能直接生成最终结论。

如果两个 Agent 的结论冲突，主 Agent 需要在 State 里标记冲突，并触发 Reflection 或人工确认。

没有 State，多 Agent 就会变成多个模型各说各话。

---

### 4. ACP 场景：State 记录 Agent 对应用环境的操作

ACP 更偏向 Agent 和 IDE、桌面端、应用环境之间的交互。

这类场景里，Agent 不只是调用接口，而是会操作真实工作区。

比如 Coding Agent 在编辑器里修改代码，State 里至少要记录：

```text
当前工作区
被修改文件
生成的 diff
测试执行结果
用户是否接受修改
是否需要回滚
```

再比如桌面数字员工在浏览器里填表单，State 要记录：

```text
当前页面
已填写字段
待填写字段
页面报错信息
是否已经点击提交
是否需要用户确认
```

这类状态如果不记录，就很难实现“暂停后恢复”“失败后回退”“用户接管后继续”。

---

## 常见误区

### 误区一：把 State 等同于 Memory

Memory 更偏长期，State 更偏当前任务。

把所有 State 都写进 Memory，会污染长期记忆。

比较合理的做法是：

```text
当前任务进度 → State
可复用经验 → Memory
外部资料片段 → Context / RAG
审计证据 → Log
```

---

### 误区二：把 State 全塞进 Prompt

Prompt 不是状态管理系统。

短任务可以把少量 State 放进上下文，但复杂任务必须由 Runtime 结构化管理。

否则会遇到：

```text
上下文过长
关键状态丢失
无法恢复中断任务
无法审计工具调用
无法判断哪些状态已经过期
```

---

### 误区三：只记录成功结果，不记录失败过程

失败状态同样重要。

Agent 要避免重复犯错，就必须知道：

```text
哪个工具失败过
失败原因是什么
是否已经重试过
是否应该换路径
是否需要人工介入
```

这也是 Reflection 能工作的前提。

没有 State，Reflection 就只能凭空反思。

---

### 误区四：没有状态生命周期

State 不是越多越好。

工业系统要设计状态生命周期：

```text
哪些状态只在本轮有效？
哪些状态任务结束后删除？
哪些状态可以进入长期 Memory？
哪些状态必须写入审计日志？
哪些状态涉及隐私和权限？
```

没有生命周期，State 会变成新的垃圾场。

---

## 面试加分答案

如果面试官问：

> Agent 为什么需要 State？

可以这样回答：

```text
Agent 需要 State，是因为 Agent 面对的是持续的任务执行过程，而不是一次性问答。State 记录当前任务目标、执行步骤、工具调用结果、中间结论、错误信息、用户确认状态和下一步动作，让 Agent 能够基于历史执行轨迹做连续决策。

我会区分 Context、State 和 Memory：Context 是模型当前能看到的输入窗口，State 是 Runtime 管理的任务运行现场，Memory 是跨任务沉淀的长期经验。

在工业界，State 通常由 Agent Runtime 结构化管理，可能表现为状态机、任务图或状态图。MCP 场景下，State 记录工具调用和外部系统结果；A2A 场景下，State 记录多 Agent 协作进度和冲突；ACP 场景下，State 记录 Agent 对 IDE、桌面或应用工作区的操作状态。

所以 State 的价值不是“保存聊天记录”，而是让 Agent 能恢复、回退、审计、协作和持续完成任务。
```

这个回答的加分点在于：

你把 State 从“上下文保存”提升到了“Runtime 状态管理”。

---

## 一句话总结

State 是 Agent Runtime 的任务运行现场，它让 Agent 知道自己做到哪一步、依赖什么结果、遇到什么错误、下一步该继续、回退还是请求人工介入。

---

## 延伸阅读

- Model Context Protocol Documentation
- Agent2Agent Protocol Specification
- Zed Agent Client Protocol
- LangGraph StateGraph / Agent Runtime 相关设计
