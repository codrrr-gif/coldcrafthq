# Production Optimization — Cost, Latency, and Deployment at Scale

The engineering that turns an AI prototype into a production system. A system that works but
costs $0.50/run instead of $0.05/run is a bad system. A system that takes 5 seconds when it
could take 500ms is a bad system. Production optimization is not an afterthought — it's what
separates demos from revenue-generating infrastructure.

> *"Premature optimization is the root of all evil, but mature optimization is the root of
> all profit."*

---

## Table of Contents
1. Fine-Tuning vs Prompt Engineering — Decision Framework
2. Cost Breakpoint Analysis
3. Fine-Tuning Options (Managed, Open-Source, Distillation)
4. Model Distillation
5. Production Case Studies
6. Streaming Responses
7. Speculative Decoding
8. Parallel Tool Calls
9. Model Routing
10. Edge Deployment
11. Caching Strategies (4-Layer Architecture)
12. Multimodal AI Integration — Tools, Costs, and Production Workflows

---

## 1. Fine-Tuning vs Prompt Engineering — Decision Framework

#### The Progressive Implementation Strategy

The consensus across enterprise AI teams in 2025-2026 is: **start with prompt engineering, escalate only when data justifies it.**

```
STAGE 1: Prompt Engineering (hours to days)
  └─ Establish baseline, validate use case
  └─ Cost: near-zero beyond API usage

STAGE 2: RAG (if you need real-time or proprietary data)
  └─ Add retrieval layer for dynamic context
  └─ Cost: $70-1,000/month for vector DB + embeddings

STAGE 3: Fine-Tuning (when clear ROI exists)
  └─ Deep domain specialization, consistency at scale
  └─ Cost: $100-25,000+ upfront, higher inference rates
```

#### When to Stay with Prompt Engineering

| Criterion | Stay with Prompting |
|---|---|
| **Query volume** | < 100K queries/month |
| **Task diversity** | Multiple task types across one deployment |
| **Iteration speed** | Need to change behavior in minutes, not days |
| **Data availability** | < 100 high-quality training examples |
| **Use case stage** | Prototyping or early production |
| **Domain** | General knowledge, no specialized terminology |

#### When to Move to Fine-Tuning

| Criterion | Fine-Tune |
|---|---|
| **Query volume** | > 100K queries/month (cost savings compound) |
| **Consistency** | Must produce highly consistent output format/style |
| **Latency** | Need shorter prompts to reduce per-request latency |
| **Domain specificity** | Specialized terminology, tone, or reasoning patterns |
| **Token economics** | System prompts exceed 1,000 tokens with examples |
| **Quality plateau** | Prompt engineering has hit a ceiling on eval metrics |

#### Decision Flowchart

```
Is your task well-defined and repeatable?
├─ NO  → Prompt Engineering (flexibility wins)
├─ YES
│   ├─ Do you have 100+ high-quality examples?
│   │   ├─ NO  → Prompt Engineering + collect data
│   │   ├─ YES
│   │   │   ├─ Are you making >100K calls/month?
│   │   │   │   ├─ NO  → Prompt Engineering (cost isn't justified)
│   │   │   │   ├─ YES
│   │   │   │   │   ├─ Is the base model already >90% on your evals?
│   │   │   │   │   │   ├─ YES → Prompt Engineering (diminishing returns)
│   │   │   │   │   │   ├─ NO  → Fine-Tune
```

### Cost Breakpoint Analysis

#### OpenAI Pricing (as of late 2025)

**GPT-4o mini (the most common fine-tuning target):**

| | Base Model | Fine-Tuned Model | Multiplier |
|---|---|---|---|
| Input | $0.15 / 1M tokens | $0.30 / 1M tokens | 2x |
| Output | $0.60 / 1M tokens | $1.20 / 1M tokens | 2x |
| Training | -- | $3.00 / 1M tokens | one-time |

**GPT-4o:**

| | Base Model | Fine-Tuned Model |
|---|---|---|
| Input | $2.50 / 1M tokens | $3.75 / 1M tokens |
| Output | $10.00 / 1M tokens | $15.00 / 1M tokens |
| Training | -- | $25.00 / 1M tokens |

**GPT-4.1:**

| | Base Model | Fine-Tuned Model |
|---|---|---|
| Input | $2.00 / 1M tokens | $4.00 / 1M tokens |
| Output | $8.00 / 1M tokens | $16.00 / 1M tokens |
| Training | -- | $25.00 / 1M tokens |

#### The Token Savings Math (Where Fine-Tuning Wins)

Fine-tuned models cost 1.5-2x more per token for inference, BUT they require dramatically fewer input tokens because you eliminate few-shot examples and lengthy system prompts.

**Worked Example -- Customer Support Classification:**

```
FEW-SHOT PROMPTING (base GPT-4o mini):
  System prompt + 8 examples:  ~1,500 input tokens per request
  Output:                      ~50 tokens per request
  Cost per request:  (1500 * $0.15/1M) + (50 * $0.60/1M) = $0.000255

FINE-TUNED (GPT-4o mini fine-tuned):
  Short system prompt:         ~300 input tokens per request
  Output:                      ~50 tokens per request
  Cost per request:  (300 * $0.30/1M) + (50 * $1.20/1M) = $0.000150

  Savings per request: 41%
  Training cost (1M token dataset): $3.00 (one-time)
```

**Breakeven Calculation:**

```
Training cost:            $3.00 (for 1M token training set)
Savings per request:      $0.000105
Breakeven:                $3.00 / $0.000105 = ~28,571 requests

At 10K requests/day:      Breakeven in ~3 days
At 1K requests/day:       Breakeven in ~29 days
At 100 requests/day:      Breakeven in ~286 days
```

**Rule of Thumb:** Fine-tuning GPT-4o mini pays for itself within a week at volumes above 5K requests/day, assuming your few-shot prompt uses 5+ examples. At 100K+ requests/month, the savings are substantial.

**Production validation from 2025:** Enterprise chatbots using fine-tuned models cut token usage by 50-75%, dropping monthly costs from $5,000 to $1,500 in documented cases.

#### When the Math Does NOT Work

- Low volume (< 1K requests/day) with a small prompt: inference premium eats savings
- Rapidly changing requirements: retraining costs and iteration time negate savings
- High-diversity tasks: you would need multiple fine-tuned models

### Fine-Tuning Options

#### Option 1: OpenAI Fine-Tuning (Managed)

**Available models:** GPT-4o, GPT-4o mini, GPT-4.1, GPT-4.1 mini, GPT-4.1 nano

**Strengths:**
- Simplest setup (upload JSONL, click train)
- Results with as few as 50-100 examples (recommended: 500+)
- Automatic hyperparameter selection
- No infrastructure to manage
- Reinforcement Fine-Tuning (RFT) available for advanced use cases

**Limitations:**
- 2x inference cost premium
- No control over training hyperparameters beyond epochs
- Model weights are not exportable
- Vendor lock-in

**Best for:** Teams without ML infrastructure who need quick domain adaptation.

```jsonl
{"messages": [{"role": "system", "content": "You are a medical coding assistant."}, {"role": "user", "content": "Patient presents with acute bronchitis"}, {"role": "assistant", "content": "ICD-10: J20.9 - Acute bronchitis, unspecified"}]}
```

#### Option 2: Anthropic Claude Fine-Tuning

**Current status (early 2026):** Fine-tuning is available only through Amazon Bedrock for Claude 3 Haiku. No direct fine-tuning is available through Anthropic's native API for general users. Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 4 models do not yet support fine-tuning.

**Practical implication:** For Claude-based production systems, invest in prompt engineering and context engineering (long context windows, tool use, RAG). Anthropic's models are designed for strong zero/few-shot performance.

#### Option 3: Open Source (LoRA / QLoRA)

**LoRA (Low-Rank Adaptation):**
- Freezes base model weights, trains small adapter matrices
- Trains only 0.1-1% of parameters
- Memory: 24-48 GB VRAM (RTX 4090 or A100)
- Quality: ~95% of full fine-tuning performance

**QLoRA (Quantized LoRA):**
- Same as LoRA but quantizes base model to 4-bit
- Memory: 16-24 GB VRAM (RTX 3090 or RTX 4080)
- Quality: ~80-90% of full fine-tuning performance
- Cost: **$20-100 per training run** on a single GPU

**Cost Comparison:**

| Method | Hardware | Cost per Run | Time | Quality vs Full FT |
|---|---|---|---|---|
| Full Fine-Tuning (7B) | 2-4x A100 80GB | ~$50,000 | Days | 100% (baseline) |
| LoRA (7B) | 1x A100 40GB | $200-500 | Hours | ~95% |
| QLoRA (7B) | 1x RTX 4090 | $20-100 | Hours | ~80-90% |
| OpenAI FT (4o-mini) | Managed | $3-50 | Minutes | N/A (different base) |

**Recommended Production Stack (2025-2026):**
- **Frameworks:** Axolotl or LLaMA-Factory for quick experiments; Hugging Face PEFT + TRL for production
- **Experiment tracking:** Weights & Biases or MLflow for managing LoRA adapters
- **Base models:** Llama 3.1/4 (8B-70B), Mistral Small 3.2 (24B), Qwen 3 (8B-72B)
- **Serving:** vLLM with LoRA adapter hot-swapping (serve multiple adapters from one base model)

**Production recommendation:** Use LoRA/QLoRA for ~95% of open-source fine-tuning needs.

### Model Distillation

#### What It Is

Use a large, expensive "teacher" model (GPT-4, Claude 3.5 Opus, etc.) to generate high-quality labeled data, then train a smaller, cheaper "student" model on that data. The student learns to mimic the teacher's behavior at a fraction of the inference cost.

#### The Distillation Pipeline

```
Step 1: Define your task with clear input/output specifications
Step 2: Collect or generate 1,000-50,000 input prompts from production logs
Step 3: Run teacher model (e.g., GPT-4) on all inputs → collect outputs
Step 4: Quality-filter outputs (automated evals + human spot-checks)
Step 5: Fine-tune student model (e.g., GPT-4o mini, Llama 3.1 8B) on filtered data
Step 6: Evaluate student vs teacher on held-out test set
Step 7: Deploy student; route edge cases back to teacher
```

#### Advanced Technique: "Distilling Step-by-Step"

Google Research demonstrated that extracting intermediate reasoning steps (rationales) from the teacher, not just final answers, makes the student dramatically more data-efficient. A 770M T5 model outperformed a 540B PaLM model on certain tasks using this approach with less training data.

**Key insight:** Include chain-of-thought reasoning in your training data, not just input-output pairs.

#### Production Performance

- Distilled models achieve **2-8x faster inference** compared to teacher models
- Students typically reach **85-95% of teacher quality** on in-distribution tasks
- Compression ordering matters: **Pruning then Distillation then Quantization** (P-KD-Q) produces the best quality/size tradeoff (2025 study)

#### Cost Example

```
Teacher: GPT-4o at $2.50/$10.00 per 1M tokens
Student: Fine-tuned GPT-4o mini at $0.30/$1.20 per 1M tokens

Cost reduction: ~88% input, ~88% output
Quality retention: ~90% on domain-specific evals

Generating 10,000 training examples with GPT-4o:
  ~500 tokens input + ~200 tokens output per example
  Input cost:  10,000 * 500 / 1M * $2.50 = $12.50
  Output cost: 10,000 * 200 / 1M * $10.00 = $20.00
  Total generation: $32.50

Fine-tuning cost (GPT-4o mini):
  ~7M tokens * $3.00/1M = $21.00

Total distillation investment: ~$53.50
Monthly savings at 500K requests/month: thousands of dollars
```

#### Tools & Frameworks

- **OpenAI Evals + Fine-tuning API:** Generate with GPT-4, fine-tune GPT-4o mini
- **Alibaba EasyDistill (2025):** Open-source toolkit for LLM compression
- **NVIDIA TensorRT Model Optimizer:** Pruning + distillation pipeline
- **Hugging Face TRL:** Supports knowledge distillation training loops

### Real Production Case Studies

#### Companies That Chose Fine-Tuning

1. **Streaming video service (undisclosed major platform):** Fine-tunes open-source models for query augmentation in video search "where you need more domain adaptation." The specialized vocabulary of content metadata made prompting insufficient.

2. **Enterprise chatbots (aggregated 2025 data):** Companies fine-tuning customer support models cut token usage by 50-75%, reducing monthly API costs from $5,000 to $1,500 through shorter prompts and more consistent outputs.

3. **Medical coding systems:** Fine-tuned models for ICD-10 code assignment, where consistency and accuracy on domain-specific terminology is critical and few-shot examples cannot cover the full codebook.

#### Companies That Chose Prompt Engineering

1. **Bolt, Cluely, and other high-growth AI products (2025):** CEOs publicly stated that their system prompt engineering is the primary driver of product quality. The best AI products are "obsessed with prompt engineering."

2. **Morgan Stanley Wealth Management:** Uses RAG + prompt engineering (in partnership with OpenAI) rather than fine-tuning, enabling their advisory AI to access real-time financial data while staying current with regulations.

3. **General enterprise trend (a16z 2025 survey of 100 CIOs):** Majority of enterprises found that "instead of taking the training data and parameter-efficient fine-tuning, you just dump it into a long context and get almost equivalent results." Long-context prompting is increasingly replacing fine-tuning for many use cases.

#### Key Takeaway

The 2025-2026 trend: **fine-tuning is narrowing to high-volume, specialized, consistency-critical use cases.** For everything else, long-context prompting + RAG is winning because it is faster to iterate and nearly as effective with modern models.

---

## 6. Streaming Responses

#### Why Streaming Matters

Without streaming, users stare at a blank screen for 2-10 seconds waiting for a complete response. Streaming via Server-Sent Events (SSE) delivers tokens as they are generated, reducing **perceived latency** to the time-to-first-token (TTFT), typically 200-500ms.

**UX impact:** Users begin reading immediately, making a 5-second generation feel instantaneous.

#### Implementation Pattern (SSE)

**Server Headers:**
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

**TypeScript (Next.js / Node.js):**
```typescript
// Server: API route with streaming
export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Client: consuming the stream
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ messages }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE events and append to UI
}
```

**Python (FastAPI):**
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import OpenAI

app = FastAPI()
client = OpenAI()

@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=request.messages,
            stream=True,
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            yield f"data: {json.dumps({'content': content})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

#### Production Best Practices

- Always handle fragmentation: tokens may arrive as partial UTF-8 sequences
- Implement client-side buffering for Markdown rendering (accumulate before parsing)
- Use `AbortController` for cancellation on the client side
- Test with multiple providers (OpenAI, Anthropic, Gemini) as SSE formats vary slightly
- Stream-then-cache: complete response streamed to user, then cached for future identical queries

### Speculative Decoding

#### What It Is

Standard LLM inference generates one token at a time (autoregressive). Speculative decoding uses a small, fast "draft" model to propose several tokens at once, then the large "target" model verifies them in a single forward pass. Accepted tokens are kept; rejected ones are regenerated. The output is **mathematically identical** to standard decoding.

#### Performance

- **Typical speedup:** 2-3x latency reduction
- **Acceptance rate threshold:** If acceptance rate < 0.55 on your traffic, benefits are marginal or negative
- **No quality loss:** Output distribution is provably identical to standard decoding

#### Production Frameworks (2025-2026)

Speculative decoding has moved from research to production, now built into:

| Framework | Status | Notes |
|---|---|---|
| **vLLM** | Production-ready | Built-in support, metrics for acceptance rate |
| **SGLang** | Production-ready | Optimized for structured generation |
| **TensorRT-LLM** | Production-ready | NVIDIA-optimized, best on A100/H100 |
| **llama.cpp** | Supported | CPU + GPU, good for edge |

#### Implementation Approaches

**1. Draft-Target (Classic)**
```
Draft model: Llama 3.1 8B
Target model: Llama 3.1 70B
Draft proposes 5 tokens → Target verifies in one pass → Accept 3-4 on average
```

**2. EAGLE-3 (Self-Speculative, 2025)**
Uses a lightweight prediction head attached to the target model's internal layers. No separate draft model needed. Higher acceptance rates.

**3. QuantSpec (2025-2026)**
Uses a quantized version of the same model as the draft, with hierarchical KV cache sharing between draft and target.

#### When to Use

- Self-hosted models with spare GPU compute
- Latency-sensitive applications (chat, code completion)
- When throughput is less important than per-request latency
- NOT beneficial when batch sizes are already large (GPU is fully utilized)

#### Pre-Deployment Checklist

1. Measure acceptance rate on your actual query distribution using vLLM/SGLang metrics endpoints
2. If acceptance rate < 0.55, reconsider or try a different draft model
3. Monitor GPU utilization -- speculative decoding trades throughput for latency
4. Test with real traffic patterns, not just benchmarks

### Parallel Tool Calls

#### The Problem

An LLM agent calling four APIs sequentially at 300ms each = **1,200ms of waiting**. Running those same calls in parallel reduces latency to **300ms** (the duration of the longest single call).

#### Implementation Patterns

**Pattern 1: Native Parallel Tool Calls (OpenAI, Anthropic)**

Modern LLM APIs can return multiple tool calls in a single response. Execute them concurrently:

```typescript
// OpenAI returns multiple tool_calls in one message
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages,
  tools,
  parallel_tool_calls: true, // OpenAI default
});

const toolCalls = response.choices[0].message.tool_calls;

// Execute all tool calls in parallel
const results = await Promise.all(
  toolCalls.map(async (call) => {
    const result = await executeFunction(call.function.name, call.function.arguments);
    return {
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify(result),
    };
  })
);

// Return all results to the model at once
messages.push(response.choices[0].message, ...results);
```

**Pattern 2: LLMCompiler (Research Framework)**

Decomposes problems into a DAG of tasks, automatically identifies independent tasks, and executes them in parallel. Demonstrated:
- **3.7x latency improvement**
- **6x cost savings**
- **9% accuracy gains**

**Pattern 3: SimpleTool (2026)**

Uses special tokens and parallel decoding to enable sub-100ms function calling on 4B-scale models. Exploits idle GPU compute during decoding.

#### Practical Guidelines

```
1. Always enable parallel_tool_calls in your API config
2. Use Promise.all() / asyncio.gather() to execute tool calls concurrently
3. Set per-tool timeouts to prevent one slow call from blocking everything
4. For dependent tool calls, build a dependency graph and parallelize where possible
5. Log individual tool call latencies to identify optimization targets
```

### Model Routing

#### Concept

Route simple queries (greetings, FAQs, classification) to fast/cheap models and complex queries (reasoning, analysis, creative work) to powerful/expensive models. This optimizes both cost and latency simultaneously.

#### Measured Results

| Benchmark | Cost Reduction | Quality Impact |
|---|---|---|
| MT Bench | Up to 85% | < 2% quality loss |
| MMLU | 30-45% | < 1% quality loss |
| GSM8K | 35% | < 1% quality loss |
| Complex tasks (MMLU-Pro) | 48.5% token reduction | +10.2% accuracy (with auto-reasoning) |

#### RouteLLM (Open Source, UC Berkeley / LMSYS)

The leading open-source routing framework. Drop-in replacement for OpenAI client.

```python
# Installation
# pip install routellm

from routellm.controller import Controller

client = Controller(
    routers=["mf"],  # Matrix factorization router
    strong_model="gpt-4o",
    weak_model="gpt-4o-mini",
)

# Use exactly like OpenAI -- routing happens automatically
response = client.chat.completions.create(
    model="router-mf-0.11593",  # Router with cost threshold
    messages=[{"role": "user", "content": "What is 2+2?"}],
)
# Simple query → routed to gpt-4o-mini automatically
```

**Router types available:**
- `mf` (Matrix Factorization): Best overall, uses weighted similarity to preference data
- `sw_ranking`: Weighted Elo-based routing
- `bert`: BERT classifier trained on preference data
- `causal_llm`: LLM-based classifier

**Key detail:** Routers trained on GPT-4 + Mixtral pairs **generalize well** to other model pairs without retraining.

#### DIY Routing (Production Pattern)

```typescript
interface RoutingConfig {
  simple: { model: "gpt-4o-mini"; maxTokens: 256 };
  complex: { model: "gpt-4o"; maxTokens: 4096 };
}

function classifyComplexity(query: string): "simple" | "complex" {
  // Heuristic-based (fast, no LLM call):
  const wordCount = query.split(" ").length;
  const hasReasoningKeywords = /\b(analyze|compare|explain why|step by step|trade-?offs)\b/i.test(query);
  const hasCodeRequest = /\b(write|implement|debug|refactor|code)\b/i.test(query);

  if (wordCount < 20 && !hasReasoningKeywords && !hasCodeRequest) {
    return "simple";
  }
  return "complex";
}

// Or use a lightweight classifier (adds ~5ms):
// Fine-tune a small BERT model on your query logs labeled by required model capability
```

#### Recommended Production Tiers (2025-2026)

```
Tier 1 - Trivial (greetings, simple lookups):
  Model: GPT-4o mini / Claude 3.5 Haiku / Gemini 2.0 Flash
  Cost: $0.15-0.25 / 1M input tokens
  Latency: 100-300ms TTFT

Tier 2 - Standard (summarization, Q&A, classification):
  Model: GPT-4o / Claude 3.5 Sonnet / Gemini 2.0 Pro
  Cost: $2.50-3.00 / 1M input tokens
  Latency: 300-800ms TTFT

Tier 3 - Complex (reasoning, analysis, code generation):
  Model: GPT-4.5 / Claude Opus 4 / Gemini 2.5 Pro
  Cost: $10-75 / 1M input tokens
  Latency: 500ms-2s TTFT
```

### Edge Deployment

#### Why Edge

- **Latency:** Eliminate network round-trip (50-200ms savings)
- **Privacy:** Data never leaves the device
- **Offline capability:** Works without internet
- **Cost:** No per-token API fees after deployment

#### Deployment Frameworks

| Framework | Best For | Platforms | Notes |
|---|---|---|---|
| **llama.cpp** | General edge/local | CPU, Apple Silicon, CUDA, Vulkan | Pure C++, GGUF format, lowest overhead |
| **ONNX Runtime** | Cross-platform inference | CPU, GPU, NPU, mobile | Broadest hardware support |
| **Ollama** | Developer-friendly local | macOS, Linux, Windows | Built on llama.cpp, easiest setup |
| **MLX** | Apple Silicon | macOS, iOS | Apple-optimized, excellent M-series perf |
| **TensorRT-LLM** | NVIDIA GPUs | Linux + NVIDIA | Highest throughput on supported hardware |
| **MLC LLM** | Mobile/web | iOS, Android, WebGPU | Universal deployment |

#### Recommended Models for Edge (2026)

| Model | Parameters | Min Hardware | Strengths |
|---|---|---|---|
| Llama 3.1 8B Instruct | 8B | 8GB RAM (Q4) | Best general-purpose |
| Qwen3-8B | 8B | 8GB RAM (Q4) | Strong reasoning, multilingual |
| Mistral Small 3.2 | 24B | 32GB RAM (Q4) | 128K context, vision, fits on MacBook |
| Phi-3 Mini | 3.8B | 4GB RAM | Smallest with good quality |
| Gemma 2 2B | 2B | 2GB RAM | Ultra-lightweight |

#### Quantization for Edge

```
FP16:     Full precision, 2x model size in bytes
INT8:     ~0.5% quality loss, 2x compression
INT4/Q4:  ~2-5% quality loss, 4x compression ← sweet spot for edge
GPTQ/AWQ: Structured quantization, best quality at INT4
GGUF Q4:  llama.cpp native, excellent CPU performance
```

**Rule of thumb:** A 7B parameter model at Q4 quantization requires ~4GB RAM and runs at 20-40 tokens/sec on M2 MacBook Air.

#### Production Architecture Pattern

```
               ┌─────────────────┐
User Query ──→ │  Edge Model (8B) │──→ Can handle? ──→ YES → Response
               └────────┬────────┘                         (< 100ms)
                         │ NO
                         ▼
               ┌─────────────────┐
               │ Cloud API (4o)  │──→ Response
               └─────────────────┘    (500ms-2s)
```

### Caching Strategies

#### Strategy 1: Prompt Caching (Provider-Native)

Both OpenAI and Anthropic offer automatic prompt caching for repeated prefixes.

**Anthropic Prompt Caching:**
- Cache long system prompts, tool definitions, or document context
- Cached tokens cost 90% less to read vs uncached
- Cache write: 25% premium on first request
- TTL: 5 minutes (refreshed on each use)
- Minimum cacheable length: 1,024 tokens (Claude 3.5 Sonnet)

**OpenAI Automatic Caching:**
- Automatic for prompts sharing a common prefix > 1,024 tokens
- 50% discount on cached input tokens
- No configuration required

#### Strategy 2: Semantic Caching

Matches queries by **meaning** (vector similarity) rather than exact string match. Returns cached responses for semantically equivalent questions.

**How It Works:**

```
1. User query → Embed to vector (768 or 1,536 dimensions)
2. Compare against stored vectors via cosine similarity
3. If similarity > threshold → Return cached response (5-20ms)
4. If no match → Call LLM, cache result for future use
```

**Configuration:**

| Parameter | Recommended | Notes |
|---|---|---|
| Similarity threshold | 0.90-0.95 | Start at 0.92, tune based on false positive rate |
| False positive target | < 3-5% | Monitor and adjust threshold |
| Vector dimensions | 1,536 (OpenAI) | Or 768 for lighter embedding models |
| TTL (stable data) | 24 hours | FAQs, policies, documentation |
| TTL (dynamic data) | 5-15 minutes | Prices, inventory, live data |
| TTL (moderate data) | 1-4 hours | Product descriptions, reviews |

**Performance:**

| Metric | Value |
|---|---|
| Cache hit latency | 5-20ms (vs 1-5 seconds for LLM call) |
| Speedup on cache hit | 50-100x (optimal), 2-4x (typical) |
| Cost reduction | 50-80% on LLM API costs |
| Hit rates (production) | Up to 80% for repetitive workloads |

**Implementation with Redis:**

```python
from redisvl.extensions.llmcache import SemanticCache

cache = SemanticCache(
    name="llm_cache",
    redis_url="redis://localhost:6379",
    distance_threshold=0.08,  # Lower = stricter (cosine distance)
)

# Check cache before calling LLM
cached = cache.check(prompt=user_query)
if cached:
    return cached[0]["response"]  # Cache hit: ~10ms

# Cache miss: call LLM and store
response = await call_llm(user_query)
cache.store(prompt=user_query, response=response, metadata={"ttl": 3600})
return response
```

**GPTCache (Open Source):**

```python
from gptcache import cache
from gptcache.adapter import openai

# Initialize with semantic matching
cache.init(
    pre_embedding_func=get_prompt,
    embedding_func=openai_embedding,
    data_manager=redis_data_manager,
    similarity_evaluation=SearchDistanceEvaluation(),
)

# Drop-in replacement for OpenAI calls
response = openai.ChatCompletion.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is your return policy?"}],
)
# First call: hits LLM, caches result
# "How do I return an item?" → semantic match → cached response in ~15ms
```

#### Strategy 3: Response Caching (Application Layer)

For deterministic or near-deterministic queries, cache at the application level:

```typescript
// Hash-based exact cache for structured inputs
const cacheKey = createHash("sha256")
  .update(JSON.stringify({ model, messages, temperature: 0 }))
  .digest("hex");

const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const response = await openai.chat.completions.create({ model, messages, temperature: 0 });
await redis.setex(cacheKey, 3600, JSON.stringify(response));
```

**When to use exact caching:** Temperature = 0, structured inputs, classification tasks, deterministic tool calls.

#### Strategy 4: Multi-Layer Cache Architecture

```
Layer 1: Application exact cache    (hash match)      → ~1ms
Layer 2: Semantic cache             (vector match)     → ~10-20ms
Layer 3: Provider prompt cache      (prefix match)     → ~200ms (50-90% discount)
Layer 4: Full LLM call             (no cache)          → 1-5 seconds
```

**Production recommendation:** Implement all four layers. Each catches a different type of redundancy, and the combined effect can reduce LLM API costs by 60-80% for typical production workloads.

---

## Quick Reference: Decision Cheat Sheet

### Should I Fine-Tune?

```
□ I have 500+ high-quality training examples
□ I'm making >100K API calls per month
□ My few-shot prompts use >1,000 tokens of examples
□ I need highly consistent output format/style
□ Prompt engineering has plateaued on my eval metrics
□ My task is well-defined and rarely changes

Score: 5-6 checked → Fine-tune
       3-4 checked → Consider fine-tuning, run a pilot
       0-2 checked → Stay with prompt engineering
```

### Latency Optimization Priority Order

```
1. Streaming (biggest perceived latency win, lowest effort)
2. Caching (biggest actual latency win for repeat queries)
3. Model routing (biggest cost win with latency benefits)
4. Parallel tool calls (critical for agent/tool-use patterns)
5. Edge deployment (for specific privacy/offline requirements)
6. Speculative decoding (for self-hosted models only)
```

---

## Multimodal AI Integration — Tools, Costs, and Production Workflows

Multimodal AI is the production layer that turns text-only AI systems into full creative
infrastructure. Image, video, voice, and vision capabilities are now API-accessible with
predictable per-unit costs — making them viable production components, not just novelties.

**The cost principle**: Multimodal generation is priced per-unit (per image, per second of video,
per minute of audio). Budget as infrastructure cost, not creative cost. The cost advantage
over traditional production is typically 10-50x.

### Image Generation — Production Selection

| Model | Cost/Image (API) | API Status | Best For |
|---|---|---|---|
| **GPT Image 1** | $0.02-0.19 (quality tiers) | Production-ready | General marketing, product mockups, ad creative |
| **GPT Image 1 Mini** | $0.005-0.05 | Production-ready | High-volume social content, drafts |
| **Flux 2 Pro v1.1** | $0.055 | BFL, Replicate, fal.ai | Artistic/editorial compositions |
| **Flux 2 Schnell** | $0.003 | Replicate, fal.ai | Bulk generation, prototyping |
| **Ideogram 2.0** | $0.04 | Ideogram API | Text-in-image (infographics, ads with copy) |
| **Midjourney v6/v8** | ~$0.05-0.15 (subscription) | No public API | Social media visuals, brand imagery |

**Decision framework**:
- Need API automation? → GPT Image 1 or Flux (Midjourney has no API)
- Need text rendered in images? → Ideogram 2.0
- Need <$0.01/image at volume? → Flux Schnell
- Need maximum aesthetic quality? → Midjourney (manual) or Flux 2 Pro (API)

### Video Generation — Production Selection

| Platform | Entry Price | API | Best For |
|---|---|---|---|
| **Runway Gen-4** | $12/mo (Standard) | Yes | Professional production, highest control |
| **Kling AI** | Free (66 credits/day) | Via partners | Cost-effective volume (20-50 videos/mo) |
| **HeyGen** | $29/mo (Creator) | Yes ($5 min) | Talking head/avatar videos, localization |
| **Pika 2.0** | $8/mo | Limited | Quick social clips, creative effects |

**Cost benchmarks**: 30-sec product demo (Runway) ~$12-28/mo plan. 50 personalized sales videos
(HeyGen API) ~$50. Social clips (Kling free tier) → $0.

### Voice AI — Production Selection

| Provider | Production Tier | Cost/Minute | Strengths |
|---|---|---|---|
| **ElevenLabs** | Pro ($99/mo) | ~$0.12 | Best voice quality, cloning fidelity, 29+ languages |
| **ElevenLabs** | Scale ($330/mo) | ~$0.10 | Low-latency streaming, production SLA |
| **Play.ht** | Creator ($39/mo) | ~$0.07 | 800+ voices, 140+ languages, fixed pricing |

**ElevenLabs is the default choice** for production voice. Clone a brand voice once, generate
unlimited variations across languages. API supports both REST and WebSocket streaming.

### Vision/Understanding — Marketing Analysis

Claude and GPT-4V can analyze images directly — competitor ads, landing page screenshots,
design mockups. This turns competitive intelligence from a manual process into a scalable pipeline.

| Capability | Claude (Opus/Sonnet) | GPT-4V/GPT-4o |
|---|---|---|
| Context window | 200K tokens (20+ images) | 128K tokens |
| Strategic analysis depth | Strongest | Strong but less nuanced |
| Batch analysis | 20+ competitor ads per conversation | ~10-15 practical |
| Cost per analysis | ~$0.01-0.05/image | ~$0.01-0.05/image |

**Production workflow**: Screenshot competitor ads from Meta/Google/LinkedIn Ad Libraries →
batch upload to Claude → structured extraction (value prop, CTA, visual hierarchy, emotional
triggers) → pattern synthesis → gap identification → creative brief generation. Real-world
result: 213 ads analyzed in 1 hour vs. 16 hours manually.

### Production Multimodal Workflows

**Full-Funnel Ad Campaign**:
```
Brief → Text → Image → Video → Voice → Deploy

Step 1: Strategy & Copy (Claude/GPT-4)         Cost: $0.50-2.00
Step 2: Static Ad Creative (20 variants)        Cost: $0.40-4.00
Step 3: Video Ads (Runway + HeyGen)             Cost: $40-250/mo
Step 4: Voice/Audio (ElevenLabs)                Cost: $5-99/mo
Step 5: Localization (5 languages)              Cost: Incremental

Total: $200-600/mo in AI tooling
Traditional production equivalent: $10,000-50,000+
```

**Personalized Sales Outreach at Scale**:
```
Trigger: New lead enters CRM →
  1. Claude generates personalized script
  2. HeyGen creates personalized avatar video
  3. ElevenLabs generates audio alternative
  4. Assets embedded in automated email sequence

Per-lead cost: $1-3 | 500 leads/mo: $500-1,500/mo
vs. Sales rep recording individual videos: 40+ hrs/mo
```

### Tool Stack by Budget

| Tier | Image | Video | Voice | Total/mo |
|---|---|---|---|---|
| **Bootstrap** (<$50) | Flux Schnell | Kling free | ElevenLabs Free | ~$20-40 |
| **Growth** ($100-300) | Midjourney Standard + Flux | Runway + Pika | ElevenLabs Creator | ~$100-150 |
| **Agency** ($500-1,500) | Midjourney Pro + GPT Image 1 | Runway + HeyGen Business | ElevenLabs Pro | ~$500-800 |
| **Enterprise** ($2,000+) | GPT Image 1 API (volume) | Runway Unlimited + HeyGen | ElevenLabs Scale | $1,500-3,000+ |

### API Integration Notes

**Production-ready APIs**: OpenAI (GPT Image 1), Black Forest Labs/Flux (via Replicate, fal.ai),
ElevenLabs (REST + WebSocket), HeyGen (REST + webhooks), Runway (REST).

**No production API**: Midjourney (third-party proxies carry TOS risk), Pika (limited).

**Multi-model aggregators**: fal.ai, Replicate, Together.ai — single API to multiple models,
pay-per-use. Use these when you need to switch between models or run comparisons.

---
