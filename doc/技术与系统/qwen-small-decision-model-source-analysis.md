---
title: 从 Qwen 0.5B 到 Jev-like 决策模型的源码拆解
date: 2026-09-30
updated: 2026-09-30
category: 技术与系统
tags:
  - Qwen
  - Jev
  - 决策模型
  - LoRA
  - 模型校准
  - 源码分析
summary: 沿着 train-your-first-jev 的真实代码，拆解 Qwen2.5-0.5B 如何通过 LoRA、候选编码与注意力评分头变成选择模型，并核对训练、数据划分、温度校准和作者实验的证据边界。
---

# 从 Qwen 0.5B 到 Jev-like 决策模型的源码拆解

让一个语言模型从几个候选动作里选出一个，未必需要先让它生成一段回答。

可以保留模型对文本的表示能力，再训练一个直接给候选项打分的结构。输入是上下文和候选列表，输出是每个候选的分数，最后由程序选出最高分。

[`cexll/train-your-first-jev`](https://github.com/cexll/train-your-first-jev) 就把这条路线做成了一套可读源码的课程：Qwen 提供文本表示，LoRA 调整表示，一个小型注意力评分头完成选择，再用独立数据校准概率。

先给出本文的判断：它适合用来理解和验证小模型决策模块的工程闭环。源码能够解释它怎样训练、怎样选择、怎样报告概率；公开证据还不足以证明它可以直接承担真实业务中的可靠决策，更不能据此推导出它复现了官方 Jev。

## 阅读范围和版本

本文审阅的是仓库提交 [`07e4f7c61b2f0bbe3774586c0490176953c0f70c`](https://github.com/cexll/train-your-first-jev/commit/07e4f7c61b2f0bbe3774586c0490176953c0f70c)，提交日期为 2026 年 9 月 21 日。源码核对日期为 2026 年 9 月 30 日。

需要先纠正一个容易混淆的名字：项目使用的是 **Qwen2.5-0.5B**。`2.5` 是模型系列名，`0.5B` 才是参数规模。Qwen 官方模型卡给出的实际规模约为 0.49B，即约 4.9 亿参数。[Qwen 模型卡](https://huggingface.co/Qwen/Qwen2.5-0.5B/blob/060db6499f32faf8b98477b0a26969ef7d8b9987/README.md)

课程固定了基座和 tokenizer 的 revision：

```text
Qwen/Qwen2.5-0.5B
060db6499f32faf8b98477b0a26969ef7d8b9987
```

本文区分三类信息：代码直接证明的实现、作者自行报告的运行成绩，以及根据结构推导的限制。本次没有下载模型权重、重跑训练或调用商业模型 API，因此不把作者的成绩写成独立复现结果。

## 项目实际由哪些部分组成

仓库里有两条学习路线，阅读时要分开。

一条是 `tiny`：学习 UTF-8 字节嵌入，用合成的徽章匹配任务演示训练和校准。它便于在 CPU 上理解流程。

另一条是 `lora`：加载预训练 Qwen，在真实英文 CommonsenseQA 题目上训练 LoRA 和评分头。本文重点分析这一条。

另外还有 `hf` 模式：同样加载预训练模型，但完全冻结它，只训练评分头。这个模式可以用于观察“调整文本表示”究竟带来了多少收益。

| 模式 | 文本表示来自哪里 | 训练哪些参数 | 适合观察什么 |
|---|---|---|---|
| `tiny` | 从头学习的字节嵌入 | 嵌入、上下文位置嵌入和评分头 | 训练与评估流程是否能跑通 |
| `hf` | 冻结的预训练模型 | 评分头 | 固定表示能否支持选择任务 |
| `lora` | 预训练模型加 LoRA | LoRA 和评分头 | 小规模适配能否改善选择能力 |

三种模式最终进入同一个 `AttentionHead`。它们的差别主要在于，送进评分头之前，文本被变成了什么样的向量。[模式构建与模型实现](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L47-L180)

来源也需要讲清楚。课程把 `vinnylarouge/jevlike` 的固定版本放进了 `vendor/jevlike`，再增加 LoRA、校准、数据检查和可复查的流水线。`PROVENANCE.md` 声明的上游版本是 `94f5fd1b0b11d52bbdfdf4e0ee6aa96b568f8452`，许可证为 MIT。

作者还说明 LoRA 加评分头的扩展参考了 `kev` 的一般思路，但仍保留 jevlike 的 pooled-option 结构，没有改成 kev 的联合 pointer-token 结构。这是实现谱系的说明，不能被扩写成模型等价或训练方法等价。[来源与修改记录](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/PROVENANCE.md)

## 输入输出怎样定义决策任务

训练样本的核心结构很简单：

```json
{
  "context": "用户收到了损坏的商品，希望退回并退款。",
  "options": ["处理退款退货", "推荐更多商品", "排查登录问题"],
  "label": 0
}
```

这是本文构造的格式示例，不是模型实测用例。`label` 是正确候选从零开始的索引。

模型需要学习的对象可以写成：

```text
输入：上下文 x，候选 a₁ … aₙ
输出：每个候选的分数 z₁ … zₙ
概率：pᵢ = exp(zᵢ / T) / Σⱼ exp(zⱼ / T)
选择：argmaxᵢ pᵢ
```

这使输出空间在进入模型前就由调用方确定了。预测函数最后返回的是原始候选字符串，不需要生成一个工具名，再猜它是否与系统里的工具对应。

这里有两个直接结果。

第一，候选数量可以变化。评分头对每个候选应用相同的计算，并不需要为每一种业务标签永久保留一个固定输出神经元。

第二，输入一个新候选在接口上是允许的，但“能接收新候选”和“能正确理解新业务”是两件需要分别验证的事。候选描述、业务规则和训练分布发生变化后，仍然需要评估。

课程包装层会拒绝空上下文、空选项、重复选项以及越界标签等输入。特别是 Python 中布尔值属于整数的子类，课程层显式拒绝把 `true` 当作标签 1。这些检查提高了数据卫生，但不会判断业务标签本身是否正确。[数据检查](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/dataset.py#L24-L64)、[预测输出](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/calibration.py#L255-L290)

## 上下文和候选怎样进入 Qwen

### 分开编码

`HuggingFaceCollator` 分别 tokenize 上下文和所有候选。它没有把题目、A/B/C 标签以及候选列表拼成一个长 prompt，也没有在这里套聊天模板。

设批大小为 B，最长上下文为 L 个 token，一题最多 N 个候选，每个候选最多 M 个 token，隐藏维度为 D，则批数据的大致形状是：

```text
context_ids        [B, L]
context_mask       [B, L]
option_ids         [B, N, M]
option_token_mask  [B, N, M]
option_mask        [B, N]
```

token mask 排除文本 padding；option mask 排除为了对齐不同候选数量而添加的空候选槽位。这两层 mask 解决的问题不同。[分词与批构建](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/data.py#L67-L114)

### 同一个模型调用两次

`FrozenTransformerScorer.forward()` 的主路径非常清楚：

```text
上下文 [B, L]
  → Qwen
  → 上下文 token 表示 [B, L, D]

候选 [B, N, M]
  → 展平为 [B×N, M]
  → 同一个 Qwen
  → 候选 token 表示 [B×N, M, D]
  → masked mean pooling
  → 候选向量 [B, N, D]
```

因此，仓库所说的 one-pass 应当理解为一次非自回归的候选打分流程。**一次 scorer forward 内部，确实有两次 Transformer 调用**：一次处理上下文，一次批量处理候选。它没有逐 token 生成答案，但也没有把全部计算压成一次基座调用。[前向路径](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L118-L136)

代码使用 `AutoModel` 的 `last_hidden_state`，没有调用 `generate()`，也不拿语言模型词表中的 A/B/C token 概率作为答案。

代码虽然把这个模块称为 `encoder`，Qwen 基座本身仍是 causal decoder Transformer。把它当作文本特征提取器使用，不会自动把内部注意力改成双向编码。[Qwen 固定版本配置](https://huggingface.co/Qwen/Qwen2.5-0.5B/blob/060db6499f32faf8b98477b0a26969ef7d8b9987/config.json)

### 候选为什么需要池化

一个候选可能有一个 token，也可能有二十个。评分头需要一个固定长度向量，因此代码对有效候选 token 的隐藏状态求均值：

```text
候选向量 = 有效 token 隐藏状态之和 / 有效 token 数量
```

分母至少取 1，避免 padding 槽位出现除零。

这里需要避免一个常见误读：对 Qwen 的隐藏状态做均值池化，不等于把候选当作没有顺序的词袋。隐藏状态已经经过带位置信息和因果注意力的 Transformer，顺序可以影响它们。

`tiny` 模式则不同。它对候选直接平均字节嵌入，没有候选位置编码，也没有先经过 Transformer。在截断后的字节多重集相同的情况下，字符重新排列会得到相同候选向量。两条路线共享评分头，不代表它们具备相同的文本表示能力。[两种池化路径对照](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L47-L136)

## AttentionHead 到底怎样给一个候选打分

理解这个项目，最值得读的是只有几十行的 `AttentionHead`。

它先分别对上下文表示和候选向量做 LayerNorm，并转成 float32。随后构造三组投影：

```text
Q 来自候选向量
K 来自上下文 token
V 来自上下文 token
```

也就是说，每个候选拿着自己的 query，去上下文里寻找与自己相关的信息。

设评分头投影维度为 R，课程中 R=64，单个候选 i 的计算可以展开为：

```text
qᵢ = Wq × LN(optionᵢ)
kₜ = Wk × LN(contextₜ)
vₜ = Wv × LN(contextₜ)

αᵢₜ = softmaxₜ(qᵢ · kₜ / √R)
uᵢ  = Σₜ αᵢₜ vₜ
zᵢ  = qᵢ · uᵢ / √R
```

这是按源码写出的数学化说明，省略了批维度和 padding 细节。

第一步点积决定候选主要关注哪些上下文 token。第二步得到候选专属的上下文摘要 `uᵢ`。第三步再用同一个候选 query 与这个摘要做点积，得到最终 logit。

head 内没有额外的多层 MLP，也没有在最后接一个固定类别数的分类矩阵。三个投影都是无 bias 的线性层；两个 LayerNorm 有各自的参数。

上下文 padding 会在 attention softmax 前被屏蔽，无效候选会在输出 logit 阶段被屏蔽。这里使用的是相应浮点类型的最小有限值。[完整 AttentionHead](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L13-L44)

### 两层注意力不要混淆

Qwen 内部本来就有多层 self-attention；外面这个 `AttentionHead` 是另加的候选到上下文的注意力结构。

LoRA 修改的是 Qwen 内部的 `q_proj` 和 `v_proj`。外部评分头的 `query`、`key`、`value` 则直接作为普通可训练参数参与训练。

名称里都有 Q/K/V，但它们属于不同层次。

### 候选之间没有显式交互

从这段计算可以进一步推导出一个很重要的限制：每个 logit 主要由“上下文 + 当前候选”决定。其他候选不会进入这个候选的编码过程，也不会在评分头里与它做 attention。

候选之间的竞争发生在最后的 softmax 分母中。

在上下文、模型和温度保持相同、忽略浮点误差时，两个已有候选的相对概率满足：

```text
pᵢ / pⱼ = exp((zᵢ - zⱼ) / T)
```

添加第三个候选会改变归一化后的概率，但不会直接改变这两个候选的 logit 差。

这有利于处理可变菜单，也带来了边界：像“以上全部”“选择第二长的选项”这样依赖整组候选关系的任务，不能指望这个结构自动获得对菜单的联合理解。除非调用方把相关菜单信息另外放入上下文，否则模型没有相应的信息通道。

这段是根据前向图的结构推论，并非作者提供的额外实验结论。

## LoRA 改了哪里

模型先加载 Qwen，再把基座参数的 `requires_grad` 全部设为 `False`。

如果选择 `hf` 路线，每次前向都强制让基座处于 eval 模式，并放进 `torch.no_grad()`。因此即使外层训练循环调用 `model.train()`，这个分支也仍然把基座当固定特征提取器。

如果选择 `lora` 路线，则由 PEFT 向基座注入适配器：

| 配置 | 课程使用值 |
|---|---|
| 目标模块 | `q_proj`、`v_proj` |
| LoRA rank | 16 |
| LoRA alpha | 32 |
| LoRA dropout | 0 |
| LoRA bias 配置 | `none`，基座 bias 保持冻结 |
| task type | `FEATURE_EXTRACTION` |

LoRA 可以概念化为在已有线性映射上增加一个低秩增量：

```text
W_eff = W_base + (α / r) × B × A
```

基座 `W_base` 保持不变，训练的是增量矩阵 A、B。这里 α/r=2。

适配器路线不能再把整个 encoder 放进 `no_grad()`，否则 LoRA 也收不到梯度。因此代码保留正常的自动求导，让训练信号经过 Qwen 的计算图回传到适配器，同时冻结原始权重。

这也是为什么“只训练很少的参数”不等于“训练时不需要基座的计算与内存”。前向仍然经过整个 Qwen，LoRA 路线还需要支持反向传播。[冻结逻辑与 LoRA 注入](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L67-L116)

上下文和候选共享同一套 Qwen 与 LoRA 参数。一次选择损失会同时推动这两条表示路径适配任务，随后由评分头学习它们如何匹配。

## 训练目标和实际配方

训练损失就是候选维度上的交叉熵：

```text
L = -log softmax(z)[正确候选索引]
```

它学习在给定菜单中提高正确候选的相对分数。这里没有 next-token 训练目标，没有让模型生成推理过程，也没有强化学习或在线奖励优化。[训练循环](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/train.py#L70-L131)

课程默认配方与底层 `train.py` 的通用默认参数不完全相同。若只摘录 argparse 的默认值，就会误写这次 Qwen 实验。

| 项目 | 交互式 Qwen 课程配方 |
|---|---|
| 基座 | 固定 revision 的 Qwen2.5-0.5B |
| epoch | 3 |
| 训练 batch size | 4 |
| 评估与校准 batch size | 8 |
| context 上限 | 128 个 tokenizer token |
| option 上限 | 32 个 tokenizer token |
| head 投影维度 | 64 |
| LoRA rank / alpha | 16 / 32 |
| adapter 学习率配置 | 5×10⁻⁵ |
| head 学习率配置 | 5×10⁻⁴ |
| optimizer | AdamW，weight decay=10⁻⁴ |
| scheduler | OneCycleLR |
| 梯度裁剪 | 全体可训练参数的 norm 上限 1.0 |
| 训练 seed | 7 |

其中两个学习率配置进入 OneCycleLR 的 `max_lr`，应理解为调度峰值，不是训练全过程恒定的学习率。代码为 adapter 和 head 分别建立 AdamW 参数组，让随机初始化的评分头与预训练表示的低秩增量使用不同的更新尺度。

课程里的 `width=64` 主要服务于 tiny 模式。Qwen 路线的实际隐藏维度来自基座配置，不能把它误写成“Qwen 被压缩成 64 维”；64 是这里评分头的投影维度。[课程常量](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/guide.py#L66-L85)、[课程调用](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/guide.py#L988-L1024)、[优化器和调度器](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/train.py#L70-L94)

### 保留验证 NLL 最低的轮次

每一轮训练结束后，模型在 validation 上计算平均交叉熵，也就是这里记录的 NLL。只要验证 NLL 比之前低，就保存该轮可训练参数的快照。

它没有简单保存最后一轮，也没有按 test accuracy 选择 checkpoint。

快照函数里多出的 `.clone()` 是一个值得注意的工程修复：在 CPU 上，只有 `detach().cpu()` 可能仍与当前参数共享存储，后续更新就会污染所谓的最佳权重。复制后才真正冻结了那个时刻的参数值。[快照函数](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L183-L187)、[修复说明](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/PROVENANCE.md#L35-L42)

这说明很多“训练出一个模型”的可信度，最终取决于并不显眼的状态保存和数据管理细节。

## 为什么需要四份数据

项目把数据分成四种角色：

| 数据 | 用途 | 它影响什么 |
|---|---|---|
| train | 反向传播 | LoRA 和评分头参数 |
| validation | 比较 epoch | 采用哪个 checkpoint |
| calibration | 拟合温度 | 概率的整体尖锐程度 |
| test | 最终报告 | 应只用于评估 |

validation 和 calibration 都参与了某种选择，只是选择的对象不同。它们不能替代最终测试集。

真实数据来自 CommonsenseQA 官方发布中带答案的 train 和 dev 文件。官方 test 没有公开答案，项目没有拿它来打分。

随后，项目把已标注的两份文件合并，再按 `question_concept` 分组重新划分。分组顺序由 concept 的 SHA-256 排序确定，不依赖一个随机打散种子；一个概念组不会被拆到多个划分。

完整课程先通过分组配额预留 validation、calibration、test，再把没有被预留的概念组全部交给 train。固定源文件下，作者给出的配方数量是 9,792 / 512 / 256 / 256。

代码还会重读写出的文件，检查样本数量、重复题干、跨划分概念重叠，以及可用数据是否被完整覆盖。[真实数据处理说明](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/real_data.py#L1-L54)、[分组分配](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/real_data.py#L344-L396)、[完整课程划分](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/real_data.py#L622-L668)

这里的概念隔离可以减少这轮训练中的一类泄漏，但无法证明预训练 Qwen 从未见过这些公开题目，也不能保证不同概念之间没有语义相近的题。

因此，这组结果不能直接放进 CommonsenseQA 官方排行榜比较。数据来源相同，不等于评测协议相同。

还有一处实现边界：自带的真实数据准备器检查概念隔离；对用户提供的通用 JSONL，课程的普通校验主要检查精确上下文字符串不重叠。它不能自动发现同一客户、同一模板或同一文档的改写泄漏。真正接业务数据时，来源分组仍需自己建立。

底层 `jevlike.train` 有基础字段校验，但没有执行课程包装层的全部严格检查。直接跳过 `validate-data` 调训练命令，会绕开一部分保护。[包装层与底层校验对照](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/dataset.py#L24-L123)、[底层样本加载](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/data.py#L24-L43)

## 温度校准具体做了什么

模型训练结束后，每个候选已经有一个 logit。温度校准只增加一个全局标量 T：

```text
pᵢ(T) = softmax(z / T)ᵢ
```

- T 大于 1，分布通常更平缓
- T 小于 1，分布通常更尖锐
- T 等于 1，保持原始分布

这里的温度没有参与采样。项目仍然使用 argmax 选择候选。

### 搜索目标是校准集 NLL

`fit_temperature()` 在 log10 空间的 -0.7 到 0.7 之间构造 81 个温度值，即大约 0.20 到 5.01，并显式把 1.0 放入候选集合，再选 calibration NLL 最低的温度。

这是有限网格搜索，不是继续训练 Qwen，也不是寻找 ECE 最低的温度。

由于集合里始终包含 T=1，在正常数值条件下，选出的温度在这份校准集上的 NLL 不会比原始值更差。这个结论不能扩大到测试集，更不能扩大到所有指标。测试集 NLL、ECE 或 Brier 分数都可能变差。[校准搜索](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/calibration.py#L187-L225)

### 为什么校准通常不会改变准确率

一个有限的正数 T 不会改变 logits 的大小顺序：

```text
argmax(z / T) = argmax(z)
```

因此，除去极端浮点问题，温度缩放不会修正模型选错的答案。它改变的是模型对现有选择表达了多强的信心。

假设模型选错了“处理退款退货”，校准最多把这项从非常自信变成没那么自信。它不会仅凭一个全局温度，自动把答案改成另一个候选。

### 报告里分别测什么

`metrics()` 同时报告四种常见指标：

| 指标 | 衡量的问题 | 阅读时注意 |
|---|---|---|
| Accuracy | 最高分候选选对了多少 | 不反映错误时有多自信 |
| NLL | 正确答案得到了多少概率 | 对自信地选错惩罚很重 |
| Brier sum | 概率向量与 one-hot 标签的平方差 | 先对所有候选求和，再对样本平均 |
| 10-bin ECE | 各置信度区间的平均信心与准确率有多接近 | 是有限样本和分箱下的汇总指标 |

ECE 的每个样本使用最高候选概率作为置信度，按 `min(9, floor(p×10))` 分入十个等宽区间。这样 p=1 也会进入最后一箱，不会漏算。

某个箱里，代码计算平均置信度与准确率的绝对差，再按该箱样本占比加权。[指标实现](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/calibration.py#L137-L184)

ECE 低不等于准确率高，也不能保证每个类别、每种用户或每个错误代价区间都校准良好。对于只有 256 道题的报告，还应关注每个箱有多少样本、换一批数据是否稳定。代码提供 `bins_used` 和 `binned_examples`，但公开 README 没有给出足够的逐箱结果来回答这些问题。

## 作者报告的结果能支持哪些结论

以下数值全部来自作者 README；本次只核对了公开描述和实现，没有独立复跑。

| 作者报告的配置 | 留出准确率 |
|---|---:|
| 五个随机评分头中的最好结果 | 18.36% |
| 冻结基座，2,048 条训练题 | 25.39% |
| LoRA，2,048 条训练题 | 31.64% |
| LoRA，9,792 条训练题 | 47.66%，即 122/256 |
| 最后模型使用打乱的上下文 | 14.84% |

作者还报告：最终模型的测试 NLL 从 1.2568 变为 1.2476，ECE 从 0.0636 变为 0.0378；M1 Pro/MPS 上一次完整流水线的训练阶段耗时 2,686.37 秒，约 45 分钟，另一次交互式课程约 50 分钟。

README 明确承认，留出题在开发中被反复查看，可能存在预训练数据污染，原始运行产物没有进入版本控制。[作者结果与限制声明](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/README.zh-CN.md#L32-L48)

在相信这些记录准确的前提下，它们与“训练产生了学习信号、LoRA 有帮助、模型利用了上下文”是一致的。

但还不足以做严格的因果和泛化判断：

- “五个随机头里的最好结果”不是随机基线的均值和方差
- 单次配置差异不能替代多 seed 的稳定性分析
- 2,048 题到 9,792 题的改善同时包含训练数据量变化
- 反复查看同一留出集，会让它逐渐承担开发集的角色
- 当前仓库没有附上这次实验的 checkpoint、日志和逐题预测，无法从这份源码独立确认那次实验的所有细节

其中 47.66% 可以作为教学实验的进展信号。若任务要求模型独立执行高代价操作，这个准确率本身显然无法构成部署依据。

时间数字也只描述指定机器上作者记录的训练阶段，不能换算成普适训练成本、CPU/CUDA 性能或线上推理延迟。

README 的设备说明还存在更新不一致：前部写了 Qwen LoRA 的 MPS 实跑记录，后部“可复现性”仍保留 MPS 未测试的泛化表述。更稳妥的阅读方式是，以具体路线的记录为作者声明，同时不把它当作跨设备验证。[设备说明前段](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/README.zh-CN.md#L68-L72)、[可复现性说明](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/README.zh-CN.md#L234-L239)

## 两个看起来漂亮的检查应怎样理解

### 打乱上下文

`shuffle_context=True` 会把一个 batch 内的上下文表示和 mask 沿样本维度轮换一位，候选和标签保持不动。

这会破坏题目与候选的正确对应。若准确率明显下降，说明正常预测利用了上下文中的信息。

它仍然有边界：这不是全数据集的随机置换；batch size 为 1 时没有真正改变上下文；不同 batch size 会产生不同对照。因此不能把 14.84% 当作一个与 batching 无关的固定能力分数。[上下文轮换实现](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L25-L44)

### 反转候选顺序

预测检查还会把候选顺序反转，再按候选文本比较输出。

这个结构没有把“第几个选项”的位置传给评分头。候选独立编码并共享评分规则，按文本对齐后，分数应具有排列等变性；没有并列最高分时，选中的文本应保持一致。

所以，通过顺序检查主要说明结构不依赖菜单位置，并不证明已经学会了语义。一个随机初始化的同构评分器也可能通过。

并列最高分是例外：程序的 argmax 需要一个 tie-breaking 规则，反转顺序可能改变取到的文本。实现用极小 top-gap 容忍这种情形。[顺序检查](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/calibration.py#L292-L324)

## 有界输出解决了什么

这个项目最直接的工程收益，是把输出变成可由程序消费的有限候选选择。

在输入通过检查、计算正常的前提下，程序从原始候选列表取回结果，因此不需要再解析一段自由生成文本。工具路由、工单分流或候选动作排序，都可以利用这种接口形态。

但结构只能约束“选哪一个”，不会替系统保证“这个选项是否正确、是否允许、现在是否应该执行”。

### 菜单里没有正确答案

假如正确动作根本不在候选集合中，softmax 仍会把概率分配给现有候选，argmax 仍会选出一个。

当前主路径没有内置的拒绝选择机制。工程上可以加入“信息不足”“转人工”等候选，并设计相应训练数据；也可以基于专门验证的拒答策略控制执行。但仅仅多加一个候选名称，不会自然获得可靠拒答能力。

### 分布外输入

训练题是英文常识多选。中文工单、企业制度、法律条款和生产环境工具选择，都可能有完全不同的数据分布与错误代价。

把中文输入成功送进 tokenizer，只证明接口能够处理它，不能证明业务能力已经迁移。

### 概率是菜单内的概率

同一个候选，面对两个竞争者和二十个竞争者时，归一化后的概率会变化。

因此不能把它直接当成跨菜单可比较的绝对真实性评分。用作执行阈值时，需要在真实菜单生成规则和真实分布上验证。

### 文本截断

Qwen 课程只使用 128 个上下文 token 和 32 个候选 token。一个关键条件如果落在截断点之后，模型就没有看到它。基座本身支持更长上下文，不会自动改变课程传给 tokenizer 的上限。

### 执行权限

评分器会给出候选，但没有实现真实工具的身份认证、参数验证、业务权限、幂等、回滚和人工审批。这些仍属于执行系统。

它可以成为 Agent 的一个决策组件。仅凭这些源码，不能把它描述成已经具备完整 Agent 执行可靠性的产品。

## 保存和复现做得比较好的地方

`model.pt` 保存配置和可训练参数。对于 LoRA 路线，它包含适配器和评分头，不包含整份冻结基座。

重载时，系统先根据配置重建固定版本的基座，再加载保存的参数。LoRA checkpoint 要求 `hf_revision` 为 40 位十六进制提交字符串；如果可训练适配器参数缺失，不能被当作“缺少冻结权重”而静默放过。[checkpoint 加载](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py#L190-L243)

加载器使用 `weights_only=True`，并检查配置和权重映射。这降低了随意反序列化任意 Python 对象的风险，但不等于认证 checkpoint 来源，40 位 revision 格式检查也不能证明文件未被篡改。

流水线把检查、训练、评估、拟合温度和重载预测分成独立子进程，保存命令、退出码、耗时、日志摘要、文件摘要和环境信息。校准报告记录它读取的是哪一个文件；流水线核对它与 calibration 文件一致。[流水线记录](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/pipeline.py#L104-L149)、[校准和评估衔接](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/pipeline.py#L369-L426)

这些设计使一次实验有机会被完整追溯。不过“代码能够生成证据”和“这次已公开足够证据”仍有距离。目前仓库公开的是机制和作者摘要，相关运行产物并未一同版本化。

## 如果要把它接入真实业务

更合理的下一步，是把它当作一个有明确输入输出的候选选择基线，先验证最窄的任务。

### 先做三个同数据集基线

在相同业务测试集上比较：简单规则或传统分类器、冻结 Qwen 加 head、Qwen LoRA 加 head。这样才能知道复杂度增加后，收益具体来自哪里。

若还要比较生成式模型，应固定候选集合、上下文、评价标准，并记录相同硬件或服务条件下的延迟和成本。不能用本项目的训练时间推测线上优势。

### 给测试集真正独立的生命周期

按来源、实体或时间划分训练与测试，补上真实困难负例。最终测试集应在配方确定后再解封。如果看过结果又调整了模型，就需要新的最终验证。

这套代码已经提供了 train、validation、calibration、test 的骨架，业务侧需要补足的是分组语义和评测纪律。

### 单独测拒答与错误代价

加入没有正确候选、信息缺失、规则冲突以及分布外输入。记录错误自动执行的比例、转人工的比例，以及不同阈值下的风险和覆盖率。

对于高代价动作，不能仅凭一条全局 ECE 改善就降低审批要求。

### 测真实推理开销

模型需要编码每一个候选。候选数量、文本长度和 padding 都会影响计算与内存，当前源码没有提供充分的线上吞吐或延迟证据。

如果菜单长期固定，可以研究在模型处于推理模式、权重版本确定后缓存候选表示。当前前向路径每次都会重新编码候选，缓存是可探索的优化方向，不能算作项目现有能力。

### 保存一份完整证据包

除了 checkpoint，还应保存数据与来源分组、模型 revision、训练配置、温度文件、逐题预测、错误分析、环境信息，以及线上阈值如何确定。

模型能重新加载，只解决了复现的一部分。业务决策还需要解释，这个版本为什么被允许上线。

## 最后如何评价这条路线

这个项目说明了一件具体的事：可以把一个开放预训练语言模型当作表示底座，用少量适配参数和专门的评分头，训练出面向候选选择的模型。

整个流程中，模型负责学习上下文与候选的匹配，程序负责候选边界、数据验证、概率处理和结果取回。这样的职责划分使系统更容易测试，也更容易定位错误发生在哪一层。

最值得借鉴的，不只是 Qwen 加 LoRA 这个组合，还有四份数据的分工、最佳权重快照、校准集隔离和运行证据记录。

它当前的成绩适合支持“这一训练方法在这份教学任务上出现了学习信号”。要进一步支持“它能可靠处理我的业务”，还需要独立业务数据、完整实验产物、错误代价分析以及执行层保护。

读懂这些边界后，才比较容易判断：哪些决策值得交给小模型，哪些约束应该始终留在系统里。

## 主要源码入口

- [项目中文说明与作者实验报告](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/README.zh-CN.md)
- [来源与补丁说明](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/PROVENANCE.md)
- [模型与 AttentionHead](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/model.py)
- [训练循环](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/train.py)
- [tokenizer 与 batch 构建](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/vendor/jevlike/jevlike/data.py)
- [真实数据划分](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/real_data.py)
- [温度校准和预测](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/calibration.py)
- [课程配方](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/guide.py)
- [流水线与运行记录](https://github.com/cexll/train-your-first-jev/blob/07e4f7c61b2f0bbe3774586c0490176953c0f70c/src/jev_course/pipeline.py)
