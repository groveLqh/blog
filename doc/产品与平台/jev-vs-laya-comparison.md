---
title: Jev 与 Laya 决策模型对比和选型方法
date: 2026-09-30
updated: 2026-09-30
category: 产品与平台
tags:
  - Jev
  - Laya
  - System One
  - 模型选型
  - 概率校准
  - AI Agent
summary: 对比 Jev 托管服务与 Laya 开源实现的模型底座、输出头、训练目标、概率语义、部署和评测证据，解释哪些能力可直接对照，哪些结论必须通过同场景实验验证。
---

# Jev 与 Laya 决策模型对比和选型方法

> 调研日期：2026 年 9 月 30 日。Jev 以当天公开文档为准；Laya 源码固定到提交 `6d942c92081fbc139e736bbd9ac0023223c29b7f`。本文没有运行模型或付费 API，公开实验均保留其原有配置和局限。

配套阅读：[TypeSafe Jev 结构化决策模型调研](typesafe-jev-system-one-models-research.md)、[Laya 源码解析](../技术与系统/laya-source-analysis.md)。前两篇分别回答产品如何使用、源码如何实现；本文回答如何在同一个业务任务中比较和选择。

## 1. 先给选型结论

Jev 和 Laya 都把模型作为有限答案空间内的决策组件，适合分类、路由、评分、筛选等任务。它们并不处在完全相同的交付层：Jev 是闭源托管模型与服务，Laya 是可检查源码、可部署模型权重和可修改训练流程的开源项目。

因此，选择时至少要同时回答三个问题：

1. 哪个系统在真实业务数据上能达到需要的质量和自动处理覆盖率？
2. 哪种部署方式更符合数据、延迟、容量和运维要求？
3. 团队是否愿意承担领域训练、概率校准和持续维护？

暂时可以给出的建议是：

- 想尽快验证一个低成本托管决策 API，可先评测 Jev。
- 需要本地部署、源码可检查或领域适配，可把 Laya 纳入候选。
- 中文、长文档、高损失决策和对抗输入，都不能仅凭产品定位做选择。
- 若任务可用规则精确完成，先评估规则；若任务必须生成内容或做长推理，两者通常只适合承担其中一个节点。

**当前证据不足以宣布某一方是所有任务上的赢家。** 低 token 单价、某块 GPU 上的单次耗时、某个微调后的测试分数，各自回答的是不同问题。

## 2. 同样是类型化决策 为什么技术含义不同

两者的共同应用接口大致是：

```text
状态 + 问题 + 候选项或评分标准
              ↓
       标签 / 分数 / 概率
              ↓
       由代码决定下一步
```

这一层的相似性，不能推出底层模型、训练数据、奖励函数或概率校准方式相同。

| 维度 | Jev | Laya | 选型影响 |
| --- | --- | --- | --- |
| 产品交付 | 闭源托管 API | 开源运行库及公开模型 checkpoint | 使用方承担的运维责任不同 |
| 已知底座 | 官方未公开可复现的完整底座配置 | 发布包配置为 `answerdotai/ModernBERT-large` 与 `jhu-clsp/mmBERT-base` | Laya 可检查配置，不能反推 Jev |
| 输出契约 | Choice、Score、Noul | 提供对应原语及其组合接口 | 接口适配可行，概率与边界仍需分别处理 |
| 推理机制 | 官方称新架构及并行采样 | 源码展示 encoder、候选标记、决策头与候选打分 | 一个是厂商公开方向，一个可检查具体计算图 |
| 训练可见性 | 公布 RLCD 名称与目标，未提供完整复现方案 | 可见 proper reward、微调脚本与校准实现 | 必须区分可见脚本和全部发布权重的训练履历 |
| 模态 | 当前仅文本 | 本文检查的 checkpoint 路径以文本 encoder 为主 | 图像需另接解析或多模态组件 |
| 上下文预算 | 整请求 64k；状态加最长问题 32k | 英语默认 512，多语及 typed 默认 1024；多语可显式提高至 8192 | 要比较有效证据覆盖，不能只比标称长度 |
| 领域定制 | 文档称通过状态与问题适配，不提供按客户微调 | 可以修改数据、训练脚本和部署配置 | 适配灵活性与维护工作同时增加 |
| 效果依据 | 官方工作流实验及早期第三方论文 | 仓库实验、可复现脚本及早期第三方论文 | 都需要本域验证 |

Jev 信息见 [Models](https://docs.typesafe.ai/models)、[发布说明](https://typesafe.ai/blog/introducing-system-one-models-and-jev)。Laya 运行逻辑见固定提交的 [README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md) 与 [common.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py)；底座 ID 另核对了 2026-09-30 读取的发布包 [英语配置](https://huggingface.co/convaiinnovations/laya/blob/main/rl_agent_config.json)、[多语配置](https://huggingface.co/convaiinnovations/laya/blob/main/multilingual/rl_agent_config.json)、[typed 配置](https://huggingface.co/convaiinnovations/laya/blob/main/typed-decisions/rl_agent_config.json)。没有下载或重新计数权重。

## 3. 底座与输出头 怎样影响能力边界

### 3.1 Laya 展示了一条可检查的实现路径

Laya 把类型、问题、候选项与状态编码成输入序列，在候选项处放置 mask 标记。双向 encoder 产生上下文表征，决策模块提取候选标记对应的向量，再通过头部网络打分。最后只在允许候选项上形成分布并映射回类型化答案。[来源：common.py 输入构造和 DecisionModel](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L135-L389)

这条路径可以利用预训练模型的语言表征能力，同时避免为一个分类标签生成整段自然语言。它也不需要把输出字母或 JSON 字符串逐 token 写出来，再由应用尝试解析。

但“用预训练模型”应准确理解：这里列出的底座是 encoder 家族，不应笼统称为“把某个聊天 LLM 的提示词改成只能回答选项”。Laya 还增加了决策头及相应训练和输出转换，改变的是计算与学习问题本身。

### 3.2 Jev 的内部实现仍需保留未知

Jev 对外提供类似的类型化决策能力，并声称采用新架构、并行采样与 RLCD。公开资料不足以确认它是否采用 Laya 这套 encoder、mask 标记或输出头结构。

因此以下推断都不成立：

- Laya 使用 ModernBERT，所以 Jev 也使用 ModernBERT。
- 两者都用 RLCD 这个词，所以奖励和训练过程相同。
- Laya 可以用几亿参数完成部分任务，所以 Jev 必然也是同量级。
- 开源实现复现了接口，就已经复现商业模型的全部能力。

### 3.3 并行也要分计算层级

并行至少可以指：同一前向过程对多个候选项打分、把多个问题装入 batch、在服务端调度并发请求，或复用相同状态的计算。

这些不是同一件事。Laya 当前代码为每个问题分别构建包含状态的序列，再放进 batch；可以复用状态分词结果，但这条路径没有共享一次 encoder 隐状态计算。因此，“一次 forward”不等于“状态只被编码一次”。Jev 文档描述共享状态和独立问题并行，但其内部复用方式不能从接口直接量化。[来源：Laya agent.py 输入批构建](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L859-L887)、[Jev Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)

实际比较应画出：状态长度、问题数、候选数增加时，端到端时间、显存和吞吐分别怎么变化。

## 4. 训练目标与概率 并不因为有名字就等价

### 4.1 Jev 的 RLCD 是公开目标 不是完整配方

TypeSafe 把 RLCD 解释为面向校准决策的强化学习，强调输出概率应反映结果发生的频率。公开说明没有提供足以复现训练的全部数据、损失、奖励和优化细节。[来源：AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)

它是一个可以评测的产品主张：检查概率是否在目标任务上可用。它还不是使用方可以独立审计的完整算法实现。

### 4.2 Laya 能看到具体目标函数 但仍要检查适用范围

Laya 源码中存在 proper scoring reward 的实现，覆盖对数、球面及有序等级相关的评分项；公开单设备微调脚本还包含教师概率、监督项和带扰动的分组优化。校准工具使用单独数据拟合温度。[来源：proper_reward](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L450-L476)、[微调脚本](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py)、[calibrate.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py)

这让开发者能够修改和研究训练流程，但不能仅凭存在一个脚本，就认定所有发布 checkpoint 都严格按当前脚本从头训练，或者所有超参数与数据来源已经完整公开。源码分析和模型履历核验是两个任务。

proper scoring rule 的激励目标，也不构成模型已校准的证明。有限数据、训练分布、标签噪声、优化误差和部署变化，都可能让输出偏离理想概率。

还要区分训练脚本版本和发布权重。Laya typed-decisions 模型卡承认，已发布版本的部分温度来自训练数据切片，且继承的按候选数温度可能覆盖新拟合的按类型温度；后来 notebook 改为留出校准，不会自动改变已经下载的 checkpoint。[来源：typed-decisions 模型卡](https://huggingface.co/convaiinnovations/laya-typed-decisions)

### 4.3 温度校准解决什么

温度缩放会改变 logits 对应分布的尖锐程度。对于同一个候选集合，用共同的正温度缩放通常不改变最高分候选；它主要帮助修正“有多确定”，不自动修复“选哪个”。

因此，一次温度拟合后 ECE 下降，不能解释成分类能力必然提高。若输入语言不被底座理解、正确答案不在候选集、关键证据已经截断，概率后处理很难补回这些缺失能力。

校准必须在独立留出集上评估，不能在拟合温度的数据上报告最终效果，更不能跨任务无条件复用。[方法参考：On Calibration of Modern Neural Networks](https://arxiv.org/abs/1706.04599)

## 5. 同名 confidence 是最容易踩的迁移坑

Jev 当前文档将 Choice 和 Score 的 `confidence` 描述为答案分布集中程度的摘要，但概念页没有给出完整公式；Noul 没有额外的 confidence 字段。[来源：Confidence](https://docs.typesafe.ai/confidence)、[Noul](https://docs.typesafe.ai/primitives/noul)

Laya 当前源码中，`answer_confidence = max(p)`；Choice 和 Score 的 `confidence = 1 - H(p) / log(k)`，其中 k 为候选数，H 为分布熵，而 Noul 的旧 `confidence` 使用 `max(p)`。最高候选概率与分布集中程度是不同统计量，也都会受候选集合影响。对 Score 而言，返回分数是等级期望，`max(p)` 仍然只是最大等级概率，不能当作“这个期望分数正确的概率”。[来源：common.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L510-L540)、[agent.py 结果转换](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1020-L1090)

Laya 的 `min_confidence` 在预测响应上增加低置信度标记；这本身不执行人工交接。某些便捷接口可把未通过阈值的结果转换为 `None`，应用仍需负责停止、升级或复核。[来源：confidence.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/confidence.py)

**不能把 Jev 的阈值 0.9 直接移到 Laya，或反过来。** 即使两个字段都叫 confidence、数值范围都是 0 到 1，其定义、分布和经验错误率仍可能不同。

建议在适配层保留这些信息：

```text
provider / checkpoint / source revision
question type / question version / label set
raw probabilities
provider confidence and its documented meaning
application-calibrated acceptance decision
reason for abstention or escalation
```

只有最后的“是否允许自动处理”适合统一成应用级语义。底层概率应尽量保留原貌，以便重算和审计。

迁移测试不能只看最高标签一致率；还要看固定风险下 coverage、复核率、重要类别召回率，以及哪些高置信度错误被新方案放行。

## 6. 结构约束分别减少了什么风险

### 6.1 可以减少的风险

有限候选空间能降低生成不存在标签、拼错工具名、输出无法解析文本等问题。Laya 的结构化接口明确围绕 enum、bool 和有界整数这类可枚举答案工作，拒绝任意自由字符串、数组和嵌套对象等不支持的形状。[来源：structured.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py#L1-L180)

对固定字段，这可以把失败从“难以解析的自然语言”变成更容易捕获和测试的接口状态。

### 6.2 仍然存在的风险

1. **候选集不完整。** 正确答案没有被提供，模型只能在错误选项里选一个。
2. **语义判断错误。** 输出 `shipping` 完全符合类型，却可能把售后投诉错送给物流。
3. **输入和标签偏差。** 名称、顺序、否定、语言和上下文位置都会影响模型。
4. **证据缺失。** 截断、OCR 错误、召回遗漏可能在模型调用前就破坏了任务。
5. **过度自信。** 一致且尖锐的概率分布，也可能对应稳定的错误。
6. **对抗内容。** 外部文本可以试图诱导模型选择一个合法但错误的选项。
7. **权限和动作错误。** 判断本身不授予系统执行权限。

所以，“没有自由文本生成”只能减少一类输出风险，不能消灭事实错误或业务错误。Jev 官方的边界说明和 Laya 仓库自身的评测说明，都明确记录了与这些问题相关的局限。[来源：Jev jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)、[Laya research README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/README.md)

### 6.3 一项同时覆盖两者的受控研究

早期论文在固定问题和定义、交换 yes/no 名称绑定的实验中，报告托管 Jev 的定义级决策翻转率为 32.5%，Laya 为 76.9%。两者的类型输出仍然合法。[来源：Type-Safe Is Not Error-Free，v2](https://arxiv.org/html/2609.26758v2)

它说明“类型合法”与“按定义理解选项”必须分开测试。它不是两者普通业务错误率，也不是当前源码版本完整能力的排名。论文中的模型及权重条件必须保留，不能把名称相同当作与今天部署完全一致。

## 7. 公开跑分为什么不能直接排座次

### 7.1 Jev 的公开证据

官方工作流评测把代码规则与模型判断组合起来，并使用强模型共识作参考。第三方 ContractNLI 与 judge 研究补充了费用、客户端延迟、质量和级联方面的证据。它们显示不同任务的质量差异很大，低费用并不意味着每种任务都达到强推理模型水平。

完整数字和限制见 [Jev 调研第 6、7 节](typesafe-jev-system-one-models-research.md)。

### 7.2 Laya 的公开证据

Laya 仓库把多项原始结果、环境和脚本放在 research 目录，但并非每个宣传数字都具有同等证据。项目所展示的 typed-decisions 0.766 分数属于在该基准训练集上微调的 checkpoint；基础英语 checkpoint 为 0.362。BENCHMARKS 同时标明，0.766 尚无已提交的原始结果文件。因此必须将它标成项目公布的微调结果，不能当作可独立重算的零样本成绩。[来源：固定版本 README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md#fine-tune-for-better-accuracy)、[BENCHMARKS](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/BENCHMARKS.md)

research README 还披露开箱校准、语言和长文本位置敏感性的问题，并说明原始上游套件引用的部分 Jev 分数来自第三方、并非直接同场测试。另有社区贡献的配对诊断，但也需要独立检查其样本与配置。[来源：research README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/README.md)

这类负面结果很有价值：它帮助使用方设计测试，但不能取一项最差结果概括整个模型，也不能只展示微调后最好的那张图。

### 7.3 至少统一六个比较条件

| 条件 | 必须统一或明确披露 |
| --- | --- |
| 数据 | 同一测试样本、标签和切分；不能把不同样本规模的分数直接作差 |
| 任务适配 | 都是 zero-shot，或分别计入各自调参和训练预算 |
| 输入 | 相同证据，注明截断、翻译、检索与候选生成 |
| 输出 | 同一标签语义；概率缺失或重标定方式透明 |
| 延迟 | 客户端完整耗时、batch 和并发、硬件、网络地区一致或可解释 |
| 成本 | 云 API 全部调用费，对比自部署的硬件、利用率和运维总成本 |

最好同时报告同契约比较与各自最佳部署方案。前者解释模型差异，后者帮助业务选型。

## 8. API 单价和本地运行成本怎样比较

Jev 当前公开输入价格为每百万 token 0.042 美元，输出不收费。Laya 权重可供部署，但实际推理需要 CPU/GPU、内存、供电或云实例，以及容量规划与维护。[来源：Jev Models](https://docs.typesafe.ai/models)、[Laya README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md)

因此“Laya 免费”最多描述软件或权重的获取条件，不能直接描述生产总成本。

可用以下口径建立模型：

```text
Jev 月成本
  = 计费输入 token × 单价
  + 重试 + 升级模型 + 人工复核 + 集成与治理

Laya 月成本
  = 实例或硬件摊销 + 能源与存储
  + 运维 + 校准与再训练 + 升级模型 + 人工复核

每个合格自动决策成本
  = 对应全部成本 / 达到业务质量要求的自动决策数
```

几个重要的非线性因素：

- 自部署利用率很低时，闲置成本会主导。
- 接近容量上限时，排队会拉高 p95/p99，不能用平均吞吐掩盖。
- 动态路由不同 checkpoint 时，冷加载、显存切换和模型驻留数量会影响延迟。
- batch 可以提升吞吐，但等待凑批可能恶化交互延迟。
- 中文或长文档错误更多时，复核与升级成本可能超过省下的模型费。

没有业务流量曲线和实测质量，就不应给出一个虚假的盈亏平衡调用量。

## 9. 部署和数据治理的实际差异

| 事项 | 托管 Jev | 自部署 Laya |
| --- | --- | --- |
| 模型运行位置 | 由服务商提供；地区、保留策略与合同需确认 | 可以由使用方选择运行环境 |
| 扩容与维护 | 服务商承担模型服务，使用方仍处理配额与降级 | 使用方负责容量、依赖、驱动和服务稳定性 |
| 数据保护 | 核对 DPA、日志、ZDR 范围和条款 | 审查应用、插件、遥测、日志和网络配置 |
| 版本控制 | 固定模型 ID，监控别名和下线通知 | 固定源码提交、权重 revision、依赖与校准文件 |
| 定制 | 调整状态和问题 | 可调整模型、训练数据、目标和推理服务 |
| 退出与迁移 | 依赖接口兼容与服务商政策 | 依赖模型许可证、内部维护能力与可复现产物 |

Jev 文档称不使用客户数据训练，并提供企业 ZDR 的联系入口；这不等于所有账号默认零保留。[来源：Legal](https://docs.typesafe.ai/legal)

Laya 可以本地运行，也不等于整套应用自动离线。第一次获取模型、可选集成、外部 fallback 和业务日志都可能涉及网络。三张公开模型卡均声明 Apache-2.0；部署时仍应分别检查所用权重版本、底座依赖和再分发要求，不只看仓库徽章。[来源：英语模型卡](https://huggingface.co/convaiinnovations/laya)、[多语模型卡](https://huggingface.co/convaiinnovations/laya-multilingual)、[typed 模型卡](https://huggingface.co/convaiinnovations/laya-typed-decisions)

## 10. 一套公平的 Jev 与 Laya 对照实验

### 10.1 固定一个真实任务

以电商客服分流为例，先定义标签、信息不足和复核边界；选取有权使用且已脱敏的数据，用人工确认或可追溯业务结果建立真值。按客户或会话分组划分开发、校准、测试集，再预留时间外测试集。

同时纳入规则、专用分类器和小型 LLM 的结构化输出基线。如果只让两款决策模型互比，会遗漏更合适的方案。

### 10.2 分成三个训练预算层

1. **直接使用。** Jev 和 Laya 原始 checkpoint，只提供清晰问题和标签定义。
2. **轻量校准。** 问题固定，使用同规模留出数据拟合允许的概率后处理。
3. **领域适配。** Laya 微调或训练更专用的分类器，同时计入标注、训练与维护预算；Jev 使用其公开支持的适配方式。

不要把第三层的 Laya 结果与第一层 Jev 并排后简单宣布模型天生更强。可以比较最终方案，但必须说明投入不同。

### 10.3 冻结验收标准

质量指标包括 macro-F1、重要类别 precision/recall、按业务损失加权的错误率、Brier/log loss、可靠性图和 risk–coverage 曲线。低频高损失类别单列，不能只看平均分。

延迟记录 p50/p95/p99、失败率、超时与重试，区分热请求、冷请求、batch 吞吐和用户可见等待时间。成本按实际流量与人工复核计算。

对 Laya 至少固定源码、权重 revision、实际 encoder 配置、设备、精度、token budget、温度文件、路由策略。对 Jev 固定模型版本、请求格式、时间和调用地区。

### 10.4 验证原语与阈值的迁移

分别扫描各模型的概率和置信度阈值，以独立校准集选择接收策略，再用测试集报告固定风险下的 coverage。检查相同标签和相同均值是否隐藏不同的分布或高置信度错误。

对候选数量变化、中文改写、选项重排、标签与定义冲突、长文本位置、信息缺失和对抗指令分别建切片。另测一条完整业务流程，避免局部指标很好但最终改派或复核率失控。

### 10.5 决策与停止条件

选型会议应拿到一个完整结果：达到质量门槛的方案，其自动化覆盖率、总成本、尾延迟、需要维护的人力和无法覆盖的输入范围。

如果两者都无法达到关键类别的风险要求，正确结论可能是继续旁路、缩小自动化范围或更换任务设计。增加人工和升级模型可以提高覆盖，但必须重新计入成本和错误相关性。

## 11. 适合怎样的团队与场景

| 情况 | 优先验证的方向 | 不能省略的工作 |
| --- | --- | --- |
| 想快速试一个低成本决策节点，暂不维护模型服务 | Jev | 权限、价格、配额、本域质量与数据条款 |
| 必须控制模型运行环境，或需要源码审计 | Laya 或其他可部署模型 | 权重来源、依赖安全、容量和完整网络边界 |
| 有大量领域标注，愿意维护训练链路 | Laya 微调、专用分类器、其他开放底座 | 独立测试、过拟合检查与再校准 |
| 中文短指令或混合语言 | 两者都实测，额外检查 Laya checkpoint 路由 | 同一真实语料、语义边界和输入规范 |
| 长文档、证据跨多段 | 先设计检索与分块，再测两者 | 证据召回率、截断与位置敏感性 |
| 需要图像直接参与有限选择 | 另评估已公布多模态的方案 | 输入契约、价格、权限和实际效果 |
| 不可逆或高损失动作 | 决策组件只提供建议和复核信号 | 独立授权、业务校验、人类审批和审计 |

OpenAI Decisions API 已公布使用 Luna、支持文本与图像以及有限答案空间选择，可加入未来评测；截至调研日，不能用普通 Luna 的价格代替 Decisions API 的价格，也缺少足够公开信息完成三方性能排名。[来源：DevDay 2026 Recap](https://openai.com/index/devday-2026-recap/)

## 12. 最后怎么理解这两条路线

Jev 展示了把决策接口做成托管模型产品的路线。Laya 展示了用公开预训练 encoder、候选打分头、决策训练和校准工具构建类似应用原语的一条具体实现路径。

使用方真正能长期保留的，不只是某个供应商的 API 调用，而是：

- 明确的问题和标签定义。
- 可靠的真值与独立测试集。
- 能按风险调节的接收和拒答策略。
- 可审计的版本、概率和最终业务结果。
- 可以切换组件、处理失败的工程架构。

有限输出让模型更容易接入软件，但能否安全自动化，最终仍取决于语义能力、概率质量、业务控制和完整系统验证。

## 13. 资料与复核入口

### Jev

- [产品发布说明](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Models](https://docs.typesafe.ai/models)、[Confidence](https://docs.typesafe.ai/confidence)、[Noul](https://docs.typesafe.ai/primitives/noul)
- [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)、[Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)
- [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)、[Legal](https://docs.typesafe.ai/legal)

### Laya 固定源码版本

- [完整源码快照](https://github.com/NandhaKishorM/laya/tree/6d942c92081fbc139e736bbd9ac0023223c29b7f)
- [README](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md)
- [common.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py)、[agent.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py)
- [confidence.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/confidence.py)、[calibrate.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py)
- [structured.py](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py)
- [单设备微调脚本](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py)
- [研究结果与限制](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/README.md)

### 方法和独立研究

- [On Calibration of Modern Neural Networks](https://arxiv.org/abs/1706.04599)
- [Type-Safe Is Not Error-Free，v2](https://arxiv.org/html/2609.26758v2)
- [OpenAI DevDay 2026 Recap](https://openai.com/index/devday-2026-recap/)
