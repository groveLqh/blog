---
title: Agent 面试知识点 #003：ReAct 为什么成为 Agent 标配？
date: 2026-06-13
category: Agent面试知识点
tags:
  - AI Agent
  - ReAct
  - Tool Use
  - Agent Runtime
summary: ReAct 通过 Thought → Action → Observation 的循环，让 Agent 能在开放环境中边观察、边决策、边执行。
---

# Agent 面试知识点 #003：ReAct 为什么成为 Agent 标配？

## 问题

什么是 ReAct？

为什么几乎所有 Agent Framework 都在使用 ReAct？

例如：

- OpenAI Agents
- LangGraph
- CrewAI
- AutoGen
- Deep Agents
- Manus 类产品

这些系统形态不完全一样，但背后基本都能看到 ReAct 的影子。

---

## 面试官在考什么？

这个问题表面是在问：

> 你知不知道 ReAct 是什么？

但真正考的是：

> 你是否理解 Agent 如何在不确定环境里做动态决策？

传统 ChatBot 的核心是回答。

用户问什么，模型生成答案。

但 Agent 不只是回答问题。

Agent 要完成任务。

完成任务就意味着它必须不断决定：

- 下一步要不要调用工具；
- 应该调用哪个工具；
- 工具返回结果后是否可信；
- 任务是否已经完成；
- 如果失败，是否要重试或换路径。

所以 ReAct 考的不是一个 Prompt 技巧，而是 Agent 的基础执行循环。

---

## 核心知识点一：ReAct 是什么？

ReAct 来自两个词：

```text
Reasoning + Acting
```

也就是：

```text
推理 + 行动
```

它的基本循环是：

```text
Thought
↓
Action
↓
Observation
↓
Thought
↓
Action
↓
Observation
...
```

其中：

### Thought

Agent 先判断当前状态。

例如：

```text
我现在不知道 OpenAI 最新融资信息，需要搜索网络。
```

### Action

Agent 选择一个动作。

例如：

```text
web_search("OpenAI latest funding")
```

### Observation

工具返回结果后，Agent 观察环境反馈。

例如：

```text
搜索结果显示有多篇相关新闻，需要打开权威来源确认。
```

然后进入下一轮 Thought。

这就是 ReAct 的核心。

它让 Agent 不再是“一次性生成答案”，而是“根据环境反馈持续调整动作”。

---

## 核心知识点二：为什么 Agent 需要 ReAct？

因为 Agent 面对的是开放环境。

开放环境有几个特点。

### 1. 信息不完整

用户说：

```text
帮我查一下某公司的最新融资情况。
```

模型训练数据可能已经过时。

Agent 必须搜索。

搜索之后还要判断来源是否可靠。

这就需要：

```text
观察 → 判断 → 行动 → 再观察
```

### 2. 工具可能失败

例如 Browser Use 场景里，Agent 要打开网页。

可能遇到：

- 页面加载失败；
- 登录态失效；
- 弹窗遮挡；
- 按钮不可点击；
- 页面结构变化。

如果没有 ReAct，Agent 只能按固定步骤执行。

一旦出错就中断。

有了 ReAct，Agent 可以根据 Observation 调整下一步：

```text
页面打不开
↓
尝试刷新
↓
仍失败
↓
检查网络或登录状态
↓
重新规划
```

### 3. 任务路径不固定

例如数字员工执行“提交报销”。

它可能需要：

- 登录系统；
- 找到报销入口；
- 填写表单；
- 上传发票；
- 处理校验错误；
- 等待用户确认；
- 最后提交。

但真实页面和流程可能每次都不一样。

所以 Agent 不能只靠固定 Workflow。

它必须边做边看。

这就是 ReAct 的价值。

---

## 核心知识点三：ReAct 和 Workflow 的区别

很多人会把 ReAct 和 Workflow 混在一起。

它们其实解决的是不同问题。

### Workflow：固定流程

Workflow 更像：

```text
Step 1
↓
Step 2
↓
Step 3
```

适合稳定、确定、可枚举的流程。

例如：

```text
上传文件
↓
选择模板
↓
点击生成
```

只要流程不变，Workflow 很可靠。

### ReAct：动态决策

ReAct 更像：

```text
观察当前情况
↓
判断下一步
↓
执行动作
↓
再观察
```

适合不确定、开放、容易变化的环境。

例如：

```text
网页按钮位置变了
登录状态失效了
表单校验失败了
搜索结果不可靠
用户临时改需求了
```

这些都需要 Agent 动态决策。

### 二者不是对立关系

真实系统里，Workflow 和 ReAct 经常结合。

可以这样理解：

```text
Workflow 负责主流程
ReAct 负责每一步的动态执行
```

例如：

```text
提交报销 Workflow：
1. 登录系统
2. 填写表单
3. 上传发票
4. 提交审批

每一步内部用 ReAct：
观察页面 → 判断控件 → 点击 → 观察结果 → 继续
```

所以面试时不要说 ReAct 取代 Workflow。

更好的说法是：

> Workflow 提供可控流程，ReAct 提供动态执行能力。

---

## 核心知识点四：ReAct 和 Planning 的区别

Planning 解决的是：

> 整体上应该怎么做？

ReAct 解决的是：

> 当前这一步应该怎么做？

例如用户目标是：

```text
生成竞品分析 PPT
```

Planning 会拆成：

```text
1. 搜索资料
2. 分析竞品
3. 生成大纲
4. 生成 PPT
```

ReAct 发生在每一步执行过程中。

例如“搜索资料”这一步：

```text
Thought：我需要搜索小米汽车竞争格局
Action：调用 web_search
Observation：搜索结果过多
Thought：需要筛选权威来源
Action：打开官方或财经媒体来源
Observation：获得有效信息
```

所以：

```text
Planning 是宏观任务拆解
ReAct 是微观执行循环
```

复杂 Agent 往往两者都需要。

---

## 工业界方案：ReAct Loop

在工程上，ReAct 通常会被实现成一个循环。

伪代码类似：

```text
while not done:
    state = read_current_state()
    thought = model.reason(state)
    action = model.select_tool(thought, available_tools)
    observation = execute(action)
    state = update_state(observation)
```

这个循环里至少包含五个关键模块。

### 1. State

保存当前任务状态。

例如：

```text
当前目标是什么
已经执行到哪一步
已有工具结果是什么
是否需要用户确认
```

### 2. Tool Router

决定调用哪个工具。

例如：

```text
web_search
browser_click
file_write
email_send
ppt_generate
```

### 3. Tool Executor

真正执行工具调用。

它要处理：

- 参数校验；
- 权限控制；
- 超时；
- 错误；
- 重试。

### 4. Observation Parser

把工具结果变成 Agent 能理解的信息。

例如浏览器截图、网页 DOM、API 返回值、命令行输出，都需要转成可用 Observation。

### 5. Stop Condition

判断什么时候结束。

否则 Agent 可能陷入无限循环。

常见停止条件包括：

- 已完成用户目标；
- 达到最大步数；
- 连续失败次数过多；
- 需要用户确认；
- 触发安全边界。

---

## 常见误区

### 误区一：以为 ReAct 只是一段 Prompt

ReAct 可以用 Prompt 实现，但它本质不是 Prompt。

它是一种执行范式。

Prompt 只是让模型输出 Thought / Action 的一种方式。

工程系统里还需要工具执行、状态管理、错误处理和停止条件。

### 误区二：以为 ReAct 可以解决所有问题

ReAct 解决的是动态执行。

但它不能单独解决：

- 长期记忆；
- 复杂规划；
- 多 Agent 协作；
- 权限控制；
- 成本控制；
- 任务恢复。

所以成熟 Agent 还需要：

```text
Planning
Memory
State Management
Reflection
Human-in-the-loop
```

### 误区三：没有停止条件

很多 Demo 型 Agent 会一直循环。

例如：

```text
搜索 → 总结 → 觉得不够 → 再搜索 → 再总结 → 再搜索
```

这就是没有明确 Stop Condition。

工业界必须限制：

```text
最大步数
最大成本
最大时间
失败次数
用户确认点
```

### 误区四：把 Thought 全部暴露给用户

在产品里，用户不一定需要看到完整 Thought。

更合理的是展示：

```text
当前正在做什么
调用了什么工具
得到了什么结果
下一步是什么
```

这叫可观测性，而不是把模型推理过程原样展示。

---

## 面试加分答案

可以这样回答：

> ReAct 是 Reasoning + Acting 的组合，通过 Thought → Action → Observation 的循环，让 Agent 在执行过程中持续根据环境反馈调整决策。它解决的是开放环境下的动态执行问题。相比固定 Workflow，ReAct 更适合网页操作、工具调用、搜索分析、数字员工这类不确定任务。但工程上不能只靠 Prompt，还需要 State、Tool Router、Tool Executor、Observation Parser 和 Stop Condition。复杂系统里通常是 Planning 负责宏观拆解，ReAct 负责每一步的动态执行。

更简洁一点：

> ReAct 让 Agent 从一次性回答，变成了边观察、边判断、边行动的执行循环。

---

## 一句话总结

ReAct 是现代 Agent Runtime 最基础的执行循环。

它的核心价值，是让 Agent 能在开放环境中根据 Observation 动态选择下一步 Action。
