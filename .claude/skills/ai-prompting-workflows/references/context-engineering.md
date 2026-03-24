# Context Engineering — Architecture of the Information Ecosystem

Context engineering is the discipline of deciding what fills the LLM's context window, in what
order, from what sources, and at what moment. If prompt engineering is the craft of writing
instructions, context engineering is the architecture of the entire system those instructions
operate within.

> *"Most agent failures are not model failures. They are context failures."*
> — Philipp Schmid, Senior AI Engineer, Google DeepMind, 2025

> *See `prompt-craft.md` for instruction-level design. See `claude-ecosystem.md` for Claude-specific
> caching, Citations API, and tool use patterns. See `agentic-systems.md` for agent architectures
> that consume and produce context.*

---

## Table of Contents
1. The Four Context Strategies
2. Memory Systems Architecture
3. RAG (Retrieval-Augmented Generation) — Design and Optimization
4. Context Window Management
5. Prompt Caching — Implementation Guide
6. Dynamic Context Assembly
7. Context Poisoning and Drift
8. Observability and Debugging
9. Context Engineering Decision Framework

---

## 1. The Four Context Strategies

LangChain's formalization (expanded from Anthropic's agent research) — the complete toolkit
for context management:

### Write — Persist Context Externally
Don't force the model to remember everything inside the context window. Instead, persist
critical state, facts, and intermediate results to external storage where they can be reliably
accessed when needed.

**Implementations**:
- **Scratchpads**: Agent writes intermediate reasoning/results to a scratchpad that persists
  across steps. Analogous to a human taking notes while working through a problem.
- **External databases**: Vector stores (Pinecone, Weaviate, Chroma, Qdrant) for semantic
  retrieval; SQL/NoSQL for structured state
- **File system**: For longer workflows, write intermediate outputs to files and reference them
  in subsequent steps. Claude Code uses this approach extensively.
- **Key-value stores**: Redis, DynamoDB for fast state lookup in production agents

**When to use**: Multi-step workflows, conversations that need to remember state across sessions,
agents that generate intermediate results needed later.

### Select — Retrieve What's Relevant
Don't inject everything into the context at once. Retrieve only the specific information needed
for the current step. This is the RAG principle applied broadly.

**Implementations**:
- **Semantic RAG**: Embed query → retrieve top-k chunks by cosine similarity
- **Keyword search**: BM25 for exact term matching (better for proper nouns, codes, IDs)
- **Hybrid retrieval**: Combine semantic + keyword (best real-world performance — 15-25%
  better precision than either alone)
- **Structured queries**: SQL/GraphQL for database-backed knowledge
- **Tool calls**: Let the agent select its own context via tool invocations
- **Claude Citations**: Use Citations API to verify which source sections the model actually
  used. See `claude-ecosystem.md` Section 5.

**Key insight**: A focused 300-token retrieved context usually outperforms injecting an entire
50,000-token document. Precision of retrieval > volume of retrieval.

### Compress — Summarize and Compact
When context grows too large (long conversations, many tool results, large documents), compress
it rather than truncating or degrading performance.

**Implementations**:
- **Rolling summarization**: Every N turns, summarize the conversation history and replace it
  with the summary. Claude is excellent at this when given explicit summarization instructions.
- **Hierarchical summarization**: Summarize at multiple levels (sentence → paragraph → section)
  for long documents. Store all levels; inject the appropriate level based on query.
- **Context trimming**: Hard-coded heuristics to remove older messages, low-relevance retrieved
  chunks, or redundant instructions. Simpler than LLM summarization; often sufficient.
- **Trained pruners**: Specialized models (like Provence for QA tasks) that score and filter
  context relevance more accurately than heuristics.

**Compression ratios and quality tradeoffs**:

| Strategy | Compression Ratio | Quality Retention | Latency Cost |
|---|---|---|---|
| Hard truncation (oldest first) | Variable | 60-80% (loses temporal context) | None |
| Heuristic trimming | 40-60% reduction | 75-85% | <10ms |
| LLM summarization | 70-90% reduction | 85-95% | +500-2000ms per summary |
| Hierarchical summarization | 80-95% reduction | 90-95% (for targeted queries) | +1-3s upfront |
| Trained pruner | 50-70% reduction | 88-93% | +50-200ms |

**Warning**: Compression loses information. Design compression strategies to preserve the
information types that matter most for downstream tasks.

### Isolate — Separate Contexts for Separate Agents
Instead of one massive context with everything, partition context across specialized systems.
Each agent or component sees only what it needs.

**Implementations**:
- **Multi-agent architectures**: Researcher agent (web + documents), Writer agent (drafts),
  Editor agent (quality check) — each with a focused, purpose-built context.
  See `agentic-systems.md` Section 4 for full multi-agent design.
- **Sub-agent delegation**: Orchestrator passes specific sub-tasks to specialist agents with
  their own system prompts and relevant context
- **Parallel processing**: Run independent sub-tasks simultaneously with isolated contexts,
  then merge results

**When to use**: Tasks requiring different expertise, tasks where information isolation improves
reliability (e.g., keeping evaluation context separate from generation context to prevent bias),
parallelizable workflows.

---

## 2. Memory Systems Architecture

The three types of memory an AI system can have:

### Short-Term Memory (Working Memory)

| Attribute | Details |
|---|---|
| **What it is** | The current context window — everything the model "sees" right now |
| **Capacity** | 8K-200K tokens (Claude), up to 1M tokens (Gemini) |
| **Management** | Conversation history, current task state, tool results |
| **Best practice** | Treat as precious real estate. Every token must earn its place |

**Context window utilization benchmarks**:

| Utilization | Risk Level | Action |
|---|---|---|
| <25% of window | Safe | No compression needed |
| 25-60% of window | Normal | Monitor growth rate |
| 60-80% of window | Caution | Begin compression, prune old messages |
| >80% of window | Danger | Aggressive compression, consider isolation strategy |

### Long-Term Memory (Persistent Knowledge)

Information stored outside the context window, retrieved when needed:

| Storage Type | Best For | Options | Query Speed |
|---|---|---|---|
| **Vector databases** | Unstructured text, documents, semantic search | Pinecone (managed), Weaviate (open-source), Chroma (local), Qdrant (high-perf) | 10-100ms |
| **Relational databases** | Structured data, exact lookups, joins | PostgreSQL, Supabase, PlanetScale | 1-50ms |
| **Graph databases** | Entity relationships, knowledge graphs | Neo4j, Amazon Neptune | 5-100ms |
| **Key-value stores** | Fast state lookup, session data, caches | Redis, DynamoDB | 1-10ms |
| **Document stores** | Semi-structured data, flexible schemas | MongoDB, Firestore | 5-50ms |

**Design principle**: Never store everything. Be selective about what goes into long-term
memory. Too much noise in retrieval is as bad as too little relevant information.

**Embedding model selection for vector stores**:

| Model | Dimensions | Speed | Quality | Cost (per 1M tokens) |
|---|---|---|---|---|
| OpenAI text-embedding-3-small | 1536 | Fast | Good | $0.02 |
| OpenAI text-embedding-3-large | 3072 | Medium | Better | $0.13 |
| Cohere embed-v3 | 1024 | Fast | Good | $0.10 |
| Voyage AI voyage-3 | 1024 | Fast | Strong on code/tech | $0.06 |
| Open-source (e5-large-v2) | 1024 | Self-hosted | Good | GPU cost only |

### Episodic Memory (Experience Memory)

Records of past interactions and their outcomes — used to improve future behavior.

**Implementations**:
- Store (input, output, feedback) tuples from past runs
- Use these as few-shot examples in future similar tasks
- Track which approaches worked and which failed

**Schema for episodic memory storage**:
```json
{
  "episode_id": "uuid",
  "timestamp": "ISO8601",
  "task_type": "copy_generation",
  "input_summary": "B2B SaaS email for product-aware audience",
  "approach": "problem-agitate-solution lead with social proof",
  "output_quality_score": 4.2,
  "human_feedback": "Good hook, weak CTA",
  "outcome_metric": {"open_rate": 0.34, "click_rate": 0.08},
  "retrieval_embedding": [0.012, -0.034, ...]
}
```

**Application in marketing workflows**: Store (copy brief, generated copy, conversion rate)
tuples. Over time the agent gets better at generating high-converting copy for similar briefs
by retrieving successful past examples as few-shot context.

---

## 3. RAG — Design and Optimization

Retrieval-Augmented Generation is the most important context engineering pattern for knowledge-
intensive tasks. A well-designed RAG system eliminates hallucinations by grounding the model in
retrieved facts.

### RAG Architecture (Production Grade)

```
Query
  ↓
[Query Transformation]     ← Rephrase/expand query for better retrieval
  ↓
[Hybrid Retrieval]         ← Semantic (embeddings) + Keyword (BM25) search
  ↓
[Reranking]               ← Cross-encoder reranker to score relevance more accurately
  ↓
[Context Compression]     ← Extract only the relevant sentences from retrieved chunks
  ↓
[Context Injection]       ← Place at END of prompt (recency bias)
  ↓
[LLM Generation]
  ↓
[Output Validation]       ← Check: is the answer grounded in the retrieved context?
  ↓
[Citation Extraction]     ← Claude Citations API for source attribution
```

### Chunking Strategy (Critically Underrated)

How you split documents determines retrieval quality more than which embedding model you use.

**Chunking approach comparison**:

| Strategy | Chunk Size | Best For | Pros | Cons |
|---|---|---|---|---|
| Fixed-size | 200-500 tokens | Simple implementation | Fast, predictable | May split mid-sentence |
| Recursive character | 200-500 tokens | General purpose | Respects some boundaries | Not always semantic |
| Semantic (paragraph) | Variable | Structured docs | Preserves meaning | Uneven chunk sizes |
| Sentence-level | 1-3 sentences | Precision retrieval | High precision | May miss context |
| Hierarchical | Multi-level | Complex documents | Best of both worlds | Complex to implement |
| Document summary + chunks | Summary + 200-500 | Large corpus | Fast document filtering | Extra LLM cost for summaries |

**Rules**:
- **Chunk size**: 200-500 tokens for most use cases. Too small → missing context. Too large →
  dilutes relevance signal. Test with your actual queries.
- **Chunk overlap**: 10-20% overlap between adjacent chunks prevents context loss at boundaries
- **Semantic chunking**: Split at natural boundaries (paragraphs, sections) not arbitrary
  character counts
- **Metadata attachment**: Every chunk must carry source, section title, date, document ID,
  and page number

**Chunking implementation example**:
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,          # tokens (approx 2000 chars)
    chunk_overlap=50,        # 10% overlap
    separators=["\n\n", "\n", ". ", " "],  # paragraph > sentence > word
    length_function=len,
)

chunks = splitter.split_documents(documents)

# Attach metadata to every chunk
for i, chunk in enumerate(chunks):
    chunk.metadata.update({
        "chunk_index": i,
        "total_chunks": len(chunks),
        "source": document.metadata["source"],
        "section": extract_section_title(chunk),
        "date": document.metadata.get("date"),
    })
```

### Query Transformation

The user's raw query is often not the best retrieval query.

| Technique | How It Works | When to Use | Retrieval Improvement |
|---|---|---|---|
| **HyDE** | Generate hypothetical ideal answer, use as retrieval query | Complex questions, conceptual queries | +20-40% recall |
| **Query expansion** | Generate 3-5 alternative phrasings, retrieve for all | Ambiguous queries | +15-25% recall |
| **Step-back prompting** | Ask more general question first, then specific | Specific technical questions | +10-20% precision |
| **Sub-query decomposition** | Break into component questions | Multi-part questions | +25-35% completeness |

**HyDE implementation**:
```python
def hyde_transform(query: str) -> str:
    """Generate a hypothetical answer to use as retrieval query."""
    response = llm.generate(
        f"Write a short, informative paragraph that would be the ideal answer to: {query}\n"
        f"Write it as if it's from an authoritative source. 50-100 words."
    )
    return response.text

# Use the hypothetical answer as the embedding query
hyde_answer = hyde_transform(user_query)
results = vector_db.query(hyde_answer, top_k=10)
```

### Reranking

Initial vector retrieval is fast but imprecise. Reranking with a cross-encoder model
re-scores the top-20 candidates and returns the top-5 that are genuinely relevant.

| Reranker | Speed | Quality | Cost |
|---|---|---|---|
| Cohere Rerank v3 | ~100ms for 20 docs | Excellent | $2/1K queries |
| BGE reranker (open-source) | ~50ms self-hosted | Good | GPU cost only |
| Jina Reranker v2 | ~100ms | Good | $1/1K queries |
| LLM-based reranking | ~2-5s | Best (but slow) | LLM token cost |

**Impact**: Reranking typically improves precision@5 by 30-50% over raw vector similarity.
This is the single highest-ROI addition to most RAG pipelines.

```python
import cohere

co = cohere.Client(api_key="...")

# Retrieve top-20, rerank to top-5
raw_results = vector_db.query(query, top_k=20)
reranked = co.rerank(
    query=query,
    documents=[r.text for r in raw_results],
    top_n=5,
    model="rerank-english-v3.0"
)
final_chunks = [raw_results[r.index] for r in reranked.results]
```

### Evaluating RAG Quality

Before deploying a RAG system, measure these metrics. See `evaluation-testing.md` Section 9
for the full RAG evaluation framework with RAGAS.

| Metric | What It Measures | Target Score | Tool |
|---|---|---|---|
| **Context Precision** | Are retrieved chunks relevant and properly ranked? | >0.85 | RAGAS |
| **Context Recall** | Are all relevant chunks being retrieved? | >0.80 | RAGAS |
| **Faithfulness** | Is the answer grounded in retrieved context? | >0.90 | RAGAS, Claude Citations |
| **Answer Relevance** | Does the answer address the question? | >0.85 | RAGAS, LLM-as-Judge |
| **Answer Correctness** | Is the answer factually correct? | >0.85 | RAGAS |

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

results = evaluate(
    dataset=eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)
print(results)
# {'faithfulness': 0.95, 'answer_relevancy': 0.88, 'context_precision': 0.92, 'context_recall': 0.85}
```

---

## 4. Context Window Management

### The Position Rule (Critical)

```
┌─────────────────────────────────────────────────────────┐
│  POSITION 1 (TOP) — Highest Attention                   │
│  → System instructions, role, output schema, constraints │
│  → Static, cacheable content                            │
├─────────────────────────────────────────────────────────┤
│  POSITION 2 (MIDDLE) — Lowest Attention                 │
│  → Examples, background knowledge, conversation history │
│  → Don't put critical information here                  │
├─────────────────────────────────────────────────────────┤
│  POSITION 3 (END) — Second Highest Attention            │
│  → Current query, retrieved documents, user input       │
│  → Dynamic, task-specific content                       │
└─────────────────────────────────────────────────────────┘
```

See `prompt-craft.md` Section 9 for measured degradation data by context length and
information position.

### Context Budget Allocation

**For a typical production deployment (16K effective context)**:

| Component | Budget | % of Window | Notes |
|---|---|---|---|
| System prompt (static) | 500-1,000 tokens | 3-6% | Role, instructions, schema, few-shot. Cached. |
| Conversation history | 2,000-4,000 tokens | 12-25% | Compress aggressively after 10 turns |
| Retrieved context | 3,000-8,000 tokens | 19-50% | Top 3-5 chunks, reranked |
| Tool results | 1,000-3,000 tokens | 6-19% | Compress verbose tool outputs |
| Current query + reserved output | 500-2,000 tokens | 3-12% | The actual task + output room |

**For long-context deployments (200K window — Claude)**:

| Component | Budget | Notes |
|---|---|---|
| System prompt (static) | 1,000-3,000 tokens | Richer instructions, more examples |
| Full documents | 50,000-150,000 tokens | Cache with breakpoints |
| Conversation history | 5,000-20,000 tokens | Less aggressive compression |
| Retrieved supplements | 5,000-10,000 tokens | Additional context beyond docs |
| Current query + output | 2,000-5,000 tokens | Standard |

### When Context Gets Too Long

Priority-ordered strategies:

1. **Summarize conversation history** every 10-15 turns (saves 50-80% of history tokens)
2. **Compress tool results**: Extract only the relevant fields, not the full API response
3. **Reduce retrieved chunks**: Tighten retrieval to top-3 instead of top-10
4. **Enable prompt caching**: Avoid re-sending static content. See `claude-ecosystem.md` Section 4
5. **Upgrade to long-context model**: Claude (200K) for document-heavy tasks
6. **Switch to multi-agent**: Isolate sub-tasks so each agent sees only what it needs.
   See `agentic-systems.md` Section 4.

---

## 5. Prompt Caching — Implementation Guide

Prompt caching is the single highest-ROI optimization for high-volume production deployments.
Claude supports caching of prompt prefixes; cached tokens cost ~10% of fresh token price.

### Cache-Optimized Prompt Structure

```python
import anthropic

client = anthropic.Anthropic()

# Static content — cached across calls
STATIC_SYSTEM = """You are an expert analyst...
[role, instructions, output schema, few-shot examples — all static]
"""  # Must be ≥1,024 tokens for Sonnet/Opus, ≥2,048 for Haiku

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": STATIC_SYSTEM,
            "cache_control": {"type": "ephemeral"}  # 5-min TTL
        }
    ],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": REFERENCE_DOCUMENT,  # Large doc — second cache breakpoint
                    "cache_control": {"type": "ephemeral"}
                },
                {
                    "type": "text",
                    "text": dynamic_user_query  # Changes each call — not cached
                }
            ]
        }
    ]
)
```

### What to Cache

| Content Type | Tokens | Cache Priority | Savings Impact |
|---|---|---|---|
| System prompts | 200-1,000 | High | Saves on every call |
| Few-shot examples | 300-2,000 | High | Expensive to re-send |
| Reference documents | 5,000-100,000+ | Critical | Massive savings |
| Tool definitions | 500-3,000 | High | Saves on agentic calls |
| Brand voice guidelines | 200-500 | Medium | Saves on generation calls |

### Cache Economics

| Scenario | Without Caching | With Caching | Savings |
|---|---|---|---|
| 10K calls/day, 2K-token system prompt | 20M input tokens/day | ~2M token-equivalents | ~90% |
| 1K calls/day, 50K-token reference doc | 50M input tokens/day | ~5.5M token-equivalents | ~89% |
| 100 calls/day, 500-token system prompt | 50K input tokens/day | ~10K token-equivalents | ~80% |

**Cache pricing (Claude)**:
- Cache write: 25% premium over base input price (first call only)
- Cache read: 90% discount from base input price (all subsequent calls within TTL)
- TTL: 5 minutes (ephemeral). Resets on each cache hit.

**Breakeven**: Caching pays for itself after just 2-3 cache hits on the same prefix.

See `claude-ecosystem.md` Section 4 for multi-breakpoint strategies, TTL management, and
the Batches API (50% discount for async workloads).

---

## 6. Dynamic Context Assembly

Production AI systems don't have static prompts. They assemble context dynamically at runtime
from multiple sources. This is the core engineering challenge.

### The Assembly Pipeline

```python
def assemble_context(user_query: str, session_state: dict) -> list[Message]:
    # 1. Static layer (always the same, cached)
    system_prompt = load_cached_system_prompt()

    # 2. Long-term memory retrieval
    relevant_docs = vector_db.query(user_query, top_k=10)
    relevant_docs = reranker.rerank(user_query, relevant_docs, top_k=5)

    # 3. Episodic memory (similar past tasks)
    similar_episodes = episodic_store.query(
        user_query, top_k=3, min_quality_score=4.0
    )
    few_shot_examples = format_as_examples(similar_episodes)

    # 4. Working memory (conversation history — compressed)
    history = session_state["conversation_history"]
    if count_tokens(history) > 4000:
        history = compress_history(history)

    # 5. Tool results from prior steps (if any)
    tool_context = format_tool_results(session_state.get("tool_results", []))

    # 6. Assembly — order matters for attention and caching
    context = [
        {"role": "system", "content": system_prompt},      # TOP: cached static
        *format_few_shot(few_shot_examples),                # After system: examples
        *history,                                           # MIDDLE: compressed history
        {"role": "user", "content": f"""
            <retrieved_context>
            {format_chunks(relevant_docs)}
            </retrieved_context>

            <tool_results>
            {tool_context}
            </tool_results>

            <query>
            {user_query}
            </query>
        """}  # BOTTOM: dynamic, current task
    ]

    # 7. Budget check
    total_tokens = count_tokens(context)
    if total_tokens > MAX_CONTEXT_BUDGET:
        context = apply_compression(context, target=MAX_CONTEXT_BUDGET)

    return context
```

### Lazy Loading

Don't pre-load everything into context. Maintain lightweight identifiers (file paths, chunk IDs,
URLs, database keys) and load data dynamically only when the agent needs it. Claude Code uses
this approach — it has access to the file system and loads files on demand rather than pre-
loading entire codebases.

**Lazy loading pattern for agents**:
```python
tools = [
    {
        "name": "read_document",
        "description": "Read a specific document by ID. Use when you need detailed "
                       "information from a specific source. Returns the full text.",
        "parameters": {
            "document_id": {"type": "string", "description": "Document ID from the index"}
        }
    },
    {
        "name": "search_knowledge_base",
        "description": "Search the knowledge base for information relevant to a query. "
                       "Returns top 5 matching excerpts with source IDs.",
        "parameters": {
            "query": {"type": "string", "description": "Search query, under 10 words"}
        }
    }
]
# Agent decides WHEN to load context, loading only what's needed per step
```

### Context Assembly Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Kitchen sink** | Dump everything into context | RAG for retrieval, lazy loading for tools |
| **Static assembly** | Same context regardless of query | Dynamic retrieval based on query |
| **No compression** | Context grows unbounded | Rolling summaries every 10-15 turns |
| **Ignoring position** | Key info buried in middle | Start + end positions for critical content |
| **No budget tracking** | Token costs spiral | Track and enforce per-call token budgets |
| **Unvalidated retrieval** | Irrelevant chunks injected | Reranking + relevance threshold |

---

## 7. Context Poisoning and Drift

### Context Poisoning
Inaccurate or manipulated information that enters the context and corrupts outputs.

**Sources**:
- Malicious user inputs designed to override system instructions (prompt injection)
- Retrieved documents containing incorrect information
- Stale cached data that's no longer accurate
- Tool results from unreliable APIs

**Defenses**:

| Defense | What It Prevents | Implementation |
|---|---|---|
| Input sanitization | Prompt injection | Strip/escape special characters, XML tags in user input |
| XML demarcation | Instruction/data confusion | Wrap user content in `<user_input>` tags, system in `<system>` |
| Source scoring | Poisoned retrieval | Assign reliability scores to sources, filter below threshold |
| Freshness checks | Stale data | TTL on cached content, timestamp-based filtering |
| Output grounding | Hallucination from bad context | Claude Citations API, faithfulness scoring |
| Input guardrails | Injection attacks | Prompt injection classifiers (see `agentic-systems.md` Section 7) |

### Context Drift
In long-running agentic workflows, the model's effective behavior "drifts" from original
instructions as the context fills with tool results and intermediate states.

**Symptoms**: Agent starts ignoring original constraints, tone changes, formatting degrades,
accuracy drops after 10+ turns.

**Measured impact**: In multi-turn agent benchmarks, instruction adherence drops by ~15-25%
after 20 turns without mitigation. Format compliance drops by ~30% after 30 turns.

**Fixes**:

| Fix | Overhead | Effectiveness |
|---|---|---|
| Re-inject core instructions every 10 turns | +200-500 tokens | High — restores adherence |
| Checklist agent (reviews outputs vs. requirements) | +1 LLM call | Very high — catches drift actively |
| Maximum turn limit + workflow reset | None | Prevents drift entirely |
| Rolling summarization with instruction preservation | +1 LLM call per N turns | High |
| Format enforcement via tool use | None (schema-enforced) | Very high for format drift |

---

## 8. Observability and Debugging

### What to Log

In every production LLM call, log:

```python
{
    "call_id": "uuid",
    "timestamp": "ISO8601",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.7,
    "max_tokens": 1024,
    "input_tokens": 2847,
    "output_tokens": 312,
    "cache_read_tokens": 1500,
    "cache_creation_tokens": 0,
    "latency_ms": 2340,
    "cost_usd": 0.0024,
    "prompt_hash": "sha256:abc...",        # Track which prompt version
    "retrieval_chunks": 5,
    "retrieval_avg_score": 0.87,
    "output_validation": "pass",
    "output_schema_valid": true,
    "quality_score": null                   # Filled async by LLM-as-Judge sampling
}
```

### Tracing Agentic Workflows

Use a tracing framework to capture the full execution trace:

| Tool | Type | Best For | Cost |
|---|---|---|---|
| **LangSmith** | Commercial | LangChain ecosystem, annotation queues | Paid tiers |
| **Arize Phoenix** | Open-source | Self-hosted, OpenTelemetry-based | Free (infra cost) |
| **Braintrust** | Commercial | Experiments, scoring, dataset management | Paid tiers |
| **W&B Weave** | Partial OSS | ML teams already on W&B | Paid tiers |
| **Helicone** | Commercial | Simple proxy-based logging | Free tier + paid |

See `evaluation-testing.md` Section 5 for LangSmith evaluation patterns and Section 6 for
Phoenix and Weave comparison.

What to capture in traces:
- Which tools were called, in what order
- What context was passed to each tool
- Where the workflow branched
- Where failures occurred
- Token usage and latency per step
- Quality scores per step (when available)

Without tracing, debugging agentic failures is nearly impossible.

### The Context Failure Checklist

When an LLM system underperforms, run through this diagnostic before assuming model failure:

| Check | Question | Fix If Failed |
|---|---|---|
| **Completeness** | Did the model receive all information it needed? | Add missing context sources |
| **Position** | Was key info in the right position? (not buried middle) | Reorder context assembly |
| **Format** | Was information parseable/readable? | Clean up retrieved chunks |
| **Length** | Was the context too long? (degradation past ~60% utilization) | Compress or split |
| **Contradiction** | Was there contradictory information? | Deduplicate, source prioritization |
| **Schema** | Was the output schema specified clearly? | Tighten schema spec |
| **Uncertainty** | Was model given permission to express doubt? | Add uncertainty permission |
| **Retrieval quality** | Were retrieved docs relevant and accurate? | Check retrieval metrics |
| **Injection risk** | Could user input have overridden instructions? | Add input sanitization |
| **Staleness** | Is cached/retrieved data still current? | Check freshness, TTLs |

---

## 9. Context Engineering Decision Framework

Use this to select the right context strategy for any new system:

### Step 1: What's the Context Source?

| Source Type | Strategy | Implementation |
|---|---|---|
| Large static documents (brand guides, docs) | Cache + lazy load | Prompt caching with breakpoints |
| Dynamic knowledge base | RAG | Vector DB + reranking |
| User conversation history | Compress | Rolling summarization |
| Real-time data (APIs, search) | Select | Tool use, lazy loading |
| Multi-step intermediate results | Write + Select | Scratchpad or external store |
| Multiple expert domains | Isolate | Multi-agent with focused contexts |

### Step 2: What's the Volume?

| Volume | Optimization Priority | Key Actions |
|---|---|---|
| <100 calls/day | Quality first | Focus on retrieval quality, skip caching |
| 100-1K calls/day | Quality + cost | Enable prompt caching, right-size models |
| 1K-10K calls/day | Cost + quality | Aggressive caching, model routing, batch when possible |
| 10K+ calls/day | Cost + latency + quality | Full optimization: caching, batching, model cascade, monitoring |

### Step 3: What's the Quality Bar?

| Quality Requirement | Context Strategy |
|---|---|
| Must be factually grounded | RAG + Citations + faithfulness scoring |
| Must cite sources | Claude Citations API (see `claude-ecosystem.md` Section 5) |
| Must handle long documents | Long-context + caching + positional awareness |
| Must maintain consistency over time | Episodic memory + drift detection |
| Must scale to many topics | Hybrid retrieval + domain-specific indices |

See `evaluation-testing.md` for eval frameworks to measure context quality. See
`production-optimization.md` for cost optimization strategies at scale.
