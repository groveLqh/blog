---
title: Laya 源码解析 从预训练编码器到结构化决策
date: 2026-09-30
updated: 2026-09-30
category: 技术与系统
tags:
  - Laya
  - ModernBERT
  - 决策模型
  - 源码分析
  - 概率校准
summary: 从输入编码、双向编码器、候选项评分头、训练目标和温度校准出发，解释 Laya 如何输出类型化决策，并区分结构合法、统计可靠与业务正确。
---

# Laya 源码解析 从预训练编码器到结构化决策

Laya 将一份文本状态和一组有限候选项编码成序列，用预训练双向编码器及决策头一次算出各候选项的分数，再由普通程序代码构造结果。它能免去逐 token 生成和 JSON 解析，但正确的返回类型、集中的概率分布与正确的业务判断，是三件需要分别验证的事。

本文沿着实际调用链分析其输入、模型、训练、校准与评测。审计基线固定为 GitHub 提交 [`6d942c92081fbc139e736bbd9ac0023223c29b7f`](https://github.com/NandhaKishorM/laya/commit/6d942c92081fbc139e736bbd9ac0023223c29b7f)，提交日期为 2026 年 9 月 29 日，对应包版本 0.3.22。文中的 GitHub 源码链接均固定到该提交；本文没有重新训练、下载权重或运行性能测试，历史性能数字会注明其证据范围。

配套阅读：[Jev System One 技术调研](../产品与平台/typesafe-jev-system-one-models-research.md) · [Jev 与 Laya 对比](../产品与平台/jev-vs-laya-comparison.md)

## 1 先建立正确的模型概念

可以把核心计算写成：

```text
state + question + candidate descriptions
  → tokenizer 与序列拼接
  → 预训练双向 Transformer encoder
  → 类型 embedding 与额外 Transformer 决策头
  → 读取各候选项前的 MASK 位置
  → 共享 scorer 生成 K 个 logits
  → temperature scaling 与 softmax
  → choice / score / noul
  → 可选 schema 投影和低置信度标记
```

这里的 `MASK` 是候选项表示的读取位置。模型不会在这些位置依次生成词，也不需要把某个候选标签转换成词表上的生成概率。每个候选项，无论描述被分成几个 token，最终都由同一个 scorer 得到一个标量分数。

`DecisionModel` 的定义明确写出双向 encoder 与 typed decision head；实现使用 `AutoModel`，不调用聊天模型的生成接口。预训练模型提供语言表示能力，额外训练的评分结构负责把问题与候选项映射到决策分布。[模型结构](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L318-L389) · [模型构造](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L424-L447)

### 1.1 三个 checkpoint 分别是什么

仓库列出以下模型。参数量为项目公布值，本文未通过权重重新计数。

| checkpoint | encoder 家族 | 总参数量 | 默认序列长度 | 定位 |
| --- | --- | ---: | ---: | --- |
| `laya` | ModernBERT-large | 约 421.3M | 512 | 英文任务 |
| `laya-multilingual` | mmBERT-base | 约 321.9M | 1024 | 多语种任务 |
| `laya-typed-decisions` | ModernBERT-large | 约 421M | 1024 | typed-decisions 工作流微调 |

研究脚本进一步把前两者拆为约 `394.8M encoder + 26.5M head` 和 `306.9M encoder + 15.0M head`。因此，不能把 421M 或 322M 直接当作原始 encoder 的参数量。多语 encoder 支持更长位置范围，也不代表所有调用默认读取 8192 tokens，实际输入仍受 checkpoint 配置和调用参数限制。[checkpoint 表](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md#L114-L120) · [参数拆分](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/build_benchmark_nb.py#L25-L40)

`build_model` 不把某一个 backbone 名称写死，而是读取 `cfg["encoder"]`。训练初始化可以调用 `AutoModel.from_pretrained`；加载完整 Laya checkpoint 时，可以从保存的 encoder config 建立模型，再加载 Laya 权重。公开微调脚本读取已有 checkpoint，所以仅凭该脚本，不能还原三个已发布 checkpoint 的全部原始预训练和后训练过程。

2026 年 9 月 30 日读取 Hugging Face family bundle 的配置，能够把 encoder 家族进一步落到具体标识：英文根目录与 `typed-decisions` 子目录使用 `answerdotai/ModernBERT-large`，`multilingual` 子目录使用 `jhu-clsp/mmBERT-base`。三者配置均为两层 decision head。英文的 `max_len/head_max_len` 为 `512/192`，另外两者为 `1024/256`。这些是读取当日 Hub `main` 的配置事实，不等于已经下载并核验权重内容，也不与 GitHub 的代码提交自动绑定。[英文配置](https://huggingface.co/convaiinnovations/laya/blob/main/rl_agent_config.json) · [多语配置](https://huggingface.co/convaiinnovations/laya/blob/main/multilingual/rl_agent_config.json) · [typed-decisions 配置](https://huggingface.co/convaiinnovations/laya/blob/main/typed-decisions/rl_agent_config.json)

### 1.2 Router 在模型外选择 checkpoint

三份 checkpoint 由 Python 层的 `Router` 调度，默认自动路径主要在英文与多语模型间选择；typed-decisions 需要显式任务选择或启用自动任务识别。它不是 encoder 内部的稀疏专家门控，也不能靠一次路由自动赋予模型新的领域能力。路由选择、模型热加载和实际推理应分别记录，以免将冷启动耗时或语言判断错误归到同一个模型延迟数字里。[Router 的选择边界与模型映射](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/router.py#L21-L59)

## 2 输入如何变成模型看到的序列

### 2.1 三种问题共用有限候选项接口

| 类型 | 输入含义 | 底层候选项 | 原始 API 的主要输出 |
| --- | --- | --- | --- |
| `choice` | 在若干类别中选一项 | 标签及描述 | argmax 标签与完整分布 |
| `score` | 在有序等级上评分 | `level 0` 到 `level K−1` 的描述 | 等级索引的概率加权期望 |
| `noul` | 判断命题是否成立 | 固定语义顺序 `[false, true]` | `P(true)` |

`noul` 的展示标签可以自定义，但其返回值始终是 true 分支的概率。`score` 的原始返回值可能是 1.7，因为它计算的是期望值，而非必然返回某个整数等级。[候选项渲染](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L106-L132) · [结果解码](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1049-L1086)

例如，一道客服路由问题可以定义为：

```python
questions = {
    "route": {
        "type": "choice",
        "instructions": "根据用户消息选择处理团队",
        "criteria": {
            "billing": "付款、退款或账单问题",
            "support": "登录、故障或使用问题",
            "other": "上述团队都不适用"
        }
    }
}
```

这只是接口示例，不代表已经运行的模型结果。`other` 是调用者明确提供的一个类别；模型并不会凭空增加一个“候选项均不适用”的结果。

### 2.2 精确的拼接顺序

`build_sequence` 构造的结构是：

```text
[CLS] <type> question: <instructions> [SEP]
[MASK] <option 0> [MASK] <option 1> ... [SEP]
<state> [SEP]
```

字符串 state 直接使用；字典或列表会序列化为 JSON 文本。候选描述中也可以有结构化值，但进入 encoder 的最终形式仍然是 token 序列。代码会清理输入中与特殊 MASK token 相同的文本，防止其被当成真实的候选标记。[状态序列化](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L74-L89) · [完整序列构造](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L135-L208)

这里有两个容易混淆的“head”：`head_max_len` 指输入前部的问题与选项预算；模型中的 `self.head` 指额外的 Transformer 层。前者控制能看到多少描述，后者负责神经网络计算。

### 2.3 候选项越多 描述不一定越完整

源码先将每个候选文本限制到最多 48 tokens，再视 `head_max_len` 的剩余空间进一步缩短。预算紧张时，候选项含 MASK 在内的保留长度大致由以下表达式控制：

```python
per = max(4, (head_max_len - 16) // number_of_options)
```

随后问题文字也会裁剪，state 只能使用整个 `max_len` 中剩余的空间。由于存在最小保留长度和最终总长度裁剪，`head_max_len` 不应被理解为绝对无溢出的硬边界。如果某些候选 MASK 已经放不进最终序列，`Agent` 会直接报错；如果候选描述只是被截得彼此相同，调用仍可能成功，`usage.options` 会报告可区分候选数等诊断信息。[预算实现](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L169-L208) · [marker 完整性检查](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L884-L907) · [usage 诊断](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1220-L1248)

普通文本默认保留 state 的开头；按时间排列的对话列表则保留末尾，以降低丢失最新消息的风险。实际丢了多少内容，应查看 `usage.truncated`、`state_tokens_dropped` 与 `truncated_questions`，而不是用字符数猜测。[输入方向处理](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L859-L887)

## 3 双向编码器与决策头实际算了什么

设拼接后的序列长度为 L，encoder 隐藏维度为 d，候选项数量为 K。主要步骤如下：

1. encoder 输出每个 token 的隐藏表示，形状为 `[batch, L, d]`
2. 根据 `choice / score / noul` 加上一个类型 embedding
3. 让整条序列经过可配置层数的 Transformer head，默认两层
4. 按 `marker_pos` 收集 K 个候选 MASK 位置的表示
5. 用共享的 `LayerNorm → Linear → GELU → Linear(1)` scorer 生成 K 个 logits
6. 将 batch padding 对应的无效候选设为 −10000，然后在有效候选上归一化

这意味着不同候选共享评分函数，类别并不是固定在模型最后一层的 K 个命名神经元上。候选描述参与输入，模型才能在调用时接收新的标签集合。但“标签集合可变”只说明接口和结构具有这种能力，不能推出对任意新任务都有良好的零样本准确率。[前向计算](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L321-L370)

### 3.1 还有一个独立的 action head

模型另将首位置表示，与最高概率、前两名概率差、归一化熵、候选数等四个特征拼接，送入 `act_head`。API 会返回 `action.act_probability`。这条路径和候选项 scorer 不同，不能把它直接当作已经验证的正确率、拒答概率或业务授权。

尤其是本文检查的单设备微调脚本接收 `logits, _act` 后只使用 logits 计算 loss，没有为 action 输出添加训练目标。共享 encoder 的更新仍可能改变 action 输出，因此，存在该 head 与该 head 在具体微调后保持可靠，必须分别验证。[action head](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L372-L389) · [微调中未使用 action 输出](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L263-L295)

## 4 单次前向到底节省了什么

Laya 的“一次 forward 回答多个问题”主要指并行 batching。对于同一个 state 的多个问题，`_encode_state` 会先将 state 分词一次，然后逐问题拼接各自的完整序列。`predict_batch` 再把这些 question rows 合并成张量，调用 `_forward`。

所以，两道问题共享的是原始 state 的分词结果，通常并不共享 encoder 计算出的 state 隐藏表示。问题和候选项不同，每一行都需要经过 encoder。批量调用减少 Python 调度开销、提升设备利用率，也避免自回归逐 token 解码，但问题数量增加仍会增加计算量和显存占用。[逐问题编码](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L859-L907) · [batch 与 forward](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1200-L1225)

同样，`batch_size` 会把输入拆成多个 forward；长文窗口方法还会执行多个窗口的计算。因此，不能把一次 Python API 调用、一批 question rows 和一次神经网络 forward 混为一谈。33 ms 一类数字需要同时说明硬件、checkpoint、问题数量、输入长度、精度、是否预热及是否计入加载时间。

## 5 类型化输出如何获得结构保证

### 5.1 结构由程序投影而来

`structured.py` 将 JSON Schema 或 Pydantic schema 转成有限候选项问题，再将模型结果映射回原始值。当前支持的是明确的子集：枚举、布尔值和有限整数等级。自由字符串、数组、嵌套对象和递归引用会被拒绝。

schema wrapper 的上限是 32 个字段、每个枚举 32 个选项、每个 score 10 个等级。它们属于该封装层的约束，不能据此断言原始 `predict` 接口只有 32 个候选项。[支持范围与上限](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py#L1-L27) · [schema 校验](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py#L97-L203)

有一个值得注意的语义差别：原始 `score` API 返回期望等级，而 schema 中的有界整数输出优先选择概率最高的等级，再加上 `minimum`。因此，同一概率分布在两个接口中可以分别产生小数期望和整数众数，它们并不矛盾。[schema 结果投影](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py#L217-L244)

### 5.2 结构合法不等于业务正确

有限候选项可以保证选择结果来自给定集合，程序可以保证布尔值是布尔值。这些约束无法保证：

- 候选集合包含真正正确的答案
- 描述足够清楚，且截断后仍能区分
- 模型看到了相关证据并正确理解否定、时间和指代
- 多个独立字段满足业务层面的相互约束
- 分布中的 0.95 对应真实世界约 95% 的正确率

例如，`approved=true` 与 `needs_review=true` 都可能是合法布尔字段，但某个业务流程可能禁止这种组合。当前 schema 转换按字段生成问题，不会自动替业务系统完成联合一致性证明。应用仍然需要显式约束检查、异常分支和人工或更强模型的回退路径。

“没有自由文本生成”准确描述了输出机制；把它推广为“没有错误判断”或“没有幻觉”会越过源码所能提供的保证。

## 6 公开训练脚本究竟优化什么

### 6.1 监督信号是分布

`finetune_single_device.py` 读取每条样本的 `state / questions / gold`。每个问题的 `gold.probabilities` 被排列为候选项概率向量，并归一化为 target。脚本还生成一个 argmax label，但实际 loss 使用的是完整 target 分布。[训练样本构造](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L41-L87)

如果 target 来自教师模型，这是一种以教师分布为监督信号的训练。教师的偏差、误标和概率失真都会影响学生；使用 proper scoring rule 不会自动把教师分布变成客观事实。

### 6.2 奖励函数由三部分组成

令 q 为模型候选分布，t 为目标分布。`proper_reward` 实际计算：

```text
reward = Σ t_i log(q_i)
       + w_sph × (Σ t_i q_i) / ||q||₂
       − I[question_type = score] × w_rps × RPS(q, t)

RPS(q, t) = Σ (CDF(q)_i − CDF(t)_i)² / (K − 1)
```

RPS 使用有序等级的累积概率差，因此只施加于 `score`。实现还包含概率下限、log-score 下限与 padding mask 等数值处理。函数默认 `w_sph=0.5`，但单设备微调调用传入的是 `0.75`，`w_rps=1.0`。[奖励函数](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L450-L476) · [实际调用参数](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L277-L287)

从源码看，这不是直接把 Brier score 当作总 loss。Brier 在研究评测中出现，而此处奖励里的平方项是有序分布的 RPS，两者的定义和用途不同。

### 6.3 loss 是策略梯度项加软交叉熵

每个训练样本生成四组经过中心化处理的高斯 logit 扰动。噪声标准差随 epoch 从 0.4 下降到 0.1；在扰动分布上计算 reward，再减去组内均值并做标准差归一化，得到 advantage。最终 loss 可概括为：

```text
loss = − mean(advantage × noisy-logit log-probability)
       − mean(Σ target_i × log softmax(logits)_i)
```

第二项是全权重的 soft cross-entropy。第一项是对带噪 logit 分布的策略梯度式更新。这里的采样对象是决策 logits，并不是生成文本、工具轨迹或思维链。把它笼统称为“只有强化学习”会漏掉监督项；把它称为“仅仅交叉熵分类”也会漏掉实际的扰动奖励更新。[完整训练核心](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L253-L308)

encoder 与 head 均进入 AdamW，学习率分别是 `2.5e-5` 和 `1e-4`，并使用 cosine schedule。单设备脚本的 micro-batch 为 8；不能把双 T4 notebook 的有效 batch 64 原样套到这里。[优化器配置](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L223-L245)

### 6.4 可以确认的范围到哪里

以上直接确认的是公开单设备微调路径。它默认从已有 multilingual checkpoint 加载配置和完整权重，再做任务适配；它没有给出三个发行 checkpoint 从原始 encoder 开始的全部数据、训练顺序、消融实验和完整训练日志。

`common.py` 还存在 `td_lambda_targets`，测试也覆盖了多步目标传播。但这个单设备脚本没有调用它，因此不能因为仓库存在 TD(λ) helper，就宣称本文分析的每次微调都训练了多轮交互策略。[checkpoint 加载](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L187-L221) · [TD helper](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L479-L494)

## 7 三个概率字段需要分开理解

| 字段 | 实际含义 | 不能直接推导什么 |
| --- | --- | --- |
| `probabilities` | softmax 后的候选分布 | 分布一定符合真实频率 |
| `answer_confidence` | 最高候选概率 `max(p)` | 无条件等同于实际正确率 |
| `confidence` | choice/score 使用 `1 − H(p)/log(K)`；noul 使用 `max(p)` | 三种类型下完全相同的统计量 |

源码保留旧 `confidence` 语义，同时增加统一命名的 `answer_confidence`。例如，对 `[0.9, 0.1]`，最高概率是 0.9，而归一化熵置信度约为 0.531。将两者都与 0.8 比较，会得到不同筛选结果。[数学定义](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L510-L540) · [各类型赋值](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1041-L1086)

`answer_confidence` 是更合适的 top-label 校准统计量，但它仍受候选集合影响。增加候选项会改变 softmax 分母，也可能改变 encoder 对原问题的表示。源码个别注释将它描述为对选项数量不变，这不是应当依赖的数学保证；README 也明确要求在工作负载实际使用的候选数量上重新验证阈值。[候选数量提醒](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md#L580-L585)

对于原始 `score` 输出还要多做一步区分：`answer_confidence=max(p)` 描述最高概率的离散等级，原始 `score` 却是分布期望。它不是“期望值恰好正确”的概率，也不表达分数的完整不确定区间。

## 8 温度校准的三条实现路径

共同公式是 `p = softmax(z / T)`，正温度 T 大于 1 时通常让分布变平，小于 1 时使分布变尖。只要候选 logits 不变且 T 为正，单个问题的 argmax 就不会改变。因此，温度调整通常不修复分类答案，只调整概率分布、阈值通过率，以及依赖概率期望的 score 数值。

### 8.1 当前通用校准模块

`laya/calibrate.py` 在 CPU 上接收原始 logits 与 target，优化 `log(T)`，使用 LBFGS 最小化 soft-target NLL。它不是直接优化 ECE，也不是直接把 `max(p)` 拟合到正确率。[拟合目标](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py#L71-L99)

当前规则为：

- 每个 question type 可有一个总体温度，拟合门槛为 10 条记录
- 按 question type 和候选数量区间建立 bucket：`2`、`3-5`、`6-10`、`11+`
- bucket 至少有 2000 条拟合记录才独立拟合，否则回退到 type 温度
- 拟合后的 T 与加载时的 T 都钳位至 `[0.5, 5.0]`，非有限数回退为 1.0
- 推理优先使用 bucket 温度，再回退到 type 温度；语言级覆盖存在时会进一步覆盖这套查找

这些数量限制是当前工程实现的规则，并不是达到统计可靠性的充分条件。[bucket 与 clamp](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L543-L564) · [样本门槛](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py#L35-L43) · [温度查找](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L1024-L1036)

默认 `compute_ece=False` 会用全部传入记录拟合，不生成效果报告。设为 true 后，模块按 bucket 随机保留约 20% 记录用于 ECE；若这样会让拟合侧不足 2000 条，该 bucket 全部记录留在拟合侧，并从评估中排除。

因此，必须一起检查 `n_eval` 和 `buckets_excluded_from_eval`。小规模数据可能得到温度，却没有有效 held-out ECE；所有 bucket 都被排除时，空评估的 ECE 为 NaN。该拆分也不自动知道原始样本曾否参与神经网络训练，调用者仍要保证输入校准数据与模型训练数据的关系正确。[split 与报告](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py#L157-L255) · [空集 ECE](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/common.py#L497-L507)

### 8.2 单设备微调脚本的校准

微调脚本先将问题展开成 items，再随机取 `min(400, N // 10)` 个 items 作为 calibration slice，剩余 items 才训练。训练结束后，每种问题类型拟合一个温度；这一旧 fitter 的 clamp 为 `[0.1, 10.0]`，与当前运行时的 `[0.5, 5.0]` 不同。某种类型不足 10 条时返回 1.0，完全没有校准项的类型保留初始 1.2。[拆分](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L223-L231) · [旧 fitter](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L134-L158) · [训练后校准与保存](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/finetune_single_device.py#L318-L348)

这带来三个具体边界：

1. 校准按问题 item 拆分，并没有按原始 case、用户或会话分组；同一个 state 的不同问题可能分到训练与校准两侧
2. 校准 slice 用于拟合 T，本身不等于验证 T 的最终测试集
3. 若保存温度超出 `[0.5, 5.0]`，当前 Agent 加载时还会再次钳位，所以离线拟合值可能不是最终服务值

保存时删除继承的 `temperature_by_options` 是正确且重要的：旧 bucket 温度优先级更高，如果不删除，它们会覆盖刚拟合的 type 温度。[加载时再钳位](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L499-L534)

**脚本修复也不等于旧 checkpoint 已经修复。** 读取当日的 typed-decisions Hub 配置仍同时保留约 `[1.015, 1.037, 1.058]` 的 type 温度与继承的 bucket 温度，其中 `choice:11+` 约为 0.1006。运行时查找会优先取 bucket，并将这个值钳位到 0.5。该模型卡还指出，已发布 checkpoint 当时在训练数据切片上拟合温度；后来的 notebook 改为训练前留出，并不会追溯性地让旧权重获得独立验证。多语配置则是 `[1,1,1]` 且没有 bucket 温度。因而，使用者应对自己实际加载的 checkpoint 重新校准和验证，而不是只检查仓库是否存在修复后的训练代码。[typed-decisions 配置](https://huggingface.co/convaiinnovations/laya/blob/main/typed-decisions/rl_agent_config.json) · [typed-decisions 模型卡](https://huggingface.co/convaiinnovations/laya-typed-decisions) · [多语配置](https://huggingface.co/convaiinnovations/laya/blob/main/multilingual/rl_agent_config.json)

### 8.3 历史 benchmark 的 calibration repair

仓库报告 `laya` 平均 ECE 从 0.466 到 0.081，多语版本从 0.314 到 0.106。产生这组历史结果的 notebook generator 使用另一条路径：每个 suite 的记录按顺序对半分，前半拟合、后半评估；每个 bucket 至少 25 条；通过 `[0.2, 10.0]` 区间上的网格搜索优化 hard-label NLL，最后对各 suite 的 ECE 取算术平均。

这是一组可追溯的项目实验，不能当成当前 `fit_temperature_map` 在任意业务数据上的性能承诺。它既不是当前 20% 随机分层 holdout，也不是当前 `[0.5,5]` 的运行时边界；顺序切分还可能受原始数据排序影响。[历史拟合器](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/build_benchmark_nb.py#L278-L292) · [对半拆分与平均方法](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/build_benchmark_nb.py#L681-L731) · [公布结果](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/BENCHMARKS.md#L202-L209)

## 9 拒答只是策略入口

`min_confidence` 的底层行为是保留原始答案，并在低于阈值时添加 `low_confidence=True`。结构化投影看到该标记后，将对应字段设为 `None`。它不会自动请求人工审核，也不会自动调用另一个模型。[低置信度标记](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/confidence.py#L38-L81) · [None 投影](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/structured.py#L217-L240)

门控优先读取 `answer_confidence`；为兼容旧返回结构，在其缺失时可能回退到旧 `confidence`。与之不同，`answer_confidence_value` 本身不会把熵置信度冒充为最高概率。接入异构 runner 时，应该验证返回字段是否完整，避免同一阈值悄悄比较不同量。

阈值还应由风险与覆盖率共同决定。例如，某类决策可以接受自动处理 60% 的请求，但要求这部分请求的错误率低于某个上限。此时需要评估 accuracy-at-coverage、风险覆盖曲线以及高置信错误，而不是看总体平均 confidence 是否好看。项目研究 harness 已计算部分 coverage 指标，但最终阈值仍需要用目标业务的独立数据选择。[研究指标实现](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/build_benchmark_nb.py#L256-L276)

## 10 评测工具测到了什么 又漏掉了什么

### 10.1 单元测试不等于模型质量报告

`tests/test_training.py` 不加载模型权重，主要检查奖励函数、有限网格上的目标分布最优性、TD helper、ECE、归一化熵、batch padding 和序列标记等行为。它能发现实现错误，但不能证明训练后的模型已经校准，也不能证明跨语言、跨场景可靠。

“严格 proper”的理论性质讨论的是期望得分和真实目标分布；具体实现还有 clipping、有限数据与优化误差。几组合成样本上的单元测试既不是一般性数学证明，也不是生产流量上的可靠性证据。[训练测试](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/tests/test_training.py#L1-L132) · [校准拆分测试](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/tests/test_calibrate.py#L171-L209)

### 10.2 各评测入口的指标不完全相同

当前通用 `laya.evals` 默认评估 choice accuracy、noul accuracy、score MAE 和 mean confidence。聚合 ECE 只对具有离散 correctness 的 choice 与 noul 记录计算；score 并不会自动进入同一正确率 ECE。对于缺少 `answer_confidence` 的旧结果，评测器也存在回退到 `confidence` 的兼容路径。[默认 evaluator](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/evals.py#L253-L344) · [聚合逻辑](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/evals.py#L481-L494)

而通用温度校准模块的 ECE 报告先把 soft target 做 argmax，再比较预测 argmax。这衡量的是 top-label correctness，不能完整刻画 soft target 分布拟合质量。研究 benchmark 另外计算 Brier、NLL、soft-target 距离等指标，比较数字时要先确认使用的是哪条入口、哪种 target 和何种归一化约定。[校准报告的 hardening](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/calibrate.py#L128-L143) · [hard-label Brier 与 NLL](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/scripts/build_benchmark_nb.py#L256-L276)

ECE 本身采用 15 个等宽 bins。一个总体 ECE 很低，也可能掩盖某种语言、长文本或少数类别中的严重失准；NLL 改善也不保证每个子群的 ECE 都下降。

### 10.3 公开数字需要带着 provenance 阅读

有几条限制是仓库自己明确记录的：

- typed-decisions 的 0.766 属于经过该 benchmark 训练集微调的 checkpoint；截至审计提交，该行及分工作流成绩尚没有已提交的原始结果文件支撑
- 两个 base checkpoint 在同一 benchmark 的约 0.362 与 0.352 低于 0.461 的 majority baseline，不能把专门微调后的能力当成基础模型零样本能力
- 多语 51-language sweep 的旧结果无法在后续复核中完整重现，当前表改用复跑结果，并保存了环境与旧值
- 历史概率指标有 clamp 之前和之后两个版本；正温度缩放不改变分类 argmax，却会显著改变 ECE 与置信度

这类主动保留的实验边界很有价值。阅读者应沿结果文件、脚本、模型 revision 和环境逐层核对，而不是只抄 README 的最佳数字。[typed-decisions 证据边界](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/BENCHMARKS.md#L168-L187) · [复现与温度版本说明](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/BENCHMARKS.md#L13-L35)

此外，独立 MASSIVE harness 的候选构造明确包含 gold label，再从其他标签中采样干扰项。因此，它测量的是给定候选集合中的判别能力，不能直接代表开放集路由，也没有覆盖“正确标签根本不在候选集合中”的情况。[MASSIVE 构造约定](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/research/eval/laya_eval.py#L1-L23)

## 11 部署与复现中不能省掉的版本信息

代码版本和权重版本是两条独立轴。GitHub 的提交 SHA 固定的是实现，Hugging Face 的 model revision 固定的才是配置、tokenizer 与权重。校准文件还需要匹配模型、候选描述和数据分布。

`Agent` 对存在的本地目录直接加载；对 Hub 标识则通过 `snapshot_download` 获取 config、safetensors、tokenizer 和 encoder 文件。因此，Laya 可以本地部署，但首次模型获取并不天然离线。隔离网络运行需要先准备好完整模型目录、依赖及正确配置，并验证代码没有意外进入远程下载路径。[本地与远程加载](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/laya/agent.py#L390-L419)

项目代码仓库声明 Apache 2.0；读取当日的三个官方模型卡也均标注 `apache-2.0`。部署时仍应分别核查所选权重、基础模型和数据集的实际许可条件与附带义务；代码仓库的许可证不会自动代替所有外部资产的许可证。本文记录了这些公开声明，并未完成每一项权重和训练数据的许可审计。[仓库许可声明](https://github.com/NandhaKishorM/laya/blob/6d942c92081fbc139e736bbd9ac0023223c29b7f/README.md#L1434-L1436) · [英文模型卡](https://huggingface.co/convaiinnovations/laya) · [多语模型卡](https://huggingface.co/convaiinnovations/laya-multilingual) · [typed-decisions 模型卡](https://huggingface.co/convaiinnovations/laya-typed-decisions)

一份可复核的上线记录至少应包含：

1. Laya commit、包版本、模型 revision 与配置摘要
2. tokenizer、encoder、推理 backend、精度与硬件
3. 问题文字、候选描述、顺序、数量和序列预算
4. 训练、校准、阈值选择和最终测试的数据划分方式
5. 实际生效的温度，而非仅保存文件里的原始温度
6. 逐案例预测、截断诊断、错误类型和覆盖率指标

## 12 怎样验证它是否适合一个真实任务

针对有限类别、明确等级或二元判断，可以从以下顺序开始：

1. **确认任务定义。** 候选集合是否完整，是否需要“其他”“证据不足”或独立回退机制；等级顺序是否有真实语义
2. **检查可见输入。** 记录截断、候选描述碰撞、问题长度、语言和证据位置，不把模型没看到的内容算作模型已理解
3. **建立分组留出集。** 按用户、会话、文档来源或时间分组，防止同一来源的相关 items 横跨训练与验证
4. **先看错误再选阈值。** 同时报告准确率、NLL/Brier、校准、risk-coverage 和高置信错误，分语言与候选数量检查
5. **做语义保持与语义改变测试。** 候选顺序互换、同义改写、证据前后移动、加入无关文本，以及否定或关键数字改变，都应该有不同的预期
6. **验证完整应用流程。** 低置信字段为 None 后谁接手，多字段冲突怎样处理，超时或加载失败怎样回退

源码展示了一个清晰、可调整的工程方向：把语言表示能力集中用于有限决策，而让程序负责输出结构和流程接口。真正的价值要由目标任务中的准确率、风险覆盖率、延迟与维护成本共同确认。读懂 scorer 解释了它如何选择；读懂校准、截断和评测边界，才知道什么时候可以信任这次选择。
