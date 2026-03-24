# Prompt Craft — The Architecture of Elite Instructions

The craft of writing prompts that are clear, reliable, and production-grade. This is the
foundation everything else builds on. Even with perfect context engineering and agentic
architecture, bad prompts produce bad outputs.

> *See `evaluation-testing.md` for eval frameworks to test prompt quality. See `claude-ecosystem.md`
> for Claude-specific prompt patterns, extended thinking, and caching implementation.*

---

## Table of Contents
1. The Anatomy of a Production Prompt
2. Role and Persona Assignment
3. Instruction Architecture
4. Few-Shot Design
5. Chain-of-Thought and Reasoning Scaffolds
6. Output Format Specification
7. Model-Specific Behavior (Claude / GPT / Gemini)
8. The Token Efficiency Imperative
9. The "Lost in the Middle" Problem
10. Anti-Patterns — What Destroys Prompt Performance
11. Iteration Protocol
12. Prompt Complexity Ladder — When to Use What
13. Production Prompt Templates

---

## 1. The Anatomy of a Production Prompt

Every high-performing production prompt has these components in this order:

```
[ROLE / PERSONA]          ← Who the model is in this interaction
[TASK DEFINITION]         ← What it must do, precisely
[CONTEXT / CONSTRAINTS]   ← What it must know, what it must not do
[OUTPUT CONTRACT]         ← Exact format, structure, length of response
[EXAMPLES (if needed)]    ← Demonstrations of correct behavior
[USER INPUT / DYNAMIC]    ← The variable part — always goes LAST
```

**Critical**: Static instructions go at the TOP. Dynamic input goes at the BOTTOM. This enables
prompt caching (up to 90% cost reduction) and leverages recency bias for the parts that matter
most per call. See `claude-ecosystem.md` Section 4 for caching breakpoints and implementation.

### Component Budget Guide

| Component | Target Token Count | Notes |
|---|---|---|
| Role / Persona | 30-75 tokens | 1-3 sentences. Expertise + decision lens only |
| Task Definition | 50-150 tokens | The core instruction. Be explicit, not clever |
| Context / Constraints | 50-200 tokens | Hard limits, scope, uncertainty permissions |
| Output Contract | 50-150 tokens | Exact schema, format, length. Non-negotiable |
| Few-shot Examples | 100-500 tokens per example | Only if zero-shot fails. Quality > quantity |
| Dynamic Input | Variable | Always last for caching and recency bias |
| **Total Static** | **150-500 tokens** | Sweet spot. Beyond 750, performance often degrades |

### Full Production Prompt Example

```xml
<role>
You are a senior data analyst specializing in SaaS metrics. You write precise,
evidence-based analyses. When uncertain, you state your confidence level explicitly.
</role>

<task>
Analyze the following monthly metrics and produce a performance summary.
Identify the top 3 trends (positive or negative) and recommend 2 specific actions.
</task>

<constraints>
- Use only the data provided. Do not invent or assume metrics not shown.
- If a metric is missing context for proper analysis, flag it explicitly.
- All percentage changes must reference the comparison period.
</constraints>

<output_format>
Return valid JSON matching this schema:
{
  "summary": string (under 100 words),
  "trends": [
    {"trend": string, "direction": "positive"|"negative", "magnitude": string, "evidence": string}
  ] (exactly 3 items),
  "actions": [
    {"action": string, "rationale": string, "expected_impact": string}
  ] (exactly 2 items),
  "confidence": number (0.0-1.0),
  "data_gaps": [string] (list any missing data that would improve analysis)
}
Return ONLY the JSON object. No explanation, no markdown fences.
</output_format>

<metrics_data>
{{DYNAMIC_INPUT}}
</metrics_data>
```

---

## 2. Role and Persona Assignment

**When to use**: Tasks requiring a specific expertise lens, tone, or decision-making framework.
**When to skip**: Simple extraction, formatting, or classification tasks.

**What works in 2026**: Roles are less powerful than they were in 2023 as models became more
capable instruction-followers. Don't over-rely on personas. They help most for:
- Establishing a consistent voice (e.g., "You are a direct-response copywriter trained in Schwartz")
- Setting a decision framework (e.g., "You are a skeptical senior editor whose job is to find
  weaknesses in this argument")
- Constraining scope (e.g., "You are a SQL analyst. You only respond in SQL queries and brief
  explanations — never write code in other languages")

**Anti-pattern**: Elaborate fictional backstories. They waste tokens and rarely improve output.
Keep roles to 1-3 sentences that establish expertise + decision lens.

### Role Effectiveness by Task Type

| Task Type | Role Impact | Recommended Approach |
|---|---|---|
| Creative writing / copy | High | Specific expertise + voice + framework |
| Code generation | Low-Medium | Language/framework specialization only |
| Classification | Negligible | Skip role. Clear labels + examples win |
| Data extraction | Negligible | Skip role. Schema specification wins |
| Analysis / reasoning | Medium | Decision framework + epistemic stance |
| Conversation / support | High | Personality + boundaries + escalation rules |

### Good vs. Bad Role Examples

**Good** (expertise + lens + behavior in 2 sentences):
```
You are an elite direct-response copywriter with deep expertise in Eugene Schwartz's
Breakthrough Advertising framework. Your job is to diagnose why copy is not converting and
prescribe specific rewrites. Be direct, specific, and ruthlessly honest.
```

**Bad** (biography, wastes ~80 tokens for zero improvement):
```
You are Alex, a 15-year veteran copywriter who grew up in New York, studied journalism
at Columbia, worked at Ogilvy for 8 years, then went independent. You've written copy
for Fortune 500 companies and have a passion for data-driven marketing. You love coffee
and hate jargon.
```

**Good** (epistemic stance that reduces hallucinations):
```
You are a senior research analyst. You distinguish clearly between facts supported by
evidence and your own inferences. When uncertain, you say "I'm not confident about this"
rather than guessing. You cite specific data points when available.
```

---

## 3. Instruction Architecture

### Clarity Over Cleverness

The #1 cause of prompt failure is ambiguity. The model will fill in the gaps — usually not
how you intended. State everything explicitly.

**Bad**: "Write a good email subject line"
**Good**: "Write 5 email subject lines for a cold email to B2B SaaS founders. Each subject line
must be under 8 words, create curiosity without clickbait, and not include our company name.
Format as a numbered list."

### The Specificity Checklist

Before finalizing any prompt, verify you've specified:

| Dimension | Question | Example Specification |
|---|---|---|
| **What** | Exactly what output? | "Write 5 email subject lines" |
| **Who** | For what audience? | "for B2B SaaS founders with 10-50 employees" |
| **How many** | Exact quantity? | "exactly 5 options" |
| **How long** | Length constraints? | "under 8 words each" |
| **Format** | Exact output structure? | "numbered list, one per line" |
| **Style** | Tone and voice? | "professional but conversational, no buzzwords" |
| **Constraints** | What NOT to do? | "no company name, no clickbait, no questions" |
| **Quality bar** | What makes it good? | "create curiosity, imply a specific benefit" |

### Positive Instructions Beat Negative Ones

Tell the model what TO DO, not just what to avoid. Negative instructions often fail because
models process them as "think about X" before processing "don't do X."

**Bad**: "Don't be verbose. Don't use jargon. Don't use a corporate tone."
**Good**: "Write in plain English. Use short sentences (under 15 words). Write like you're
talking to a smart friend — informal but precise."

**Measured impact**: In testing across classification and generation tasks, replacing negative
instructions with positive equivalents improves adherence by 15-30% (varies by model). Claude
handles negatives better than GPT in most benchmarks, but positive framing is universally safer.

### Use XML Tags for Structure (All Models, Claude-Optimized)

XML tags dramatically improve all models' ability to parse complex prompts with multiple sections.
Claude specifically trains on XML-structured prompts and handles them with the highest reliability.

```xml
<task>
  Analyze the following sales page and identify the top 3 weaknesses.
</task>

<evaluation_criteria>
  - Headline clarity and hook strength
  - Offer stack and perceived value
  - Objection handling completeness
</evaluation_criteria>

<output_format>
  Return a JSON array with objects containing:
  - weakness: string (specific description)
  - severity: integer (1=minor, 2=moderate, 3=critical)
  - location: string (which section of the page)
  - fix: string (specific rewrite or structural change)
</output_format>

<sales_page>
  {{DYNAMIC_INPUT}}
</sales_page>
```

XML tagging is especially powerful when:
- There are multiple distinct input sections
- The prompt has both instructions and variable content
- You need the model to reference specific sections in its output
- You want to cache static sections and vary others (see `claude-ecosystem.md` Section 4)

### Constraint Specification

State hard limits explicitly. Vague constraints produce inconsistent behavior.

| Constraint Type | Bad (Vague) | Good (Specific) |
|---|---|---|
| Length | "Be concise" | "Respond in under 200 words" |
| Format | "Use JSON" | "Return only valid JSON. No markdown fences, no explanation." |
| Scope | "Use the document" | "Only use information from the provided `<document>` tags. If the answer isn't there, say 'Not found in provided context.'" |
| Uncertainty | (not mentioned) | "If confidence < 80%, say 'I'm not certain about this' and explain what information would increase confidence." |
| Enumeration | "List some options" | "List exactly 3 options, numbered 1-3" |
| Tone | "Be professional" | "Write in active voice, present tense, at an 8th-grade reading level" |

The uncertainty permission dramatically reduces hallucinations. Models default to confident-
sounding guesses when not given explicit permission to express doubt. In production RAG systems,
adding uncertainty permissions reduces hallucination rates by 20-40% (measured across multiple
deployments). See `evaluation-testing.md` Section 9 for faithfulness metrics.

---

## 4. Few-Shot Design

Few-shot examples are one of the highest-ROI techniques available when used correctly.

### When to Use Few-Shot

- The task has a specific output format that's hard to describe in words
- You need a specific tone or style the model doesn't default to
- The task involves pattern-matching that's easier to show than explain
- Zero-shot is producing inconsistent results (>20% variance across runs)

### When NOT to Use Few-Shot

- The task is straightforward and zero-shot works reliably (>95% pass rate)
- You have a token budget constraint (examples cost 100-500 tokens each)
- The examples might introduce bias toward specific phrasings
- You're using a model with strong instruction-following (Claude Sonnet/Opus, GPT-4.1+)

### Construction Rules

1. **Start with one example** (one-shot). Only add more if output is still inconsistent.
   Benchmark: 1 example covers 70-80% of formatting issues. 3 examples covers 90%+.
2. **Examples must be high quality** — bad examples teach bad behavior. Garbage in, garbage out.
3. **Examples must cover edge cases** — if there's a common failure mode, include an example
   that handles it correctly.
4. **Format must match exactly** — the format of your examples becomes the expected output format.
   If your example has trailing commas in JSON, the model will produce trailing commas.
5. **Randomize labels in classification tasks** — research shows label distribution matters more
   than the specific examples. Don't front-load all "positive" examples.

### Few-Shot Token Cost Analysis

| Approach | Token Cost Per Call | Quality Impact | When to Use |
|---|---|---|---|
| Zero-shot | 0 extra tokens | Baseline | Default starting point |
| One-shot | +100-300 tokens | +15-25% consistency | Output format issues |
| Three-shot | +300-900 tokens | +25-35% consistency | Complex format + edge cases |
| Five-shot | +500-1500 tokens | +30-40% consistency | Classification, rare edge cases |
| Many-shot (10+) | +1000-5000 tokens | Diminishing returns past 5 | Only with prompt caching |

**Cost optimization**: With prompt caching (see `claude-ecosystem.md`), few-shot examples in
the static prefix cost ~10% of their normal token price on subsequent calls. This makes
3-5 shot approaches economically viable for high-volume production.

### Example Structure

```xml
<examples>
  <example>
    <input>Customer email: "I ordered 3 days ago and tracking still shows 'processing'. What's going on?"</input>
    <output>{"intent": "order_status", "sentiment": "frustrated", "urgency": "medium", "action": "lookup_order", "response_tone": "empathetic_reassuring"}</output>
  </example>
  <example>
    <input>Customer email: "Love the product! Quick question — can I use it with my existing mount?"</input>
    <output>{"intent": "product_compatibility", "sentiment": "positive", "urgency": "low", "action": "lookup_specs", "response_tone": "enthusiastic_helpful"}</output>
  </example>
  <example>
    <input>Customer email: "Cancel my subscription immediately. This is the third time billing was wrong."</input>
    <output>{"intent": "cancellation", "sentiment": "angry", "urgency": "high", "action": "escalate_retention", "response_tone": "apologetic_urgent"}</output>
  </example>
</examples>
```

---

## 5. Chain-of-Thought and Reasoning Scaffolds

### When CoT Helps

- Multi-step math or logic (accuracy gains of 30-50% on math benchmarks)
- Complex classification with multiple criteria
- Tasks where the reasoning process catches errors the final answer would miss
- Decision trees with branching conditions

### When CoT Hurts (or is Irrelevant)

- Simple factual retrieval (adds latency, no accuracy gain)
- Straightforward formatting or extraction
- Token-constrained scenarios (CoT adds 100-500 tokens of reasoning overhead)
- Tasks where speed matters more than reasoning depth

### CoT Technique Comparison

| Technique | Token Overhead | Accuracy Gain | Best For |
|---|---|---|---|
| Zero-shot CoT ("Think step by step") | +50-200 tokens | +10-25% on reasoning tasks | Quick reasoning boost, math |
| Structured CoT (explicit steps) | +100-400 tokens | +20-35% | Multi-criteria decisions |
| Extended Thinking (Claude) | +500-10,000 tokens | +30-50% on hard problems | Complex reasoning, code, math |
| Self-consistency (majority vote) | 3-5x base cost | +15-30% reliability | High-stakes, ambiguous tasks |
| ReAct (agents) | Variable | Task-dependent | Tool-using agents |

### Zero-Shot CoT

Add "Think step by step" or "Let's work through this carefully" before the output request.
Surprisingly effective for structured reasoning tasks.

```
Analyze this pricing strategy. Think step by step before giving your final assessment.
```

### Structured CoT

Define the thinking steps explicitly. This gives you control over the reasoning path:

```xml
<instructions>
Before writing your response, work through these steps in <thinking> tags:
1. Identify the prospect's awareness level (unaware/problem-aware/solution-aware/product-aware/most-aware)
2. Identify the market sophistication stage (1-5)
3. Determine the appropriate lead type (claim/promise/proof/problem/secret/story)
4. Draft the opening hook (one sentence)
5. Identify the primary objection to address

Then write the final output outside the thinking tags.
</instructions>
```

### Extended Thinking (Claude-Specific)

Claude's extended thinking allocates a separate "thinking budget" (1,024 to 128,000 tokens)
for internal reasoning before generating the response. The model decides how much of the budget
to use based on problem complexity.

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000  # max thinking tokens
    },
    messages=[{"role": "user", "content": prompt}]
)

# Access thinking and response separately
for block in response.content:
    if block.type == "thinking":
        print(f"Reasoning: {block.thinking}")
    elif block.type == "text":
        print(f"Answer: {block.text}")
```

See `claude-ecosystem.md` Section 3 for full extended thinking patterns, streaming, and
adaptive budget strategies.

### ReAct Pattern (for agents)

Thought -> Action -> Observation -> repeat. See `agentic-systems.md` Section 3.

### Self-Consistency

For high-stakes decisions, run the same prompt 3-5 times and take the majority answer.
Expensive but dramatically more accurate for reasoning tasks.

```python
import collections

def self_consistent_answer(prompt: str, model: str, n: int = 5) -> str:
    answers = []
    for _ in range(n):
        response = call_llm(prompt, model=model, temperature=0.7)
        answers.append(extract_final_answer(response))

    # Majority vote
    counter = collections.Counter(answers)
    best_answer, count = counter.most_common(1)[0]
    confidence = count / n

    return {"answer": best_answer, "confidence": confidence, "distribution": dict(counter)}
```

### The Token Budget for Reasoning

Research (Levy et al., 2024): LLM reasoning performance degrades around 3,000 tokens of
instruction context. The practical sweet spot for most prompts is **150-300 words of
instruction**. More is not better — unless using extended thinking, which operates in a
separate token space.

---

## 6. Output Format Specification

This is the most underspecified part of most prompts and the most common source of production
failures. In production, inconsistent output format = broken downstream system.

### JSON Schema Enforcement

For any structured output that feeds a downstream system, specify the exact schema:

```
Return your response as valid JSON matching this schema exactly:
{
  "headline": string (max 10 words),
  "subheadline": string (max 20 words),
  "body_paragraphs": array of strings (exactly 3 items, each 40-60 words),
  "cta": string (action verb + benefit, max 6 words),
  "confidence_score": number (0.0-1.0),
  "reasoning": string (1-2 sentences explaining your approach)
}

Return ONLY the JSON object. No explanation, no markdown fences, no other text.
```

### Structured Output Enforcement Options

| Method | Reliability | Cost | Best For |
|---|---|---|---|
| Prompt-level schema spec | 85-95% compliance | No extra cost | Most use cases |
| Claude tool use (forced) | 99%+ compliance | No extra cost | Production structured output |
| OpenAI `response_format: json_schema` | 99%+ compliance | No extra cost | OpenAI production |
| Post-processing validation + retry | 99.9%+ with retry | +1 LLM call on ~5-15% of requests | Critical systems |
| Pydantic/Zod schema + SDK | 99%+ compliance | SDK overhead only | Type-safe applications |

### Claude Tool Use for Guaranteed JSON

Force structured output via tool use — the model must call the tool, which enforces the schema:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=[{
        "name": "submit_analysis",
        "description": "Submit the completed analysis in structured format",
        "input_schema": {
            "type": "object",
            "required": ["headline", "body_paragraphs", "cta", "confidence_score"],
            "properties": {
                "headline": {"type": "string", "maxLength": 60},
                "body_paragraphs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 3,
                    "maxItems": 3
                },
                "cta": {"type": "string", "maxLength": 40},
                "confidence_score": {"type": "number", "minimum": 0, "maximum": 1}
            }
        }
    }],
    tool_choice={"type": "tool", "name": "submit_analysis"},
    messages=[{"role": "user", "content": prompt}]
)

# Guaranteed valid JSON in response.content[0].input
result = response.content[0].input
```

See `claude-ecosystem.md` Section 2 for full tool use patterns.

### Markdown vs. Plain Text

- **Claude.ai / ChatGPT chat interfaces**: Markdown renders — use it
- **API responses going into code**: Specify "No markdown. Return plain text only."
- **Responses going into PDFs/docs**: Specify exact formatting (headers, bullets, etc.)
- **Responses for downstream LLM processing**: Plain text or JSON — never markdown

### Length Control

Be specific. Vague guidance produces inconsistent output.

| Vague (Don't Use) | Specific (Use This) | Expected Behavior |
|---|---|---|
| "Be concise" | "Under 100 words" | Hard limit respected ~90% |
| "Be detailed" | "250-350 words" | Range respected ~85% |
| "A few points" | "Exactly 3 bullet points" | Exact count respected ~95% |
| "Short paragraph" | "2-3 sentences, under 50 words" | Both constraints respected ~85% |
| "Comprehensive" | "Cover all 5 criteria, 50-75 words each" | Structured coverage |

---

## 7. Model-Specific Behavior (2026)

### Claude (Anthropic)

- **Best at**: Long-context reasoning, instruction following, nuanced writing, tool use,
  respecting complex constraints, extended thinking for hard problems
- **Loves**: XML tags for structure, explicit step-by-step instructions, permission to express
  uncertainty, structured thinking before output
- **Context window**: 200K tokens — best-in-class for long document work
- **Quirk**: Can be overly cautious on edge cases. Give explicit permission when needed:
  "For the purposes of this analysis, treat all examples as hypothetical marketing scenarios."
- **Prompt caching**: Supports cache breakpoints on static prefixes — up to 90% cost reduction.
  Minimum cacheable prefix: 1,024 tokens (Sonnet/Opus), 2,048 tokens (Haiku)
- **Extended thinking**: Separate reasoning budget (1K-128K tokens). Use for math, code, complex
  multi-step reasoning. See `claude-ecosystem.md` Section 3
- **Citations API**: Returns source attributions with character-level precision. Critical for
  RAG systems. See `claude-ecosystem.md` Section 5

### Model Selection Quick Reference

| Model | Input $/M tokens | Output $/M tokens | Speed | Best For |
|---|---|---|---|---|
| Claude Opus 4 | $15 | $75 | Slower | Complex reasoning, code, agentic |
| Claude Sonnet 4 | $3 | $15 | Fast | Production workhorse, balanced |
| Claude Haiku 3.5 | $0.80 | $4 | Fastest | Classification, extraction, routing |
| GPT-4.1 | $2 | $8 | Fast | Code, structured output, JSON |
| GPT-4.1 mini | $0.40 | $1.60 | Fast | High-volume, cost-sensitive |
| GPT-4.1 nano | $0.10 | $0.40 | Fastest | Classification, simple extraction |
| Gemini 2.5 Pro | $1.25-2.50 | $10-15 | Fast | Multimodal, 1M+ context |
| Gemini 2.5 Flash | $0.15-0.30 | $0.60-2.50 | Fastest | Thinking + speed |

*Prices as of early 2026. Check provider documentation for current rates.*

### GPT-4.1 / GPT-5 (OpenAI)

- **Best at**: Code generation, structured data extraction, JSON output reliability
- **Loves**: Clear role + formatting instructions; few-shot examples
- **Default**: Zero-shot before few-shot (GPT-4.1+ infers intent well)
- **Quirk**: Router behavior changes between versions — pin to snapshot model IDs in production
- **Structured Outputs API**: Native JSON schema enforcement — use it in production
- **Instruction hierarchy**: System > Developer > User. Useful for guardrails.

### Gemini 2.5 (Google)

- **Best at**: Multimodal tasks (image, video, audio), very large context windows, native
  Google ecosystem integration
- **Loves**: Shorter, more direct prompts than Claude or GPT
- **Placement rule**: Put specific questions at the END, after all context (Google's own guidance)
- **Context**: 1M token window (2M in preview). Placement becomes critical at that scale
- **Thinking mode**: Gemini 2.5 Flash has a "thinking" mode similar to Claude's extended thinking

### Universal Rules

- Try zero-shot first. Only add complexity when zero-shot demonstrably fails.
- Don't use heavy role prompting as a substitute for clear instructions.
- XML tags and explicit structure improve output quality across all major models.
- Always test prompt changes on the model version you're deploying on.
- Pin model versions in production. Never use "latest" or unpinned model IDs.
- See `production-optimization.md` for model routing strategies that use different models
  per task type to optimize cost-quality tradeoffs.

---

## 8. The Token Efficiency Imperative

In production, tokens = money + latency. Every unnecessary token is a cost.

### Prompt Caching (Claude)

Structure prompts so static content comes first. Cached prefixes cost ~10% of fresh token
pricing. For high-volume tasks this is a 90% cost reduction.

```
[SYSTEM PROMPT — STATIC, CACHEABLE]  ← role, instructions, schema, examples
[HUMAN TURN — DYNAMIC, NOT CACHED]   ← user input, retrieved context, current state
```

### Cache Implementation

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": STATIC_SYSTEM_CONTENT,  # Role, instructions, examples (>1024 tokens)
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[
        {"role": "user", "content": dynamic_user_input}
    ]
)

# Check cache performance
print(f"Cache read tokens: {response.usage.cache_read_input_tokens}")
print(f"Cache creation tokens: {response.usage.cache_creation_input_tokens}")
```

See `claude-ecosystem.md` Section 4 for multi-breakpoint caching, cache math, and TTL behavior.

### Token Reduction Strategies

| Strategy | Token Savings | Quality Impact | Effort |
|---|---|---|---|
| Remove filler phrases ("Please", "I'd like you to") | 5-15% | None | Low |
| Compress examples (shorter but same pattern) | 10-30% | Minimal if done well | Medium |
| Use abbreviations (full names first use only) | 5-10% | None | Low |
| Summarize retrieved context before injection | 30-60% of retrieval tokens | Slight quality risk | Medium |
| Use smaller models for subtasks | N/A (different model) | Task-dependent | Medium |
| Prompt caching (static prefix) | 90% on cached tokens | None | Low |
| Batches API (async, 50% off) | 50% cost reduction | None (same quality) | Low |

### Cost Envelope Per Task Type

Establish a token budget before designing a workflow:

| Task | Target Tokens (input + output) | Recommended Model | Est. Cost Per Call |
|---|---|---|---|
| Simple classification | < 500 | Haiku / GPT-4.1 nano | $0.0004-0.001 |
| Email/copy generation | 500-2,000 | Sonnet / GPT-4.1 | $0.002-0.01 |
| Long doc analysis | 2,000-50,000 | Sonnet + caching | $0.01-0.10 |
| Research pipeline (per run) | 5,000-20,000 | Multi-model | $0.02-0.15 |
| Full agentic workflow | 20,000-100,000 | Multi-model | $0.10-1.00 |
| Extended thinking (complex) | 10,000-150,000 | Opus/Sonnet w/ thinking | $0.15-2.00 |

See `production-optimization.md` for detailed cost breakpoint analysis and fine-tuning vs.
prompt engineering decision framework.

---

## 9. The "Lost in the Middle" Problem

**Stanford research finding**: LLM performance degrades when relevant information is placed in
the middle of long contexts. Models attend most strongly to the BEGINNING and END of the context.

**Chroma Research (July 2025)**: Tested 18 LLMs including Claude 4, GPT-4.1, Gemini 2.5.
Performance becomes increasingly unreliable as input length grows — even for trivially simple
tasks like "find this specific sentence."

### Measured Degradation

| Context Length | Retrieval Accuracy (Info at Start) | Retrieval Accuracy (Info in Middle) | Drop |
|---|---|---|---|
| 4K tokens | 95% | 92% | -3% |
| 16K tokens | 93% | 78% | -15% |
| 64K tokens | 90% | 65% | -25% |
| 128K+ tokens | 85% | 50-60% | -25-35% |

*Approximate ranges across models. Claude performs better than average on long-context tasks.*

### Practical Rules

1. **Put critical instructions at the START** of the system prompt
2. **Put the user's actual question / current task at the END** of the context
3. **Don't bury key information in the middle** of long document contexts — summarize it up front
4. **Use RAG to inject only the relevant chunks** rather than the entire document
   (see `context-engineering.md` Section 3)
5. **Prefer multiple focused contexts over one massive one** — shorter, targeted contexts
   consistently outperform long ones even when the long context technically contains the answer

### The Position Rule for Structured Prompts

```
[Position 1 — START]: Role, core instructions, output schema     ← Strong attention
[Position 2 — MIDDLE]: Examples, background context, history    ← Weak attention (don't bury key info here)
[Position 3 — END]: Current query, retrieved docs, user input   ← Strong attention (recency bias)
```

### Claude Citations for Long-Context Grounding

When working with long documents, use Claude's Citations API to verify the model is actually
grounding answers in the right sections rather than hallucinating or pulling from the wrong part
of the context. See `claude-ecosystem.md` Section 5.

---

## 10. Anti-Patterns — What Destroys Prompt Performance

### The Anti-Pattern Diagnostic Table

| Anti-Pattern | Symptom | Root Cause | Fix |
|---|---|---|---|
| **The Vagueness Trap** | Inconsistent outputs, random variation | Ambiguous instructions | Specify every dimension (Section 3 checklist) |
| **The Novel-Length System Prompt** | Degraded reasoning, ignored instructions | >3,000 token system prompt | Cut to 250-500 words. Focused > thorough |
| **Over-Engineered Role** | Wasted tokens, no quality improvement | Biography instead of lens | Role = expertise + decision lens in 1-3 sentences |
| **Stacked Negatives** | Model does exactly what you said not to | "Don't do X, don't do Y, don't do Z" | Reframe as positive instructions |
| **Ignoring Output Format** | Broken downstream systems, parsing errors | No schema specification | Always specify exact schema (Section 6) |
| **Not Permitting Uncertainty** | Hallucinations, confident-sounding errors | No uncertainty escape valve | Add "If uncertain, say so explicitly" |
| **One-Shot Deployment** | Silent production failures | No eval suite | Build eval set before deploying (see `evaluation-testing.md`) |
| **Kitchen-Sink Context** | Lost-in-middle failures, high cost | Dumping everything into context | RAG for precision retrieval (see `context-engineering.md`) |
| **Model-Agnostic Prompts** | Suboptimal performance on every model | Ignoring model-specific strengths | Test on target model; use model-specific features |
| **Unpinned Model Versions** | Random quality changes after provider updates | Using "latest" in production | Pin to specific model version IDs |

### The Reasoning Degradation Threshold

Research confirms: reasoning degrades past ~3,000 tokens of instruction context. Long does not
equal thorough. A focused 250-word system prompt consistently outperforms a rambling 2,000-word one.

**Exception**: Claude's extended thinking operates in a separate token space and doesn't
count against this threshold. Use extended thinking for complex reasoning rather than making
the prompt longer.

---

## 11. Iteration Protocol

The correct way to improve a prompt:

1. **Identify the failure mode** — What specifically went wrong? Categorize:

| Failure Category | Example | Likely Cause |
|---|---|---|
| Format error | JSON missing a field | Underspecified output schema |
| Reasoning error | Wrong conclusion from correct data | Missing CoT, need structured reasoning |
| Hallucination | Made up a statistic | Missing uncertainty permission, no grounding |
| Instruction violation | Exceeded word count | Constraint not specific enough |
| Inconsistency | Different output style each run | Missing examples, too much temperature |
| Refusal | Model declines a valid task | Overly cautious; needs explicit permission |

2. **Hypothesize the cause** — Is it a clarity issue? Missing context? Wrong model? Position?
3. **Change ONE variable** — Don't rewrite the entire prompt. Change one thing and measure.
4. **Test against your eval set** — Not just the failing case. Did the fix break other cases?
5. **Measure, don't vibe** — "It feels better" is not an eval. Define success criteria.
   See `evaluation-testing.md` for eval frameworks and statistical rigor.
6. **Version control** — Every prompt that runs in production has a version number and change log.

### The Minimum Viable Eval Set

Before deploying any prompt, build a test set of:
- 5-10 representative inputs covering normal cases
- 3-5 edge cases (unusual inputs, boundary conditions)
- 2-3 adversarial inputs (inputs designed to break the prompt)
- At least 1 "golden" example with a known-correct output

Run every prompt change against this set. Track pass rate over time.

**For production-grade eval**: Scale to 50-100+ examples with automated scoring.
See `evaluation-testing.md` Sections 8-9 for dataset construction and metrics by task type.

### Promptfoo Quick-Start for Prompt Iteration

```yaml
# promptfooconfig.yaml — minimal setup for prompt testing
prompts:
  - file://prompts/v1.txt
  - file://prompts/v2.txt

providers:
  - anthropic:messages:claude-sonnet-4-20250514

tests:
  - vars:
      input: "Example input 1"
    assert:
      - type: is-json
      - type: javascript
        value: "JSON.parse(output).confidence_score >= 0.5"
      - type: llm-rubric
        value: "Response is specific, actionable, and addresses the input directly"

  - vars:
      input: "Edge case input"
    assert:
      - type: contains
        value: "not certain"
      - type: is-json
```

Run: `npx promptfoo@latest eval` — see results in browser at `npx promptfoo@latest view`.

---

## 12. Prompt Complexity Ladder — When to Use What

Match prompt complexity to task complexity. Over-engineering simple tasks wastes money.
Under-engineering complex tasks produces unreliable output.

| Task Complexity | Prompt Approach | Token Budget | Example |
|---|---|---|---|
| **Trivial** | Zero-shot, no role, minimal instructions | <200 tokens | "Classify this as spam or not: {{input}}" |
| **Simple** | Zero-shot + output schema + constraints | 200-400 tokens | Classification with 5+ categories, simple extraction |
| **Moderate** | Role + structured instructions + schema | 400-800 tokens | Content generation, analysis, summarization |
| **Complex** | Full prompt + few-shot + CoT | 800-2,000 tokens | Multi-criteria evaluation, strategy, nuanced writing |
| **Expert** | Full prompt + CoT + extended thinking | 800-2,000 + thinking budget | Complex reasoning, code, math, agentic planning |
| **Pipeline** | Multiple prompts in sequence | Varies per step | Research -> strategy -> generation -> review |

### Decision Flow

```
Can zero-shot + schema handle it? (Test 10 examples)
  → 90%+ pass rate: Ship it. Stop.
  → 70-90% pass rate: Add 1-3 few-shot examples. Re-test.
  → <70% pass rate: Add structured CoT or extended thinking. Re-test.
  → Still failing: Consider pipeline approach (agentic-systems.md)
    or different model (production-optimization.md model routing)
```

---

## 13. Production Prompt Templates

### Classification Prompt

```xml
<task>
Classify the following {{INPUT_TYPE}} into exactly one of these categories:
{{CATEGORY_LIST}}
</task>

<output_format>
Return JSON: {"category": string, "confidence": number (0.0-1.0), "reasoning": string (1 sentence)}
Return ONLY the JSON. No other text.
</output_format>

<input>
{{DYNAMIC_INPUT}}
</input>
```

### Extraction Prompt

```xml
<task>
Extract the following fields from the provided {{DOCUMENT_TYPE}}.
If a field is not present, set its value to null.
Do not infer or guess values that aren't explicitly stated.
</task>

<fields>
{{FIELD_DEFINITIONS_WITH_TYPES}}
</fields>

<output_format>
Return valid JSON matching this exact schema:
{{JSON_SCHEMA}}
Return ONLY the JSON. No explanation.
</output_format>

<document>
{{DYNAMIC_INPUT}}
</document>
```

### Generation Prompt (with Quality Gate)

```xml
<role>
{{EXPERTISE + DECISION_LENS in 1-3 sentences}}
</role>

<task>
{{SPECIFIC_GENERATION_TASK}}
</task>

<constraints>
- {{LENGTH_CONSTRAINT}}
- {{STYLE_CONSTRAINT}}
- {{SCOPE_CONSTRAINT}}
- If uncertain about any claim, flag it with [UNVERIFIED]
</constraints>

<quality_criteria>
Before finalizing, verify your output meets ALL criteria:
1. {{CRITERION_1}}
2. {{CRITERION_2}}
3. {{CRITERION_3}}
If any criterion is not met, revise before returning.
</quality_criteria>

<output_format>
{{EXACT_FORMAT_SPECIFICATION}}
</output_format>

<context>
{{DYNAMIC_INPUT}}
</context>
```

### Analysis Prompt (with Structured Reasoning)

```xml
<role>
{{ANALYST_EXPERTISE}}
</role>

<task>
{{ANALYSIS_TASK}}
</task>

<method>
Work through these steps in <thinking> tags before producing output:
1. {{ANALYSIS_STEP_1}}
2. {{ANALYSIS_STEP_2}}
3. {{ANALYSIS_STEP_3}}
4. Check: does my analysis address the core question?
5. Check: is every claim supported by the provided data?
</method>

<output_format>
{{STRUCTURED_OUTPUT_SCHEMA}}
</output_format>

<data>
{{DYNAMIC_INPUT}}
</data>
```
