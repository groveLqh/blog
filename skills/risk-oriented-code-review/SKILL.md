---
name: risk-oriented-code-review
description: Review the current diff for code that already runs but may create future risk. Use when a change looks functionally correct, but the user wants a second-layer review focused on hidden side effects, compatibility breaks, edge cases, performance, security, misleading names, insufficient tests, and future maintenance cost.
---

# Risk-Oriented Code Review

## When to use

Use this skill when the user asks for a deeper code review of the current diff, especially when:

- the code already runs
- the feature appears correct on the happy path
- the user is not just asking for syntax errors or obvious bugs
- the user wants to know whether the change may become a future pitfall

Typical trigger phrases:

- “review 当前 diff”
- “现在能跑，但以后可能会坑”
- “不要只看明显 bug”
- “帮我看有没有埋雷”
- “做一次第二层 review”

## Core review prompt

Use the following prompt as the default instruction:

```text
请 review 当前 diff。
不要只看语法和明显 bug，请重点检查：隐藏副作用、破坏兼容性、边界情况、性能风险、安全风险、命名误导、测试不足和未来维护成本。
最后按严重程度排序。
```

## Review mindset

Do not stop at “will it run?”. Continue asking:

- Will this change break existing behavior?
- Does it silently change assumptions used by other modules?
- Are there hidden side effects, global state changes, cache changes, or lifecycle changes?
- Are compatibility contracts preserved for existing callers, configs, data, APIs, or UI behavior?
- Are edge cases handled, or only the smooth path?
- Could the implementation become slow or expensive at scale?
- Does it introduce security, permission, injection, data leakage, or unsafe default risks?
- Are names, abstractions, comments, or configuration options misleading?
- Do tests cover failure paths, migration paths, boundary values, and old behavior?
- Will future maintainers understand why this change exists and what invariants must be preserved?

## Review dimensions

### 1. Hidden side effects

Check whether the diff changes behavior outside the obvious modified area:

- global state
- shared cache
- singleton instances
- environment variables
- feature flags
- async timing
- retries
- event listeners
- cleanup logic
- persistence or local storage
- telemetry or logging

Look especially for changes that are correct locally but alter another flow indirectly.

### 2. Compatibility risk

Check whether old callers, old data, old configs, or old UI flows still work:

- public API shape
- function parameters and return values
- data schema
- default values
- config naming
- command-line flags
- persisted state
- migration behavior
- browser/runtime/platform compatibility

Flag any change that requires a migration but does not include one.

### 3. Boundary cases

Look beyond the happy path:

- empty input
- null or undefined values
- duplicate data
- very large input
- slow network
- failed dependency
- permission denied
- stale state
- concurrent calls
- partial success
- retry after failure
- non-ASCII / i18n cases
- Windows/macOS/Linux path differences

### 4. Performance risk

Check whether the change is fine for small cases but risky at scale:

- repeated full scans
- nested loops over large collections
- unnecessary serialization/deserialization
- blocking I/O
- unbounded memory growth
- repeated network requests
- missing debounce/throttle/cache
- expensive work in render loops or hot paths

### 5. Security risk

Check for:

- command injection
- path traversal
- unsafe shell execution
- token or secret leakage
- over-broad permissions
- unsafe file writes/deletes
- untrusted HTML/script injection
- SSRF or unsafe URL fetches
- insecure defaults
- missing validation before privileged actions

### 6. Naming and abstraction risk

Check whether the code communicates the wrong mental model:

- names that are broader or narrower than actual behavior
- boolean flags that hide multiple modes
- abstractions that mix responsibilities
- comments that describe old behavior
- config names that imply safety but do not enforce it
- helper functions that look generic but only work in one special case

### 7. Test gaps

Do not only ask “are there tests?”. Ask what risk the tests fail to lock down:

- old behavior regression tests
- edge case tests
- failure-path tests
- migration tests
- permission/security tests
- concurrency tests
- platform-specific tests
- large-input or performance-sensitive tests

## Output format

Return the review ordered by severity.

Use this structure:

```markdown
## 总体判断

一句话说明：这个 diff 最大的风险是什么，以及是否建议直接合并。

## 按严重程度排序的问题

### P0 / Blocker

- 问题：...
- 风险：...
- 触发场景：...
- 建议修改：...
- 建议测试：...

### P1 / High

- 问题：...
- 风险：...
- 触发场景：...
- 建议修改：...
- 建议测试：...

### P2 / Medium

- 问题：...
- 风险：...
- 触发场景：...
- 建议修改：...
- 建议测试：...

### P3 / Low

- 问题：...
- 风险：...
- 触发场景：...
- 建议修改：...
- 建议测试：...

## 测试补充建议

列出最值得补的测试，不要泛泛而谈。

## 可以接受的风险

列出看起来有风险但当前可以接受的点，以及接受理由。
```

## Review rules

- Prefer concrete findings over generic advice.
- Every serious issue should include a realistic trigger scenario.
- If the diff is safe, say why it is safe and which invariants are preserved.
- Do not invent risks that are not grounded in the diff.
- When uncertain, mark it as “需要确认” and explain what evidence would confirm or dismiss it.
- Keep the review focused on future坑, not style nitpicks.
