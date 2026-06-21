# Agent 面试知识点

从 Agent 到 AI Native Software 的系统设计知识地图。

这个系列不是长文章，而是面向面试、技术讨论、团队培训和知识库沉淀的短知识点。

每篇尽量回答一个问题：

- 面试官到底在考什么？
- 这个知识点的核心概念是什么？
- 工业界真实系统里怎么做？
- 常见误区是什么？
- 面试时怎么回答更有层次？

---

## 文章模板

```markdown
# Agent 面试知识点 #001：标题

## 问题

## 面试官在考什么？

## 核心知识点

## 工业界方案

## 常见误区

## 面试加分答案

## 延伸阅读
```

---

## 第一章：Agent Fundamentals

- [001 为什么 Agent 需要任务规划（Planning）？](01-Agent-Fundamentals/001-为什么Agent需要任务规划.md)
- [002 子 Agent 如何传递上下文？](01-Agent-Fundamentals/002-子Agent如何传递上下文.md)
- [003 ReAct 为什么成为 Agent 标配？](01-Agent-Fundamentals/003-ReAct为什么成为Agent标配.md)
- [004 CoT、ToT、GoT 有什么区别？](01-Agent-Fundamentals/004-CoT-ToT-GoT有什么区别.md)
- [005 Agent 为什么需要 Reflection？](01-Agent-Fundamentals/005-Agent为什么需要Reflection.md)
- [006 Agent 为什么需要 State？](01-Agent-Fundamentals/006-Agent为什么需要State.md)
- [007 Agent 为什么会陷入死循环？](01-Agent-Fundamentals/007-Agent为什么会陷入死循环.md)
- [008 Agent 如何避免工具幻觉？](01-Agent-Fundamentals/008-Agent如何避免工具幻觉.md)
- 009 Agent 的生命周期是什么？
- 010 ChatBot 和 Agent 的本质区别是什么？

---

## 第二章：Memory & Context

- 011 Agent 为什么需要 Memory？
- 012 RAG 和 Memory 的区别是什么？
- 013 Short-Term Memory 是什么？
- 014 Long-Term Memory 是什么？
- 015 Working Memory 是什么？
- 016 Agent 如何做上下文压缩？
- 017 Context Window 为什么成为瓶颈？
- 018 Agent 如何管理长期知识？
- 019 Agent 如何管理用户偏好？
- 020 Memory 为什么最终会变成数据库问题？

---

## 第三章：Tool Use

- 021 Agent 为什么需要 Tool Calling？
- 022 Function Calling 是怎么工作的？
- 023 Agent 如何选择工具？
- 024 Agent 如何避免错误调用工具？
- 025 Tool Schema 为什么重要？
- 026 Agent 如何调用 API？
- 027 Agent 如何调用本地工具？
- 028 Agent 如何执行 Shell？
- 029 Agent 如何执行代码？
- 030 Tool Use 的边界在哪里？

---

## 第四章：Multi-Agent

- 031 Multi-Agent 和单 Agent 有什么区别？
- 032 什么场景适合 Multi-Agent？
- 033 Agent Team 如何设计？
- 034 Agent 如何拆分角色？
- 035 Agent 间如何通信？
- 036 Agent 间如何共享状态？
- 037 为什么 Multi-Agent 容易失控？
- 038 Multi-Agent 为什么成本更高？
- 039 Multi-Agent 为什么不一定更聪明？
- 040 Multi-Agent 的最佳实践有哪些？

---

## 第五章：Protocol

- 041 MCP 到底解决了什么问题？
- 042 MCP 的核心架构是什么？
- 043 MCP 和 API 有什么区别？
- 044 MCP 和 Function Calling 的区别？
- 045 MCP 和 Plugin 的区别？
- 046 A2A 到底解决了什么问题？
- 047 A2A 和 MCP 的区别？
- 048 ACP 到底是什么？
- 049 ACP 和 MCP 的区别？
- 050 Agent Protocol 的未来是什么？

---

## 第六章：Runtime

- 051 Agent Runtime 是什么？
- 052 Agent Runtime 和 Workflow 的区别？
- 053 Runtime 为什么需要 State？
- 054 Runtime 如何恢复中断任务？
- 055 Runtime 如何管理执行历史？
