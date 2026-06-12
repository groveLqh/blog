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
- 003 ReAct 为什么成为 Agent 标配？
- 004 CoT、ToT、GoT 有什么区别？
- 005 Agent 为什么需要 Reflection？
- 006 Agent 为什么需要 State？
- 007 Agent 为什么会陷入死循环？
- 008 Agent 如何避免工具幻觉？
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
- 056 Runtime 如何支持 Human-in-the-loop？
- 057 Runtime 如何管理权限？
- 058 Runtime 如何管理工具？
- 059 Runtime 如何管理成本？
- 060 Runtime 为什么会成为 Agent OS 的基础？

---

## 第七章：Enterprise Agent

- 061 企业为什么做不出 Agent？
- 062 数字员工本质是什么？
- 063 企业 Agent 和个人 Agent 的区别？
- 064 企业 Agent 为什么需要权限系统？
- 065 Agent 如何接入企业系统？
- 066 Agent 如何接入微信、钉钉、邮件？
- 067 Agent 如何接入知识库？
- 068 企业 Agent 如何管理身份？
- 069 企业 Agent 如何管理审计？
- 070 企业 Agent 如何管理风险？

---

## 第八章：Browser & Computer Use

- 071 Browser Use 是什么？
- 072 Browser Use 和 RPA 的区别？
- 073 Computer Use 是什么？
- 074 Browser Use 为什么火？
- 075 Agent 如何操作浏览器？
- 076 Agent 如何操作桌面应用？
- 077 Agent 为什么需要视觉能力？
- 078 Browser Use 的局限是什么？
- 079 Computer Use 的局限是什么？
- 080 Agent 执行层未来会怎么演进？

---

## 第九章：AI Native Software

- 081 AI Native Software 是什么？
- 082 为什么 Agent 不只是聊天机器人？
- 083 Agent 为什么会改变软件架构？
- 084 Agent 为什么会改变前端？
- 085 Agent 为什么会改变 SaaS？
- 086 Agent 为什么需要新的交互模式？
- 087 Agent 如何改变产品设计？
- 088 AI Native 应用和传统应用有什么区别？
- 089 为什么 Agent 需要可观测性？
- 090 AI Native Software 的核心基础设施是什么？

---

## 第十章：Agent Future

- 091 Agent 会取代 App 吗？
- 092 Agent 会取代 RPA 吗？
- 093 Agent 会取代 SaaS 吗？
- 094 Agent OS 是什么？
- 095 Agent Marketplace 会是什么形态？
- 096 Agent 如何形成生态？
- 097 Agent 的安全边界在哪里？
- 098 Agent 的商业模式是什么？
- 099 Agent 未来会走向哪里？
