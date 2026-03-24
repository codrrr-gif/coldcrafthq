# Agentic Systems — Agents, Orchestration, and Production Architecture

The frontier of AI deployment. Agentic systems move from single LLM calls to multi-step,
tool-using, decision-making systems that can complete complex goals autonomously.

> *"Workflows are systems where LLMs and tools are orchestrated through predefined code paths.
> Agents are systems where LLMs dynamically direct their own processes and tool usage."*
> — Anthropic, Building Effective Agents, 2024

> *See `claude-ecosystem.md` for Claude Agent SDK implementation, tool use API, and extended
> thinking in agents. See `evaluation-testing.md` Section 9 for agent-specific eval metrics.
> See `automation-platforms.md` for no-code agent deployment on n8n/Make.*

---

## Table of Contents
1. The Fundamental Architecture Decision: Workflow vs. Agent
2. The Augmented LLM — The Atomic Unit
3. The 7 Agentic Design Patterns
4. Multi-Agent System Design
5. Model Context Protocol (MCP) — The Integration Standard
6. Tool Design — The Most Underrated Skill
7. Error Handling, Guardrails, and Safety
8. Production Observability and Cost Governance
9. Evaluation for Agentic Systems
10. When NOT to Use Agents
11. Agent Framework Comparison

---

## 1. The Fundamental Architecture Decision: Workflow vs. Agent

Before writing a single line of code or a single prompt, answer this:

**Does the task require dynamic decision-making, or is the process knowable in advance?**

| | Workflow | Agent |
|---|---|---|
| **Control flow** | Predefined code paths | LLM-directed |
| **Predictability** | High (95%+ deterministic) | Lower (70-90% predictable) |
| **Debuggability** | High (trace each step) | Lower (LLM decisions vary) |
| **Flexibility** | Low (fixed paths) | High (adapts to context) |
| **Best for** | Repeatable, structured tasks | Open-ended, dynamic tasks |
| **Cost per run** | Lower (fewer LLM calls, 2-5 calls) | Higher (5-20+ LLM calls) |
| **Latency** | Predictable (1-10s) | Variable (5-60s+) |
| **Risk** | Lower | Higher |
| **Eval complexity** | Unit tests per step | End-to-end + per-step |

**The most successful production deployments use workflows wherever possible and agents only
where the task genuinely requires dynamic decision-making.** Resist the urge to build agents.
A well-designed workflow is almost always more reliable, cheaper, and easier to debug.

### When to Use a Workflow

- Document processing pipelines (extract → validate → transform → store)
- Content generation with a known structure (research → outline → draft → edit)
- Data enrichment (fetch → classify → score → write)
- Any process where you can draw a clear flowchart before building

### When to Use an Agent

- The path to the goal depends on information discovered during execution
- The task requires choosing between tools based on intermediate results
- The solution space is too large or unpredictable to enumerate in advance
- Error recovery requires judgment, not just retry logic

### The Decision Matrix

```
Can I solve this with a single LLM call + retrieval?
  → Yes: Do that. Stop. (Cost: $0.001-0.01)

Can I express the full process as a predefined workflow?
  → Yes: Build a workflow. Stop. (Cost: $0.01-0.10)

Does the task require dynamic tool selection based on intermediate results?
  → Yes: Consider an agent. Then verify:
    ☐ I have evals (see evaluation-testing.md)
    ☐ I can add human-in-the-loop checkpoints
    ☐ The cost ($0.10-1.00+ per run) is acceptable
    ☐ The latency (5-60s) is acceptable
    → All yes: Build the agent.
    → Any no: Solve the missing piece first.
```

---

## 2. The Augmented LLM — The Atomic Unit

Every agentic system is built from augmented LLMs. An augmented LLM is a base model enhanced with:

- **Retrieval**: Access to external knowledge (RAG, web search, databases).
  See `context-engineering.md` Section 3.
- **Tools**: Ability to take actions (APIs, code execution, file I/O, browser)
- **Memory**: Persistence across steps (context window + external storage).
  See `context-engineering.md` Section 2.

The augmented LLM generates its own search queries, selects appropriate tools, determines what
to remember, and decides what information to pass forward. This is the fundamental shift from
"model that answers questions" to "model that completes goals."

### Augmented LLM Implementation (Claude Agent SDK)

```python
from claude_agent_sdk import Agent, tool

@tool
def search_web(query: str, num_results: int = 5) -> str:
    """Search the web for current information."""
    results = brave_search(query, count=num_results)
    return format_results(results)

@tool
def read_document(document_id: str) -> str:
    """Read a document from the knowledge base by ID."""
    return knowledge_base.get(document_id)

agent = Agent(
    model="claude-sonnet-4-20250514",
    tools=[search_web, read_document],
    system_prompt="You are a research analyst. Use tools to gather information, "
                  "then synthesize findings into a structured brief.",
    max_turns=10,
)

result = agent.run("Analyze the competitive landscape for AI code editors in 2026")
```

See `claude-ecosystem.md` Section 1 for full Agent SDK patterns including guardrails,
multi-agent handoffs, and streaming.

---

## 3. The 7 Agentic Design Patterns

### Pattern 1: ReAct (Reason + Act)
The most fundamental agentic pattern. The model alternates between thinking and acting:

```
Thought: I need to find the current price of X. I'll use the web search tool.
Action: web_search("current price of X 2026")
Observation: [search results]
Thought: The results show $45.99. Now I need to compare with competitor pricing.
Action: web_search("competitor Y price of X")
Observation: [results]
Thought: Competitor Y charges $52.00. I can now write the comparison.
Final Answer: [comparison output]
```

**Implementation with Claude tool use**:

```python
import anthropic

client = anthropic.Anthropic()

tools = [
    {
        "name": "web_search",
        "description": "Search the web for current information. Returns top results.",
        "input_schema": {
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Search query, under 10 words"}
            }
        }
    }
]

messages = [{"role": "user", "content": "Find current pricing for product X vs competitors"}]

# Agent loop
while True:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        tools=tools,
        messages=messages,
    )

    if response.stop_reason == "end_turn":
        # Agent is done — extract final text
        final_answer = [b.text for b in response.content if b.type == "text"]
        break

    if response.stop_reason == "tool_use":
        # Extract tool calls and execute
        tool_calls = [b for b in response.content if b.type == "tool_use"]
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for tc in tool_calls:
            result = execute_tool(tc.name, tc.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc.id,
                "content": result
            })
        messages.append({"role": "user", "content": tool_results})
```

**Performance benchmarks**:

| Metric | ReAct | Simple Sequential | Improvement |
|---|---|---|---|
| Task completion (research tasks) | 78-85% | 55-65% | +20-25% |
| Avg. tool calls per task | 3-7 | N/A (fixed) | More adaptive |
| Avg. latency | 8-20s | 3-8s | Higher latency |
| Cost per task | $0.05-0.30 | $0.01-0.05 | Higher cost |

**When to use**: Multi-step research tasks, tasks requiring tool selection based on intermediate
results, debugging workflows.

### Pattern 2: Reflection
The model generates an output, then critiques it before returning the final result.

```
Step 1: Generate initial output
Step 2: Self-critique (explicit prompt: "Review your output against these criteria: ...")
Step 3: Revise based on critique
Step 4: Return final output
```

**Reflection prompt template**:
```xml
<task>
Review the following {{OUTPUT_TYPE}} against these quality criteria.
Be specific about what needs to change. Cite exact text that should be rewritten.
</task>

<criteria>
1. {{CRITERION_1}} (weight: {{WEIGHT}})
2. {{CRITERION_2}} (weight: {{WEIGHT}})
3. {{CRITERION_3}} (weight: {{WEIGHT}})
</criteria>

<output_to_review>
{{GENERATED_OUTPUT}}
</output_to_review>

<output_format>
Return JSON:
{
  "scores": {"criterion_1": float, "criterion_2": float, "criterion_3": float},
  "weighted_total": float,
  "top_weakness": string,
  "specific_fixes": [{"original_text": string, "revised_text": string, "reason": string}],
  "passes_quality_bar": boolean  // true if weighted_total >= {{THRESHOLD}}
}
</output_format>
```

**Variants**:
- **Self-reflection**: Same model critiques its own output (cheapest, 1 extra call)
- **LLM-as-Judge**: Separate model evaluates (more objective, 1 extra call with different model)
- **Checklist reflection**: Model checks against a specific quality rubric (most structured)
- **Multi-round reflection**: Iterate until quality bar is met (2-5 rounds typical)

**Measured impact**: Reflection adds 1-3 LLM calls but improves output quality by 15-30%
on subjective generation tasks (copy, analysis, summarization). Diminishing returns after
2 reflection rounds in most cases.

### Pattern 3: Tool Use
The model has access to a defined set of tools and selects which to use based on the task.

**Tool selection accuracy by tool count**:

| Number of Tools | Selection Accuracy (Claude Sonnet) | Selection Accuracy (GPT-4.1) |
|---|---|---|
| 1-5 tools | 95-98% | 93-97% |
| 6-15 tools | 88-95% | 85-92% |
| 16-30 tools | 80-90% | 75-88% |
| 30+ tools | 70-85% | 65-80% |

**Implication**: Keep tool sets focused. If you need >15 tools, use a tool-routing layer
or multi-agent architecture to partition tools across specialists.

See Section 6 for full tool design principles.

### Pattern 4: Planning
For complex multi-step tasks, have the model create an explicit plan before executing.

```xml
<instructions>
Before taking any actions, create a step-by-step plan to accomplish the goal.

Your plan must include:
1. Each step described in one sentence
2. Which tool(s) each step requires
3. What information each step needs from prior steps
4. Estimated confidence that each step will succeed (high/medium/low)

After creating the plan, pause for review before executing.
</instructions>

<goal>
{{GOAL}}
</goal>

<available_tools>
{{TOOL_LIST}}
</available_tools>

<output_format>
Return JSON:
{
  "plan": [
    {"step": int, "description": string, "tools": [string], "depends_on": [int], "confidence": string}
  ],
  "estimated_total_steps": int,
  "risks": [string],
  "ready_to_execute": boolean
}
</output_format>
```

**When to use**: Tasks with 5+ steps, tasks where early mistakes compound, tasks involving
irreversible actions (sending emails, making purchases, modifying databases).

**Human-in-the-loop at plan review**: For client work, having the agent generate a plan and
asking for approval before execution is one of the highest-value checkpoints you can add.
Cost: ~30 seconds of human time. Value: prevents expensive multi-step failures.

### Pattern 5: Multi-Agent Collaboration
Specialist agents, each with focused context and tools, collaborate to complete complex tasks.
See Section 4 for full multi-agent design.

### Pattern 6: Sequential Workflow (Pipeline)
Linear pipeline of LLM calls where each step's output is the next step's input.

```python
# Example: Research → Brief → Copy pipeline
async def content_pipeline(topic: str) -> dict:
    # Step 1: Research (can use agent with tools)
    research = await research_agent.run(topic)

    # Step 2: Strategy brief (single LLM call)
    brief = await strategy_llm.generate(
        system="You are a copy strategist...",
        user=f"<research>{research}</research>\nCreate a copy strategy brief."
    )

    # Step 3: First draft (single LLM call)
    draft = await writer_llm.generate(
        system="You are an elite copywriter...",
        user=f"<brief>{brief}</brief>\nWrite the first draft."
    )

    # Step 4: Review (reflection pattern)
    review = await reviewer_llm.generate(
        system="You are a senior editor...",
        user=f"<draft>{draft}</draft>\nReview against the brief: <brief>{brief}</brief>"
    )

    # Step 5: Final revision (conditional — only if review finds issues)
    if review.needs_revision:
        final = await writer_llm.generate(
            system="You are an elite copywriter...",
            user=f"<draft>{draft}</draft>\n<feedback>{review}</feedback>\nRevise."
        )
    else:
        final = draft

    return {"research": research, "brief": brief, "final_copy": final, "review": review}
```

**Characteristics**: Predictable, debuggable, each step can be independently tested and evaluated.
This is the most common and most reliable agentic pattern for production systems.

**Cost profile for a typical content pipeline**:

| Step | Model | Input Tokens | Output Tokens | Cost |
|---|---|---|---|---|
| Research | Sonnet + tools | ~5,000 | ~1,500 | ~$0.04 |
| Strategy | Sonnet | ~2,000 | ~800 | ~$0.02 |
| Draft | Sonnet | ~3,000 | ~2,000 | ~$0.04 |
| Review | Haiku | ~5,000 | ~500 | ~$0.006 |
| Revision | Sonnet | ~5,500 | ~2,000 | ~$0.05 |
| **Total** | | | | **~$0.16** |

### Pattern 7: Human-in-the-Loop
Strategic checkpoints where a human reviews, corrects, or approves before the agent continues.

**Where to add checkpoints** (ordered by risk-reduction value):

| Checkpoint | Risk Level | Implementation |
|---|---|---|
| Before irreversible actions | Critical | Must-have. Block until approved. |
| After planning (before execution) | High | Review plan, modify if needed |
| After quality-sensitive generation | Medium | Before client/customer delivery |
| When confidence below threshold | Medium | `if confidence < 0.7: escalate()` |
| After external data retrieval | Low-Medium | Verify data quality before use |

**Implementation**: The agent outputs a structured "checkpoint request" with its current state,
proposed next action, and a confidence score. A human reviews and either approves, corrects, or
escalates. This pattern is not a failure of autonomy — it's good system design.

```python
class CheckpointRequest:
    current_state: dict       # What the agent has done so far
    proposed_action: str      # What it wants to do next
    confidence: float         # 0-1 confidence in the action
    risk_level: str          # "low", "medium", "high", "critical"
    context_summary: str     # Brief summary for the reviewer
    estimated_cost: float    # Cost of the proposed action
```

See `automation-platforms.md` Section 5 (Pattern 4: The Approval Gate) for implementation
in n8n and Make.com.

---

## 4. Multi-Agent System Design

### When Multi-Agent Wins

- Tasks too long to fit in one context window (>200K tokens of state)
- Tasks requiring fundamentally different expertise or personas (researcher ≠ writer ≠ editor)
- Tasks where parallelism reduces latency (independent sub-tasks running simultaneously)
- Tasks where isolation improves quality (evaluation agent must not see the generation agent's
  reasoning to remain unbiased)

### When Single-Agent is Better

- Total context fits in one window
- Task doesn't benefit from specialization
- Inter-agent communication overhead exceeds benefit
- You need simple debugging (multi-agent traces are complex)

### Architecture Types

**Orchestrator + Workers** (most common in practice):
```
Orchestrator Agent
├── Planner: breaks goal into sub-tasks
├── Dispatcher: routes sub-tasks to specialist workers
└── Aggregator: combines results into final output

Worker Agents (each with focused context + tools)
├── Research Worker: web search, document retrieval
│   Model: Sonnet | Tools: web_search, read_doc | Context: query + research guidelines
├── Analysis Worker: data processing, synthesis
│   Model: Sonnet | Tools: calculate, query_db | Context: data + analysis framework
├── Writing Worker: generation, formatting
│   Model: Sonnet | Tools: none | Context: brief + brand voice + examples
└── QA Worker: evaluation, fact-checking
    Model: Haiku | Tools: search, verify | Context: output + rubric (NO generation context)
```

**Claude Agent SDK multi-agent handoff**:
```python
from claude_agent_sdk import Agent

research_agent = Agent(
    model="claude-sonnet-4-20250514",
    tools=[web_search, read_document],
    system_prompt="You are a research specialist..."
)

writing_agent = Agent(
    model="claude-sonnet-4-20250514",
    tools=[],  # No tools — pure generation
    system_prompt="You are an elite copywriter..."
)

# Orchestrator can hand off between agents
orchestrator = Agent(
    model="claude-sonnet-4-20250514",
    handoffs=[research_agent, writing_agent],
    system_prompt="You coordinate research and writing tasks..."
)
```

See `claude-ecosystem.md` Section 1 for full Agent SDK handoff patterns.

**Peer Network** (for collaborative tasks):
Agents communicate laterally, passing work between them without a central orchestrator. More
complex to build and debug. Use only when the task genuinely requires peer-to-peer collaboration.

### Inter-Agent Communication

- Pass structured outputs (JSON, not free text) between agents
- Include context summaries, not full conversation history, when passing state
- Define a shared state object that all agents read from and write to
- Log every inter-agent message for debugging

**Inter-agent message schema**:
```json
{
  "from_agent": "research-worker",
  "to_agent": "orchestrator",
  "message_type": "task_complete",
  "task_id": "research-competitive-landscape",
  "status": "success",
  "output_summary": "Found 5 competitors with pricing data. Key finding: ...",
  "full_output_ref": "s3://outputs/research-12345.json",
  "token_usage": {"input": 4500, "output": 1200},
  "cost_usd": 0.032,
  "confidence": 0.85,
  "duration_ms": 12400
}
```

### Multi-Agent Cost Governance

| Architecture | Typical LLM Calls | Typical Cost Range | Latency |
|---|---|---|---|
| Single agent (ReAct) | 3-10 | $0.05-0.30 | 5-20s |
| Pipeline (sequential) | 3-6 | $0.05-0.20 | 5-15s |
| Orchestrator + 2 workers | 5-15 | $0.10-0.50 | 8-30s |
| Orchestrator + 4 workers | 8-25 | $0.20-1.00 | 10-45s |
| Full multi-agent (parallel) | 10-30+ | $0.30-2.00+ | 10-30s (parallel) |

**Budget enforcement**: Set per-run cost caps. Kill the run if it exceeds the cap.
See Section 8 for implementation.

### Avoiding Multi-Agent Pitfalls

| Pitfall | Cause | Mitigation |
|---|---|---|
| **Error amplification** | Mistake in step 1 compounds downstream | Validation at each hand-off point |
| **Context explosion** | Each agent receives upstream context | Summarize and compress before hand-off |
| **Inconsistency** | Different agents produce conflicting formats | Shared output schemas enforced at every step |
| **Unbounded cost** | Agent loops without termination | Per-run cost caps + max-step limits |
| **Debugging complexity** | Can't trace which agent caused failure | Structured logging with correlation IDs |

---

## 5. Model Context Protocol (MCP) — The Integration Standard

MCP (released by Anthropic, 2024) is the emerging standard for connecting LLMs to external
tools, APIs, and data sources. Think of it as USB-C for AI integrations — a universal connector
that eliminates custom integration code for every tool.

### What MCP Provides

| Primitive | Description | Examples |
|---|---|---|
| **Resources** | Data the LLM can read | Files, database records, API responses |
| **Tools** | Functions the LLM can call | Search, write, compute, send |
| **Prompts** | Pre-defined prompt templates | Common task patterns |

### MCP vs. Custom Tool Integration

| Aspect | Custom Integration | MCP |
|---|---|---|
| Setup time per tool | Hours-days | Minutes (if MCP server exists) |
| Standardization | Unique per tool | Universal protocol |
| Discovery | Manual documentation | Automatic tool discovery |
| Maintenance | Per-tool updates | Update MCP server only |
| Security | Varies | Standardized auth patterns |
| Ecosystem | Proprietary | Growing open ecosystem |

### MCP in Practice

```python
# Without MCP: custom integration per tool
def search_google(query):
    ...custom code...

def read_file(path):
    ...custom code...

def query_database(sql):
    ...custom code...

# With MCP: standardized interface
mcp_servers = [
    {"type": "url", "url": "https://mcp.google.com/search"},
    {"type": "url", "url": "https://filesystem.mcp.local"},
    {"type": "url", "url": "https://db.mcp.company.com"}
]
# The LLM discovers available tools automatically via the MCP protocol
```

### Key MCP Servers (2025-2026 Ecosystem)

| Category | MCP Server | What It Provides |
|---|---|---|
| **Search** | Brave Search MCP | Web search with structured results |
| **Code** | GitHub MCP | Repo access, PR creation, issue management |
| **Files** | Filesystem MCP | Read/write local files |
| **Database** | PostgreSQL MCP | SQL queries, schema inspection |
| **Browser** | Puppeteer/Playwright MCP | Web scraping, interaction |
| **Communication** | Slack MCP | Send messages, read channels |
| **Documents** | Google Drive MCP | Read/write Google Docs, Sheets |
| **Automation** | n8n MCP Server | Trigger n8n workflows as tools |

See `claude-ecosystem.md` Section 8 for the full MCP ecosystem and Claude Desktop/Code
configuration. See `automation-platforms.md` Section 7 for MCP integration with n8n and Make.

### Building MCP-Ready Workflows

For the marketing/content stack:
- CRM data: MCP server over your CRM API
- Document storage: MCP server over Google Drive / Notion
- Email: MCP server over Gmail API
- Analytics: MCP server over GA4 / analytics database
- Web research: MCP server for web search + scraping

### Security Considerations

MCP servers run with the permissions you grant them. Principle of least privilege applies:
- Give each MCP server only the access it needs for its role
- Audit tool invocations in production logs
- Sanitize all LLM-generated inputs before they reach external APIs (prompt injection defense)
- Use OAuth2 or bearer tokens for authentication — never embed secrets in MCP URLs
- Implement rate limiting on MCP servers exposed to agents

---

## 6. Tool Design — The Most Underrated Skill

The tools you give an agent determine 80% of its performance. Poorly designed tools cause
more agent failures than poor prompts.

### Tool Design Principles

**1. One tool, one job**
Tools should be atomic and focused. A `search_and_summarize` tool is worse than a `search`
tool + a `summarize` tool. Atomic tools compose better and fail more predictably.

**2. Names must be self-describing**
The agent selects tools by name + description. `get_data` is useless.
`get_customer_purchase_history_by_date_range` is a tool the model will use correctly.

| Bad Name | Good Name | Why |
|---|---|---|
| `get_data` | `get_customer_purchase_history` | Specific to function |
| `do_thing` | `send_slack_notification` | Describes the action |
| `process` | `classify_support_ticket_priority` | Describes the transformation |
| `search` | `search_product_catalog_by_name` | Scoped to specific domain |

**3. Descriptions must make the selection decision obvious**
Include: what the tool does, when to use it, when NOT to use it, and what it returns.

```python
tools = [
    {
        "name": "search_web",
        "description": """Search the web for current information. Use when you need:
        - Recent news or events (after your training cutoff)
        - Current prices, statistics, or data
        - Information about specific companies or people
        Do NOT use for general knowledge questions you can answer directly.
        Returns: list of {title, url, snippet} objects, max 5 results.""",
        "input_schema": {
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Specific search query. Under 10 words."},
                "num_results": {"type": "integer", "default": 5, "maximum": 10}
            }
        }
    }
]
```

**4. Return types must be consistent**
Tools that return different formats in different conditions break downstream parsing. Always
return the same structure. Use null/empty values for missing data rather than changing schema.

**5. Include error states in the return schema**
```json
{
  "success": true,
  "data": {"customer_name": "Acme Corp", "total_purchases": 15},
  "error": null,
  "error_code": null
}
```

vs. error case:
```json
{
  "success": false,
  "data": null,
  "error": "Customer not found",
  "error_code": "NOT_FOUND"
}
```

**6. Make tools idempotent where possible**
Calling a read tool twice should return the same result. For write tools, design so that
duplicate calls don't cause duplicate writes (deduplication keys, upsert semantics).

### Tool Design Checklist

Before deploying any tool to an agent:

- [ ] Name is self-describing (no abbreviations, no ambiguity)
- [ ] Description includes when to use AND when NOT to use
- [ ] All parameters are typed with descriptions
- [ ] Return schema is documented and consistent
- [ ] Error states return the same schema structure
- [ ] Tool is idempotent (or clearly documented as non-idempotent)
- [ ] Tool has a timeout (prevent hanging on external APIs)
- [ ] Tool validates its own inputs before execution
- [ ] Tool has rate limiting (prevent agent from hammering APIs)

---

## 7. Error Handling, Guardrails, and Safety

### Retry Logic

```python
import time
import anthropic

def call_with_retry(fn, max_retries=3, backoff_factor=2):
    for attempt in range(max_retries):
        try:
            result = fn()
            if validate(result):
                return result
            # Schema validation failed — re-request with guidance
            if attempt < max_retries - 1:
                result = fn(extra_instruction=(
                    "Your previous response didn't match the required format. "
                    f"Error: {get_validation_error(result)}. Please try again."
                ))
                if validate(result):
                    return result
        except anthropic.RateLimitError:
            time.sleep(backoff_factor ** attempt * 2)  # Longer backoff for rate limits
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:  # Server error — retry
                time.sleep(backoff_factor ** attempt)
            else:
                raise  # Client error — don't retry
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(backoff_factor ** attempt)
    raise MaxRetriesExceeded(f"Failed after {max_retries} attempts")
```

### Circuit Breakers

For external tool calls: if a tool fails 3+ times in a row, stop calling it and escalate to
a human or fallback behavior. Don't let a failing external API send your agent into an infinite
retry loop.

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=3, reset_timeout=300):
        self.failures = 0
        self.threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.last_failure_time = 0
        self.state = "closed"  # closed=normal, open=blocking, half-open=testing

    def call(self, fn):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpen("Tool temporarily disabled")

        try:
            result = fn()
            self.failures = 0
            self.state = "closed"
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.threshold:
                self.state = "open"
            raise
```

### Output Validation

Every output that leaves an LLM call and enters a downstream system must be validated:

| Validation Type | Tool | Check |
|---|---|---|
| JSON schema | `jsonschema`, Pydantic | Structure, types, required fields |
| Business logic | Custom code | Values in acceptable ranges, valid references |
| Factual grounding | Claude Citations, LLM-as-Judge | Claims supported by retrieved sources |
| PII detection | Regex + NER models | No personal data in outputs |
| Toxicity/policy | Moderation APIs | Safe for user-facing outputs |

### Guardrails Framework

**Input guardrails** (run BEFORE the LLM call):

| Guardrail | Method | Cost |
|---|---|---|
| Prompt injection detection | Classifier model or regex patterns | <$0.001 per check |
| PII detection and masking | NER model + regex | <$0.001 per check |
| Input length limits | Token counting | Free |
| Input schema validation | JSON schema check | Free |
| Rate limiting per user | Token bucket algorithm | Free |

**Output guardrails** (run AFTER the LLM call):

| Guardrail | Method | Cost |
|---|---|---|
| Schema validation | jsonschema/Pydantic | Free |
| PII detection in outputs | NER model + regex | <$0.001 per check |
| Hallucination detection | Citations API + faithfulness scoring | $0.001-0.01 |
| Content policy check | Moderation endpoint | $0.001 per check |
| Confidence thresholding | Parse confidence score from output | Free |

Use libraries like Guardrails AI, Nemo Guardrails, or custom validators depending on your stack.

### Human Escalation Triggers

Define conditions under which the agent must stop and escalate:

```python
ESCALATION_RULES = {
    "confidence_below_threshold": lambda result: result.confidence < 0.7,
    "tool_failure_after_retries": lambda ctx: ctx.retry_count >= 3,
    "detected_ambiguity": lambda input: input.ambiguity_score > 0.8,
    "irreversible_action": lambda action: action.type in ["delete", "publish", "send", "pay"],
    "unexpected_input": lambda input: not input_validator.is_valid(input),
    "cost_exceeded": lambda ctx: ctx.total_cost > ctx.cost_cap,
    "max_steps_exceeded": lambda ctx: ctx.step_count > ctx.max_steps,
}
```

---

## 8. Production Observability and Cost Governance

### What to Instrument

Every agent run should emit a structured trace:

```python
{
    "run_id": "uuid",
    "timestamp": "ISO8601",
    "agent": "research-agent-v1.2",
    "task": "competitive-analysis",
    "trigger": "api_call",
    "steps": [
        {
            "step": 1,
            "type": "llm_call",
            "model": "claude-sonnet-4-20250514",
            "input_tokens": 1847,
            "output_tokens": 312,
            "cache_read_tokens": 1200,
            "latency_ms": 2340,
            "cost_usd": 0.0024,
            "thinking_tokens": 0
        },
        {
            "step": 2,
            "type": "tool_call",
            "tool": "web_search",
            "input": {"query": "competitor pricing 2026"},
            "success": true,
            "latency_ms": 890
        },
        {
            "step": 3,
            "type": "llm_call",
            "model": "claude-sonnet-4-20250514",
            "input_tokens": 3200,
            "output_tokens": 800,
            "cache_read_tokens": 1200,
            "latency_ms": 3100,
            "cost_usd": 0.0072
        }
    ],
    "total_cost_usd": 0.0096,
    "total_latency_ms": 8240,
    "total_steps": 3,
    "success": true,
    "output_quality_score": 0.87,
    "human_escalation": false
}
```

### Cost Governance in Production

| Strategy | Impact | Implementation |
|---|---|---|
| **Per-run cost caps** | Prevents runaway costs | Kill run if cost > $X. Log and alert. |
| **Max step limits** | Prevents infinite loops | Terminate after N steps with partial result |
| **Model right-sizing** | 50-80% cost reduction | Haiku for classification, Sonnet for generation |
| **Prompt caching** | 60-90% input cost reduction | Static content cached (see `claude-ecosystem.md`) |
| **Batches API** | 50% cost reduction | Queue non-urgent work (see `claude-ecosystem.md` Section 6) |
| **Token budget prompting** | 10-30% output cost reduction | "Respond in under 200 words" |
| **Model routing** | 40-70% average cost reduction | Route to smallest capable model per task |
| **Parallel tool calls** | Latency reduction (not cost) | Execute independent tools simultaneously |

**Monitor cost per successful output**, not just cost per run. If quality drops and reruns
increase, cost per output may be rising even if cost per run is constant.

See `production-optimization.md` for model routing implementation, latency optimization
patterns, and fine-tuning cost breakpoints.

---

## 9. Evaluation for Agentic Systems

### The Eval Hierarchy

**Level 1: Unit tests for individual steps**
Test each LLM call and tool independently. Does the research step return relevant results?
Does the writing step follow the schema?

**Level 2: Integration tests for workflows**
Test the full pipeline with representative inputs. Does the end-to-end output meet quality criteria?

**Level 3: LLM-as-Judge**
For subjective outputs (copy quality, answer quality, reasoning quality), use a separate LLM
call with a defined rubric to score outputs. See `evaluation-testing.md` Section 7.

**Level 4: Production monitoring**
Track output quality metrics in production using automated scoring + human spot-checks.
Alert when quality scores drop below thresholds.

### Agent-Specific Eval Metrics

| Metric | What It Measures | How to Measure | Target |
|---|---|---|---|
| **Task completion rate** | Did the agent achieve the goal? | LLM-as-Judge or human review | >85% |
| **Tool selection accuracy** | Correct tool(s) chosen? | Compare to golden tool sequence | >90% |
| **Step efficiency** | Steps taken vs optimal? | Count vs known-optimal trace | <1.5x optimal |
| **Error recovery rate** | Graceful handling of failures? | Inject failures, check behavior | >80% |
| **Tool call accuracy** | Correct parameters? | Exact match name + fuzzy match params | >90% |
| **Cost per success** | Cost efficiency? | Total cost / successful completions | Track trend |
| **Latency p95** | Speed acceptable? | 95th percentile latency | <30s for interactive |
| **Escalation rate** | How often humans needed? | Count escalations / total runs | <15% |

### Eval Implementation with Promptfoo

```yaml
# Agent eval config
description: "Research agent evaluation"

providers:
  - id: research-agent
    config:
      type: custom
      module: ./eval/agent_runner.js  # Runs the full agent pipeline

tests:
  - vars:
      goal: "Find pricing data for the top 3 CRM platforms"
    assert:
      - type: is-json
      - type: javascript
        value: "JSON.parse(output).competitors.length >= 3"
      - type: llm-rubric
        value: "Output includes specific pricing numbers, not just company names"
      - type: cost
        threshold: 0.50  # Max $0.50 per run
      - type: latency
        threshold: 30000  # Max 30 seconds
```

See `evaluation-testing.md` for comprehensive eval framework coverage including red teaming,
statistical rigor, and CI/CD integration.

---

## 10. When NOT to Use Agents

The most important section. The biggest mistakes in AI deployment come from reaching for
agents when simpler solutions work.

**Do NOT use agents when**:
- A well-crafted single prompt + RAG solves the problem → Use that ($0.001-0.01 per call)
- The task is fully deterministic and can be expressed as code → Write the code ($0 per call)
- You need >99% reliability guarantees → Use a workflow with validation
- The task is simple enough that orchestration overhead exceeds the benefit
- You don't yet have evals → You can't safely deploy an agent without knowing what "good" looks
  like. See `evaluation-testing.md` Section 14 for eval-driven development.
- Latency is critical (<2s) and agent loops add unacceptable delay

### Cost Comparison by Approach

| Approach | Cost Per Task | Latency | Reliability | When to Use |
|---|---|---|---|---|
| Single LLM call | $0.001-0.01 | 1-3s | High | Simple tasks, clear requirements |
| LLM + RAG | $0.005-0.05 | 2-5s | High | Knowledge-intensive tasks |
| Sequential workflow | $0.01-0.20 | 3-15s | High | Multi-step with known process |
| Single agent (ReAct) | $0.05-0.50 | 5-30s | Medium-High | Dynamic tool selection |
| Multi-agent system | $0.20-2.00+ | 10-60s+ | Medium | Complex, multi-domain tasks |

---

## 11. Agent Framework Comparison

| Framework | Language | Best For | MCP Support | Key Differentiator |
|---|---|---|---|---|
| **Claude Agent SDK** | Python | Claude-native agents | Yes (native) | Handoffs, guardrails, tools built-in |
| **OpenAI Agents SDK** | Python | OpenAI-native agents | Yes | Handoffs, tracing, OpenAI ecosystem |
| **LangGraph** | Python/JS | Complex stateful agents | Via tools | State machines, cycles, persistence |
| **CrewAI** | Python | Multi-agent role-play | Via tools | Agent teams with roles |
| **AutoGen** | Python | Multi-agent conversations | Via tools | Conversational agent patterns |
| **n8n AI Agent** | No-code | Visual agent building | Yes (native) | No code, visual debugging |

**Recommendation**: Start with Claude Agent SDK or direct API calls for Claude-based agents.
Use LangGraph when you need complex state machines. Use n8n for no-code agent prototyping.
See `claude-ecosystem.md` Section 1 for Agent SDK deep dive. See `automation-platforms.md`
Section 2 for n8n AI agent nodes.
