# 从 pi-vcc 看 Agent 的长期记忆设计

最近看到了一个很有意思的小项目：[`pi-vcc`](https://github.com/sting8k/pi-vcc)。

项目本身不大，代码量也不算夸张。

但它背后回答的问题，其实非常大：

> Agent 如何在有限 Context Window 下，拥有长期、稳定、可回溯的工作记忆。

很多人看到 pi-vcc，第一反应会把它理解成一个「上下文压缩工具」。

这个理解没错，但有点浅。

我更愿意把它看成一个很早期的 Agent Memory Layer。

因为它真正做的不是把历史对话简单变短，而是把一段混乱的 Agent 工作历史，重新整理成一份可读、可索引、可召回的结构化记忆。

这件事对未来的 Coding Agent、数字员工、长期任务型 Agent 都很重要。

因为 Agent 真正的问题，不是它一次能看多少 token。

而是它能不能长期记住：

- 这件事为什么要做；
- 之前做到了哪里；
- 哪些文件被读过、改过、创建过；
- 用户有什么偏好；
- 哪些坑已经踩过；
- 出问题时能不能回到原始现场。

Long Context 只能缓解「看不下」的问题。

但 Memory 要解决的是「找得到、信得过、回得去」的问题。

## 不是 Summary，而是 Index

大多数 Agent 系统的上下文压缩，大概是这样：

```text
Conversation
   ↓
LLM Summary
   ↓
继续对话
```

这条路的问题是，Summary 本身也是一次生成。

它不稳定。

同一段历史，今天总结成这样，明天可能总结成另一种说法。

更麻烦的是，当上下文多次压缩后，模型看到的就不再是真实历史，而是：

```text
Summary of Summary of Summary
```

这会带来一种很隐蔽的问题：

历史并不是一次性丢失的，而是在一次次改写中慢慢变形。

最先丢掉的，往往不是显眼的大目标，而是那些很小但很关键的上下文：

- 当时为什么否掉某个方案；
- 某个报错到底是已修复，还是只是看过；
- 用户说过「不要用 Redux」这种偏好；
- 某个文件只是读过，还是已经改过；
- 某条分支是不是已经被 abandon。

pi-vcc 选择了另一条路。

它不调用 LLM 来重写历史。

它用确定性的规则，把历史整理成索引。

这意味着：

```text
Memory ≠ Summary
Memory = Index + Recall
```

摘要只是导航层。

真正的历史仍然保存在底层 JSONL 会话文件里。

当需要细节时，再通过 recall 回到原始消息。

这就是 pi-vcc 最值得学习的地方。

它没有把压缩理解成删除，而是理解成索引构建。

## 六步流水线

从实现上看，pi-vcc 可以理解成六步流水线。

```text
Raw Pi Messages
   ↓
Normalize
   ↓
Sanitize
   ↓
Filter Noise
   ↓
Extract Semantic Sections
   ↓
Build Brief
   ↓
Merge Previous Summary
```

这里每一步都不复杂，但组合起来非常有工程味。

它不是在追求「模型理解得多聪明」，而是在追求「系统输出足够稳定」。

## 第一步：消息归一化

Pi 的原始消息不是单一聊天文本。

里面可能有：

- user；
- assistant；
- tool call；
- tool result；
- bash execution；
- 图片；
- 系统提示；
- 分支上下文。

如果不先统一结构，后面根本没法做可靠压缩。

所以 pi-vcc 先把这些异构消息统一成 `NormalizedBlock`：

```ts
export type NormalizedBlock =
  | { kind: "user"; text: string; sourceIndex?: number }
  | { kind: "assistant"; text: string; sourceIndex?: number }
  | { kind: "tool_call"; name: string; args: Record<string, unknown>; sourceIndex?: number }
  | { kind: "tool_result"; name: string; text: string; sourceIndex?: number }
  | { kind: "bash"; command: string; output: string; exitCode: number | undefined; sourceIndex?: number };
```

这里最重要的不是 `kind`。

而是 `sourceIndex`。

它保留了每一个压缩块和原始消息之间的对应关系。

后续摘要里出现的 `#N`，本质上就是这个 sourceIndex。

这也是 pi-vcc 能做「无损召回」的基础。

用户消息里的图片，会被转成类似 `[image: mimeType]` 的文本标记。

assistant 如果包含 toolCall 类型的 content part，也会被拆成独立的 `tool_call` 块。

也就是说，pi-vcc 先把「聊天记录」变成了「事件流」。

这一步很像数据库设计里的 schema normalization。

只有先有统一中间表示，后面才可能做稳定的分析、裁剪和召回。

## 第二步：文本清洗

第二步是 sanitize。

它做的事情很朴素：

- 去掉 ANSI 转义序列；
- 去掉控制字符；
- 统一换行符。

类似：

```ts
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
```

这一步看起来不起眼，但对 Coding Agent 很重要。

因为 bash 输出里经常有大量颜色码、控制字符、终端格式化信息。

如果不清理，这些噪声会严重污染后面的正则匹配和摘要质量。

这里有一个实现细节值得注意：

在当前源码里，sanitize 并不是一个独立的全局 pass，而是嵌在 normalize 过程中，对 user、assistant、tool_result 等文本逐处清洗。

但从理解流水线的角度，把它单独列为第二步是合理的。

## 第三步：噪音过滤

normalize 之后，所有东西都变成了统一 block。

但不是所有 block 都值得进入记忆。

pi-vcc 会过滤掉一些噪音：

- 空块；
- 系统 wrapper；
- 纯控制信息；
- 一些不该进入长期记忆的工具调用；
- 类似 `Continue from where you left off.` 这种恢复指令。

还有一个很典型的处理，是去掉 assistant 的自言自语前缀。

比如：

```ts
const SELF_TALK_PREFIX_RE =
  /^\s*(?:hmm|wait|actually|oh|okay|ok|well|so)[,.!\s-]+/i;
```

这类词在 LLM 输出里很常见。

人读的时候觉得没什么。

但如果要把历史压缩成高密度上下文，它们就是噪音。

不过这里也有一个源码层面的校正：

当前版本里，assistant filler 的去除主要发生在 brief 构建阶段，而不是 filter-noise 阶段。

这说明 pi-vcc 的「噪音过滤」其实分两层：

第一层是结构性噪音。

第二层是表达性噪音。

前者影响事件流是否进入记忆。

后者影响摘要文本的密度。

## 第四步：五类语义分区提取

这是 pi-vcc 最核心的地方。

它不是把对话直接压成一段自然语言总结，而是从历史里提取五类结构化信息。

### 1. Goals

Goals 是任务目标。

它主要从用户消息里提取。

为了避免把无意义短句当成目标，pi-vcc 会过滤掉：

- ok；
- yes；
- thanks；
- hi；
- 太短的句子；
- URL；
- 路径；
- 代码片段；
- 命令模板。

同时它会识别 scope change。

比如用户说：

```text
接下来我们做 XX
```

这通常意味着旧目标已经阶段性结束，新的上下文开始了。

最终 Goals 最多保留 8 条。

这个设计很克制。

它没有试图总结用户所有话，而是只保留「任务方向」。

### 2. Files

Files 是文件操作记忆。

pi-vcc 会从 `tool_call` 里提取文件路径。

它会识别常见工具：

- Read；
- Edit；
- Write；
- MultiEdit；
- Glob；
- Grep。

然后把文件分成：

```text
Read
Modified
Created
```

还有一个很实用的细节：

如果路径都是绝对路径，它会计算最长公共前缀，然后把路径裁成相对后缀。

这样摘要里不会塞满一堆冗长目录。

这很符合真实 Coding Agent 的场景。

在一次长任务里，模型最需要知道的不是完整路径前缀，而是：

```text
我到底碰过哪些文件？
哪些只是读过？
哪些已经改过？
哪些是新建的？
```

### 3. Commits

Commits 是提交记录。

pi-vcc 会从 bash 命令里识别 `git commit -m`。

然后提取 commit message，以及后续 tool_result 里的 commit hash。

这部分实现很保守。

它对典型的 `git commit -m "xxx"` 很有效。

但对交互式 commit、squash、merge commit、多行 message 的覆盖不一定完整。

这也是规则系统的典型取舍：

稳定，但不万能。

### 4. Preferences

Preferences 是用户偏好。

比如：

```text
I prefer TypeScript
Don't use Redux
Always use pnpm
Please avoid class components
```

pi-vcc 会用规则识别类似：

- prefer；
- don't want；
- always use；
- never use；
- please avoid；
- style / format / language / naming。

同时它会和 Goals 去重，避免同一句话既被当成目标，又被当成偏好。

这是非常重要的一类记忆。

因为对长期 Agent 来说，用户偏好比单次任务更稳定。

文件会变。

报错会变。

但偏好往往跨任务存在。

### 5. Outstanding Context

Outstanding Context 是遗留上下文。

它主要扫描最后 20 个 block，寻找当前仍然阻碍任务推进的信息。

比如：

- failed；
- broken；
- cannot；
- blocked；
- crash；
- won't work。

这部分不是长期记忆，而是工作现场。

它回答的是：

```text
现在卡在哪里？
下次继续时最应该先看什么？
```

这类信息非常适合在压缩后保留下来。

因为一旦丢了，Agent 下一轮很容易重复走老路。

## 第五步：Brief 构建

结构化信息之外，pi-vcc 还会保留一份 brief transcript。

这不是完整对话，而是压缩后的时间线。

它的目标是让 Agent 仍然能看到基本过程：

```text
用户提出了什么
assistant 做了什么
调用过哪些工具
执行过哪些命令
```

这里有几个设计很值得借鉴。

### Token 级截断，而不是字符级截断

pi-vcc 使用 `Intl.Segmenter` 做词级切分。

然后跳过大量英文停用词，再计算有效 token。

用户消息限制大约 256 个有效 token。

assistant 消息限制大约 200 个有效 token。

这比简单按字符截断更合理。

因为截断预算应该花在语义词上，而不是 the、is、and 这些低信息密度词上。

当然，这里也暴露出一个问题：

当前 stopwords 基本偏英文。

如果对中文场景做优化，需要增加中文停用词、中文偏好表达、中文目标表达的规则。

否则中文内容会更早触发截断。

### Bash 命令压缩

Coding Agent 的历史里，bash 命令很多。

但很多命令是这样的：

```bash
cd app && bun test tests/auth.test.ts | tail -20
```

真正有意义的是：

```bash
bun test tests/auth.test.ts
```

所以 pi-vcc 会：

- 去掉 `cd xxx &&` 前缀；
- 去掉 `| head`、`| tail`、`| sort` 等展示型管道；
- 最后截断到一定长度。

这让 brief 里保留的是「做了什么」，而不是「怎么格式化输出」。

### 工具调用摘要

不同工具会被压成不同格式：

```text
* Read "src/auth/session.ts"
* Edit "src/auth/session.ts"
* Write "src/auth/session.ts"
* Glob "src/**/*.ts"
* Bash "bun test tests/auth.test.ts"
```

如果连续多次读同一个文件，会合并成：

```text
* Read "src/auth/session.ts" (#14, #18, #22) x3
```

每轮 assistant 最多保留 8 条工具调用。

多余的会被折叠成：

```text
* (N earlier tool-call entries omitted)
```

这件事非常重要。

因为 Coding Agent 的上下文膨胀，很多时候不是用户说了太多，而是工具调用和工具结果太多。

pi-vcc 的策略是：

保留工具调用索引，不保留大段工具结果。

也就是说，它保留「地图」，不把整座城市塞进摘要。

## 第六步：增量合并

当已经有一版旧摘要时，pi-vcc 不会完全重写。

它会做增量合并。

这里可以理解成记忆生命周期管理。

很多文章会把它简单概括成：

```text
Sticky vs Volatile
```

但如果看源码，其实可以更细一点，分成三类。

### 长期累积型

比如：

- Goals；
- Preferences；
- Commits。

这些信息会和旧摘要做去重合并，再做数量上限控制。

它们不是每轮都完全替换。

因为它们代表的是较长周期内仍有价值的信息。

### 并集快照型

比如 Files。

文件操作不是简单替换旧值，而是会按 read / modified / created 分类聚合。

这让 Agent 能看到一段任务周期内碰过的文件集合。

### 瞬时状态型

比如 Outstanding Context。

这个更接近 volatile。

它只关心当前阻塞，不应该无限累积。

否则历史上的旧报错会污染当前判断。

这个设计很像人类记忆。

我们不会记得昨天 14:32 打开过哪个文件。

但我们会记得：

```text
这个项目一直用 TypeScript
这个模块最近在改 auth
当前 CI 还没过
```

Agent 也应该这样。

不同记忆，需要不同生命周期。

## Recall：真正的关键

pi-vcc 最值得讲的不是压缩率。

而是 recall。

压缩后的摘要只是索引。

真正的历史保存在 Pi 的 JSONL 会话文件里。

`vcc_recall` 可以直接读原始 JSONL，支持：

- 最近消息浏览；
- 关键词搜索；
- 正则搜索；
- 多词 OR-ranked 查询；
- 分页；
- 按 sourceIndex 展开全文；
- 默认只搜索当前 active lineage；
- 通过 `scope:all` 搜索所有分支。

这就是它和普通 summary memory 最大的区别。

普通 summary memory 是：

```text
原文 → 摘要 → 原文丢失
```

pi-vcc 是：

```text
原文 → 索引摘要 → 原文仍在 → 按需召回
```

这让系统有了一个很重要的能力：

可证明。

当模型说「之前用户要求不要用 Redux」时，它不是凭一段被改写过的总结说的。

它可以通过 recall 回到原始消息。

对 Agent 来说，这是非常关键的能力。

因为长期任务里，信任不是来自「模型说它记得」。

而是来自「系统能证明它为什么这么认为」。

## 为什么不用 LLM Summary

这可能是 pi-vcc 最有争议、也最有价值的选择。

它几乎完全用规则。

这会让它看起来不够智能。

但工程上，它有几个明显优势。

### 第一，确定性

同样的输入，永远得到同样的输出。

这意味着摘要可以被测试，可以做 golden snapshot，可以做回归。

LLM summary 很难做到这一点。

### 第二，低成本

压缩不需要额外模型调用。

这对 Coding Agent 很重要。

因为 compaction 经常发生在上下文快满、任务正复杂的时候。

如果每次压缩都要再调用一次 LLM，不仅有成本，也有延迟和失败风险。

### 第三，可解释

规则系统出错时，你能定位到：

- 哪个正则没匹配；
- 哪个工具名没覆盖；
- 哪个字段没识别；
- 哪个 cap 太小；
- 哪个 section 合并策略不对。

LLM summary 出错时，你往往只能说：

```text
它漏了。
```

这很难工程化。

### 第四，不改写历史

LLM summary 的本质是重写。

规则摘要的本质是抽取和索引。

这两个路线在长期任务里差异巨大。

前者更像让模型讲述过去。

后者更像让系统保存过去。

## 它的问题也很明显

pi-vcc 不是完美方案。

它的局限也很清楚。

第一，规则偏英文。

Goals、Preferences、Outstanding Context 的模式都明显更适合英文表达。

如果在中文团队里用，需要补中文规则。

比如：

```text
我更希望...
不要...
以后都用...
尽量避免...
这块先别...
接下来我们...
当前卡在...
```

第二，工具 schema 假设比较强。

Files 抽取依赖常见工具名和常见参数键。

如果你的 Agent 工具叫法不一样，或者文件路径藏在别的字段里，就会漏掉。

第三，commit 抽取比较窄。

它主要识别 `git commit -m`。

对复杂 git workflow 支持有限。

第四，recall 目前还是偏单 session。

它直接读 JSONL 文件做搜索。

这对单会话足够简单可靠。

但如果要扩展到跨项目、跨会话、跨天甚至跨团队，就需要更正式的索引层。

第五，无损召回也有隐私风险。

因为原始 JSONL 还在。

如果里面有 secret、敏感日志、被 abandon 的分支内容，`scope:all` 可能重新把它们暴露出来。

所以 recall 不是越强越好。

它还需要权限、作用域、脱敏和审计。

## 对数字员工的启发

我最近一直在思考数字员工。

很多人在做数字员工时，重点都放在：

```text
Browser Use
Computer Use
Tool Use
Workflow Automation
```

也就是 Agent 的手和脚。

但真正让数字员工长期可用的，不只是执行能力。

还有记忆能力。

今天你让它做一个任务。

明天它还记不记得昨天的约束？

上周和业务方形成的共识，下周还能不能延续？

用户偏好、项目规则、组织流程、历史决策，能不能被稳定保留下来？

如果每次都重新解释，数字员工就只是一个更会调用工具的聊天机器人。

它不是员工。

员工之所以是员工，不只是因为会干活。

而是因为他知道上下文。

他知道这个公司怎么做事。

知道这个老板喜欢什么。

知道这个项目以前踩过什么坑。

知道哪些方案已经被否过。

知道哪些事情可以自己推进，哪些事情必须请示。

所以数字员工的架构，不应该只是：

```text
输入层 → 规划层 → 执行层 → 输出层
```

中间应该有一层非常重要的东西：

```text
输入层
  ↓
记忆层
  ↓
规划层
  ↓
执行层
  ↓
输出层
```

pi-vcc 给了一个很好的启发：

记忆层不一定一开始就要上复杂向量数据库，也不一定什么都交给 LLM。

很多记忆，应该先结构化。

## 如果演进成 Agent Memory OS

如果把 pi-vcc 的思路继续往前推，我觉得未来 Agent Memory OS 至少应该有几层。

### 1. Event Log

所有原始事件都应该保留。

包括：

- 用户消息；
- assistant 回复；
- 工具调用；
- 工具结果；
- 文件变更；
- 浏览器行为；
- 外部系统事件；
- 人工反馈。

这是事实层。

不能轻易改写。

### 2. Normalized Schema

不同来源的事件必须归一化。

浏览器、终端、邮件、企业 IM、MCP 工具、文件系统，都应该进入统一事件模型。

否则长期记忆只会越来越乱。

### 3. Structured Memory

从事件里抽取结构化记忆：

- goals；
- tasks；
- decisions；
- files；
- preferences；
- blockers；
- people；
- systems；
- constraints；
- credentials boundary；
- risk notes。

这层应该尽量可解释。

不是所有东西都需要 LLM。

能用规则稳定抽取的，就不要让模型自由发挥。

### 4. Index Layer

摘要不是最终事实。

摘要是索引。

索引要能指回原始证据。

每条记忆都应该有来源。

类似：

```text
memory_id
source_event_id
created_at
scope
confidence
lifecycle
```

### 5. Recall Layer

Agent 需要能主动召回。

召回不应该只有向量搜索。

还应该包括：

- exact search；
- regex；
- BM25；
- vector search；
- graph traversal；
- sourceIndex 回溯；
- lineage / branch scope；
- time range；
- project scope；
- user scope。

不同问题需要不同召回方式。

### 6. Lifecycle Manager

不同记忆生命周期不同。

可以大概分成：

```text
Working Memory：当前任务现场
Episodic Memory：一次任务过程
Semantic Memory：稳定知识和偏好
Procedural Memory：流程和操作习惯
Organizational Memory：团队规则和业务约束
```

pi-vcc 的 sticky / volatile 只是一个开始。

真正的 Memory OS 需要更细的生命周期管理。

### 7. Safety & Governance

长期记忆一定会涉及安全问题。

尤其是企业场景。

需要处理：

- 哪些内容不能记；
- 哪些内容只能当前会话记；
- 哪些内容可以跨会话；
- 哪些内容可以跨项目；
- 哪些内容需要脱敏；
- 谁可以 recall；
- recall 后是否要进入模型上下文；
- 记忆如何删除；
- 记忆如何审计。

如果没有这层，长期记忆越强，风险越大。

## 我对 pi-vcc 的判断

pi-vcc 不是一个大而全的 Memory Framework。

它也不是一个通用的 RAG 系统。

它更像是一个非常具体、非常工程化的回答：

> 当 Coding Agent 的上下文快满时，怎样稳定地保留任务历史，并且在需要时回到原始现场？

它的优势不在于智能，而在于可靠。

它不是用 LLM 重新讲述历史。

它是用规则给历史建立索引。

这点很重要。

未来 Agent 的长期记忆，我认为不会只有一种形态。

大概率会是多层混合：

```text
事件日志负责保存事实
规则抽取负责稳定结构
向量检索负责语义召回
LLM 负责解释和综合
权限系统负责边界
```

pi-vcc 站在其中一个很关键的位置：

```text
事件日志 → 结构化索引 → 可回溯摘要
```

这条链路越稳定，Agent 越不容易在长期任务里漂移。

## 最后

很多人以为，解决 Agent 记忆问题的方向是更大的上下文窗口。

我越来越觉得不是。

更大的 Context Window 当然有用。

但它解决的是容量问题。

长期记忆解决的是组织问题。

人类并不是把所有经历都塞进工作记忆里。

我们会记录、索引、遗忘、召回、归纳、分层。

Agent 最终也会如此。

所以我对 pi-vcc 的评价是：

它表面上是一个 Pi 的会话压缩器。

但本质上，它展示了一种更重要的设计方向：

> Context 不应该被反复总结成一段越来越模糊的文字，而应该被组织成一套可索引、可召回、可证明的记忆系统。

这也是未来数字员工真正要补的一层。

不是更长的上下文。

而是更可靠的记忆。
