# Claude Ecosystem — SDK, APIs, and Production Architecture for AI Systems

Anthropic's Claude is not just a model — it's a platform. This reference covers every
Claude-specific capability for building production AI systems: the Agent SDK, tool use,
extended thinking, Citations API, prompt caching, Batches API, Claude Code as a dev
environment, MCP server ecosystem, model selection, and prompt patterns unique to Claude.

> *"The most successful production deployments combine Claude's native capabilities —
> caching, tool use, extended thinking, citations — into systems that would require
> significant custom infrastructure on any other platform."*

---

## Table of Contents
1. Claude Agent SDK — Embeddable Agent Runtime
2. Tool Use — The Messages API Foundation
3. Extended Thinking — Budget Tokens, Adaptive Mode, Streaming
4. Prompt Caching — Implementation, Breakpoints, Cost Math
5. Citations API — Grounded, Verifiable Outputs
6. Batches API — Async at 50% Off
7. Claude Code as Development Environment
8. MCP Server Ecosystem — The Integration Standard
9. Model Selection Guide — Opus / Sonnet / Haiku
10. Claude-Specific Prompt Patterns

---

## 1. Claude Agent SDK — Embeddable Agent Runtime

The Agent SDK packages the same agent loop, tools, and context management that power
Claude Code into an embeddable runtime. It is fundamentally different from LangChain or
LangGraph: you call `query()` and get a complete autonomous agent with built-in tool
execution, MCP support, subagent orchestration, hooks, and sessions. No tool loop to
implement yourself.

### Installation

```bash
pip install claude-agent-sdk          # Python (v0.1.48+)
npm install @anthropic-ai/claude-agent-sdk  # TypeScript (v0.2.71+)
```

### Core API — The `query()` Function

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        print(message)

asyncio.run(main())
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) {
  console.log(message);
}
```

### Built-in Tools

| Tool | Purpose |
|------|---------|
| **Read** | Read any file in the working directory |
| **Write** | Create new files |
| **Edit** | Precise edits to existing files |
| **Bash** | Terminal commands, scripts, git operations |
| **Glob** | Find files by pattern (`**/*.ts`, `src/**/*.py`) |
| **Grep** | Search file contents with regex |
| **WebSearch** | Search the web for current information |
| **WebFetch** | Fetch and parse web page content |
| **AskUserQuestion** | Ask the user clarifying questions |
| **Agent** | Spawn specialized subagents |

### Multi-Agent Orchestration via Subagents

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async for message in query(
    prompt="Use the code-reviewer agent to review this codebase",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Glob", "Grep", "Agent"],
        agents={
            "code-reviewer": AgentDefinition(
                description="Expert code reviewer for quality and security reviews.",
                prompt="Analyze code quality and suggest improvements.",
                tools=["Read", "Glob", "Grep"],
            )
        },
    ),
):
    if hasattr(message, "result"):
        print(message.result)
```

Subagent messages include a `parent_tool_use_id` field for tracking which messages belong
to which subagent execution. This is your key for building orchestrator-worker patterns
without external frameworks.

### Hooks System — Lifecycle Interception

Run custom code at: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`,
`UserPromptSubmit`.

```python
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher

async def log_file_change(input_data, tool_use_id, context):
    file_path = input_data.get("tool_input", {}).get("file_path", "unknown")
    with open("./audit.log", "a") as f:
        f.write(f"{datetime.now()}: modified {file_path}\n")
    return {}

async for message in query(
    prompt="Refactor utils.py to improve readability",
    options=ClaudeAgentOptions(
        permission_mode="acceptEdits",
        hooks={"PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_file_change])]},
    ),
):
    ...
```

**Use cases**: Audit logging, cost tracking, output validation, custom authorization checks
before destructive tools execute.

### MCP Integration

```python
async for message in query(
    prompt="Open example.com and describe what you see",
    options=ClaudeAgentOptions(
        mcp_servers={"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}}
    ),
):
    ...
```

### Sessions — State Persistence Across Queries

```python
# First query — capture session_id
async for message in query(
    prompt="Read the auth module",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob"]),
):
    if hasattr(message, "subtype") and message.subtype == "init":
        session_id = message.session_id

# Resume with full context
async for message in query(
    prompt="Now find all callers",
    options=ClaudeAgentOptions(resume=session_id),
):
    ...
```

### Agent SDK vs. LangChain/LangGraph

The fundamental difference: the Agent SDK provides a **complete agent runtime** with
built-in tool execution. LangChain requires you to define the tool loop and implement
every tool. The Agent SDK gives you `query()` and the agent handles everything
autonomously — file I/O, shell, web search, MCP, subagents, sessions. Capabilities
that require hundreds of lines of custom code in LangChain ship as configuration in
the Agent SDK.

---

## 2. Tool Use — The Messages API Foundation

### How Tool Use Works

Tools are defined in the `tools` parameter of a Messages API call. Claude decides when to
call them and returns `stop_reason: "tool_use"` with `tool_use` content blocks. You execute
the tool and return results as `tool_result` blocks.

### Tool Definition Schema

```json
{
  "name": "get_weather",
  "description": "Get the current weather in a given location. Use when the user asks about current conditions. Returns temperature, humidity, and conditions.",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "The city and state, e.g. San Francisco, CA"
      }
    },
    "required": ["location"]
  }
}
```

**Key schema options**:
- `strict: true` — Guaranteed schema conformance (Structured Outputs). Claude will never
  return a response that violates the schema.
- `input_examples` — Concrete usage patterns that improve tool selection accuracy
- `defer_loading: true` — Tool Search Tool pattern: tools discoverable on-demand without
  loading all definitions into context. Critical for systems with 50+ tools.

### Controlling Tool Selection via `tool_choice`

```python
tool_choice={"type": "tool", "name": "get_weather"}  # Force specific tool
tool_choice={"type": "any"}    # Force Claude to use ANY tool
tool_choice={"type": "auto"}   # Let Claude decide (default)
tool_choice={"type": "none"}   # Prevent tool use
```

### Parallel Tool Calls

Claude makes multiple tool calls in a single response by default. Disable with
`disable_parallel_tool_use=True`. All tool results must be returned in a single user message:

```python
messages.append({"role": "user", "content": [
    {"type": "tool_result", "tool_use_id": "id1", "content": "result1"},
    {"type": "tool_result", "tool_use_id": "id2", "content": "result2"},
]})
```

### Streaming with Tool Use

```python
response = client.messages.create(
    model="claude-opus-4-6", max_tokens=1024, tools=tools,
    messages=[{"role": "user", "content": "What's the weather?"}],
    stream=True
)
for event in response:
    if event.type == "content_block_start" and event.content_block.type == "tool_use":
        print(f"Tool call: {event.content_block.name}")
    elif event.type == "content_block_delta" and hasattr(event.delta, "input"):
        print(f"Input: {event.delta.input}")
```

### Error Handling in Tool Results

```python
{"type": "tool_result", "tool_use_id": block.id, "content": str(e), "is_error": True}
```

Mark failed results with `is_error: True`. Claude receives the error and can retry, use
a different tool, or explain the failure to the user.

### Anthropic-Defined Server-Side Tools

Versioned types like `web_search_20250305` and `text_editor_20250124` are generally
available (no beta header). Web search: $10 per 1,000 searches. Web fetch: no additional
cost beyond tokens.

### Token Overhead

A specialized system prompt is automatically injected: 346 tokens for `auto`/`none`,
313 tokens for `any`/`tool` on Claude 4.x models. Budget for this in cost calculations.

---

## 3. Extended Thinking — Budget Tokens, Adaptive Mode, Streaming

Extended thinking gives Claude enhanced step-by-step reasoning before delivering answers.
It returns thinking blocks alongside text responses. This is Claude's equivalent of chain-
of-thought, but happening inside the model's native architecture.

### Adaptive Thinking (Recommended)

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[{"role": "user", "content": "Complex reasoning question..."}],
)
```

Adaptive thinking automatically enables interleaved thinking (thinking between tool calls).
Combine with the `effort` parameter for granular control:

| Effort Level | Behavior |
|---|---|
| `max` | Always thinks with no constraints (Opus 4.6 only) |
| `high` (default) | Always thinks, deep reasoning |
| `medium` | Moderate thinking, may skip for simple queries |
| `low` | Minimizes thinking, skips for simple tasks |

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "medium"},
    messages=[...],
)
```

### Manual Mode (Legacy)

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "Solve this step by step..."}],
)
```

**Budget tokens rules**:
- Minimum: 1,024 tokens
- Must be less than `max_tokens`
- Acts as a target, not a strict limit
- Default when auto-enabled: 31,999 tokens
- Diminishing returns above 32K for most tasks

### Summarized vs. Full Thinking

Claude 4+ models return **summarized thinking** by default. You are billed for the full
thinking tokens generated, not the summary tokens visible in the response. Use
`display: "omitted"` for faster time-to-first-text-token when streaming — same cost,
just faster perceived latency.

### Cost Implications

- Thinking tokens billed as **output tokens** (the expensive ones)
- Thinking blocks from previous turns count as **input tokens** when cached
- No charge for summarization overhead
- With `display: "omitted"`: identical cost, faster streaming

### When to Use Extended Thinking

**Use it for**: Complex reasoning, multi-step analysis, math, code generation requiring
planning, tasks where accuracy justifies latency and cost.

**Skip it for**: Simple lookups, formatting tasks, latency-critical applications
(unless using `display: "omitted"`), tasks where Haiku-level reasoning suffices.

### Interleaved Thinking

Enables thinking between tool calls and after tool results:
- **Opus 4.6**: Automatically enabled with adaptive thinking
- **Sonnet 4.6**: Use beta header `interleaved-thinking-2025-05-14` with manual mode
- **Older models**: Add beta header `interleaved-thinking-2025-05-14`

---

## 4. Prompt Caching — Implementation, Breakpoints, Cost Math

Prompt caching is the single highest-ROI optimization for production Claude deployments.
For multi-turn conversations or repeated system prompts, it reduces input costs by 90%.

### Pricing (per million tokens)

| Model | Base Input | 5m Cache Write | 1h Cache Write | Cache Read | Output |
|---|---|---|---|---|---|
| **Opus 4.6** | $5 | $6.25 | $10 | $0.50 | $25 |
| **Opus 4.5** | $5 | $6.25 | $10 | $0.50 | $25 |
| **Opus 4.1** | $15 | $18.75 | $30 | $1.50 | $75 |
| **Sonnet 4.6** | $3 | $3.75 | $6 | $0.30 | $15 |
| **Sonnet 4.5** | $3 | $3.75 | $6 | $0.30 | $15 |
| **Haiku 4.5** | $1 | $1.25 | $2 | $0.10 | $5 |
| **Haiku 3.5** | $0.80 | $1 | $1.60 | $0.08 | $4 |

**Multipliers**: 5-minute write = 1.25x base input. 1-hour write = 2x base input.
Cache read = 0.1x base input (**90% savings**).

### Cache TTL

- **Default**: 5 minutes (ephemeral)
- **Extended**: 1 hour (`"ttl": "1h"` in cache_control)
- Cache refreshes on each use within the TTL window

### Minimum Cacheable Token Lengths

| Model | Minimum Tokens |
|---|---|
| Opus 4.6, Opus 4.5, Haiku 4.5 | 4,096 |
| Sonnet 4.6 | 2,048 |
| Sonnet 4.5, 4.1, 4, 3.7 | 1,024 |
| Haiku 3.5, Haiku 3 | 2,048 |

### Automatic Caching (Recommended for Multi-Turn)

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},  # Top-level — caches the entire prefix
    system="You are a helpful assistant with expertise in...",
    messages=[{"role": "user", "content": "Your question"}],
)
```

### Explicit Breakpoints (Fine-Grained Control)

Up to 4 breakpoints per request. Use when you need to cache multiple segments independently.

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "System instructions that rarely change...",
            "cache_control": {"type": "ephemeral"}
        },
        {
            "type": "text",
            "text": "[50-page reference document]",
            "cache_control": {"type": "ephemeral"}
        },
    ],
    messages=[{"role": "user", "content": "What are the key terms?"}],
)
```

### 1-Hour TTL

```json
{"cache_control": {"type": "ephemeral", "ttl": "1h"}}
```

Use the 1-hour TTL for stable reference documents, product catalogs, and knowledge bases
that justify the 2x write cost for extended availability.

### Cache Implementation Rules

1. **Place `cache_control` on the last identical block across requests.** Everything before
   the breakpoint is the cacheable prefix.
2. **Never put timestamps or per-request data before the cache breakpoint.** Any change
   in the prefix invalidates the cache.
3. **Cache stable content first**: system instructions → background documents → tool
   definitions → conversation history (most stable to least stable).
4. **Monitor cache performance** via `response.usage.cache_read_input_tokens` and
   `cache_creation_input_tokens`.
5. **Lookback window is 20 blocks.** For conversations longer than this, add explicit
   breakpoints or the system will not cache earlier content.
6. **Cache isolation is workspace-level** (changed Feb 5, 2026). Different workspaces
   have separate caches.

### Cost Math Example

A system with a 10,000-token system prompt called 100 times per hour on Opus 4.6:

**Without caching**: 100 × 10,000 × $5/MTok = $5.00/hour
**With caching (5m TTL)**: 1 write ($0.0625) + 99 reads (99 × 10,000 × $0.50/MTok = $0.495) = $0.56/hour
**Savings**: 89%

No beta headers required. Prompt caching is generally available on all models.

---

## 5. Citations API — Grounded, Verifiable Outputs

### How It Works

Enable `citations: {"enabled": true}` on document content blocks. Claude automatically
provides citations referencing exact passages from source documents. Citations are
guaranteed to contain valid pointers — no hallucinated references.

### Supported Document Types

| Type | Best For | Citation Format |
|---|---|---|
| Plain text | Prose, articles | Character indices (0-indexed) |
| PDF | PDF files | Page numbers (1-indexed) |
| Custom content | Lists, transcripts, RAG chunks | Block indices (0-indexed) |

### Implementation

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {
                    "type": "text",
                    "media_type": "text/plain",
                    "data": "The grass is green. The sky is blue."
                },
                "title": "My Document",
                "context": "This is a trustworthy document.",  # Not citable
                "citations": {"enabled": True},
            },
            {"type": "text", "text": "What color is the grass and sky?"},
        ],
    }],
)
```

### Using the Files API

```python
{
    "type": "document",
    "source": {"type": "file", "file_id": "file_011CNvxoj286tYUAZFiZMf1U"},
    "citations": {"enabled": True},
}
```

### Response Structure

```json
{
    "content": [
        {"type": "text", "text": "According to the document, "},
        {
            "type": "text",
            "text": "the grass is green",
            "citations": [{
                "type": "char_location",
                "cited_text": "The grass is green.",
                "document_index": 0,
                "document_title": "My Document",
                "start_char_index": 0,
                "end_char_index": 20
            }]
        }
    ]
}
```

### Cost and Compatibility

- Slight increase in input tokens due to system prompt additions and document chunking
- `cited_text` does **not** count toward output tokens — cost savings vs. prompt-based quoting
- `cited_text` also not counted as input tokens in subsequent turns
- Citations must be enabled on **all or none** of the documents in a request
- **Incompatible with Structured Outputs** — choose one or the other
- Streaming: citations arrive as `citations_delta` events

### When to Use

Any system where the user needs to verify claims against source material: RAG systems,
legal document analysis, research synthesis, compliance reporting, customer support with
knowledge base grounding. The guarantee of valid citation pointers eliminates the entire
class of "hallucinated reference" failures.

---

## 6. Batches API — Async at 50% Off

### The Value Proposition

50% discount on both input and output tokens. Process up to 100,000 requests or 256 MB
per batch. Most batches complete within 1 hour. Results available for 29 days.

### Batch Pricing (per million tokens)

| Model | Batch Input | Batch Output |
|---|---|---|
| **Opus 4.6** | $2.50 | $12.50 |
| **Sonnet 4.6** | $1.50 | $7.50 |
| **Haiku 4.5** | $0.50 | $2.50 |

### When to Use

- Bulk content generation (product descriptions, email variations, ad copy)
- Large-scale evaluation runs (LLM-as-Judge scoring)
- Data enrichment pipelines (classification, extraction, summarization)
- Any workload where latency tolerance exceeds ~1 hour
- Nightly processing jobs, weekly report generation

### When NOT to Use

- Real-time user-facing responses
- Interactive agents requiring tool loops
- Any workflow where you need results in under an hour

---

## 7. Claude Code as Development Environment

Claude Code is not just a CLI — it's a programmable development platform with a skills
system, custom commands, hooks, and MCP integration.

### Skills System

Skills are reusable prompts stored at `.claude/skills/SKILL.md` (project-level) or
`~/.claude/skills/` (personal). Each skill requires a `SKILL.md` with YAML frontmatter
and markdown instructions. Unlike slash commands, skills are loaded automatically and
influence every response in their scope.

### Custom Slash Commands

Markdown files in `.claude/commands/` — one file = one reusable slash command for the
entire team, stored in Git. Support complex arguments, file references, and direct bash
execution. This is the primary mechanism for standardizing team workflows.

### Hooks

`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit` —
run custom code at key lifecycle points via `.claude/hooks/` configuration. Use for
audit logging, cost tracking, CI integration, and custom authorization gates.

### MCP Server Integration

Configured in `.mcp.json` at project root (team-shared) or `~/.claude/.mcp.json` (personal).
Claude Code acts as the MCP client; each server exposes tools the agent can use.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

### Claude Code Remote Control

Operate local coding sessions from mobile devices via an outbound HTTPS relay between a
local terminal and the Anthropic API. Useful for monitoring long-running agentic tasks
or approving human-in-the-loop checkpoints while away from the desk.

---

## 8. MCP Server Ecosystem — The Integration Standard

MCP (Model Context Protocol) is the universal connector for LLM-to-tool integration.
OpenAI, Google DeepMind, Microsoft, and thousands of developers have adopted it. Microsoft
joined the MCP steering committee at Build 2025.

### What MCP Provides

- **Resources**: Files, databases, APIs the LLM can read from
- **Tools**: Functions the LLM can call (with parameters and return types)
- **Prompts**: Pre-defined prompt templates for common tasks

### Available Servers

**Official** (GitHub `modelcontextprotocol/servers`): Filesystem, GitHub, GitLab,
Google Drive, PostgreSQL, SQLite, Slack, Puppeteer/Playwright, Memory, Brave Search,
Google Maps, and dozens more.

**Community**: Tens of thousands of servers searchable on MCP.so and other directories.

**Enterprise**: Alpic provides managed MCP server hosting; CData provides enterprise
connectors.

### Building a Custom MCP Server (Python)

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")
NWS_API_BASE = "https://api.weather.gov"

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NWS_API_BASE}/points/{latitude},{longitude}",
            headers={"User-Agent": "weather-app/1.0"}
        )
        data = response.json()
        forecast_url = data["properties"]["forecast"]
        response = await client.get(forecast_url, headers={"User-Agent": "weather-app/1.0"})
        forecast_data = response.json()
        periods = forecast_data["properties"]["periods"]
        return "\n".join(f"{p['name']}: {p['detailedForecast']}" for p in periods[:5])

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### Building a Custom MCP Server (TypeScript)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "weather", version: "1.0.0" });

server.tool("get_forecast",
  { latitude: { type: "number" }, longitude: { type: "number" } },
  async ({ latitude, longitude }) => {
    const response = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
    const data = await response.json();
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Transport Protocols

- **STDIO**: Local integrations (Claude Desktop, Claude Code)
- **Streamable HTTP**: Production remote deployments (replaced SSE transport)

### Production Challenges (2026)

Key gaps being addressed: stateful sessions fighting with load balancers, horizontal
scaling requiring workarounds, no standard way for registries to discover server
capabilities without connecting, need for audit trails/observability, and enterprise
auth moving from static client secrets to SSO-integrated flows.

---

## 9. Model Selection Guide — Opus / Sonnet / Haiku

### The Lineup (March 2026)

| Model | Context | Max Output | Input $/MTok | Output $/MTok | Strengths |
|---|---|---|---|---|---|
| **Opus 4.6** | 1M | 128K | $5 | $25 | Frontier reasoning, coding, agentic tasks |
| **Opus 4.5** | 1M | 128K | $5 | $25 | Strong reasoning, creative writing |
| **Sonnet 4.6** | 1M | 64K | $3 | $15 | Best balance of speed/quality/cost |
| **Sonnet 4.5** | 200K (1M with beta) | 64K | $3 | $15 | Proven, reliable workhorse |
| **Haiku 4.5** | 200K | 8K | $1 | $5 | Fast, cheap, surprisingly capable |
| **Haiku 3.5** | 200K | 8K | $0.80 | $4 | Fastest, cheapest |

**Opus 4.6 Fast Mode** (research preview): 6x pricing ($30/$150 per MTok) for
significantly faster output. Use for latency-sensitive agentic loops where Opus-level
reasoning is required.

### Model Selection Decision Tree

```
Is the task simple classification, extraction, or formatting?
  → Yes: Haiku 4.5. Stop.

Does it require strong reasoning, complex code generation, or multi-step planning?
  → Yes: Does latency matter?
    → Yes: Sonnet 4.6 (or Opus 4.6 Fast Mode if budget allows)
    → No: Opus 4.6. Stop.

Is it a general-purpose task with moderate complexity?
  → Sonnet 4.6. Stop.

Is it a high-volume pipeline where cost dominates?
  → Haiku 4.5 + Batches API. Stop.
```

### Specific Use Cases

**Opus 4.6**:
- Autonomous coding agents (65.4% on Terminal-Bench 2.0)
- Complex multi-step reasoning (91.3% on GPQA Diamond)
- Agentic OS-level tasks (72.7% on OSWorld-Verified)
- Tasks requiring 128K output tokens
- Human-in-the-loop systems where accuracy justifies cost

**Sonnet 4.6**:
- Production APIs serving real-time user requests
- Code review and bug fixing (79.6% on SWE-bench Verified)
- Content generation pipelines
- Multi-turn conversations with tool use
- The default choice when you're unsure

**Haiku 4.5**:
- Classification and routing (input triage, intent detection)
- Data extraction and transformation
- High-volume batch processing
- Real-time chat with basic tool use
- Guardrail evaluation (check outputs from larger models cheaply)

### Context Window Notes

- Opus 4.6 and Sonnet 4.6: Full 1M context at standard pricing — no long-context surcharge
- Sonnet 4.5/4: 1M context available with beta header `context-1m-2025-08-07` at premium
  pricing (2x input, 1.5x output for >200K tokens)
- Haiku models: 200K context

---

## 10. Claude-Specific Prompt Patterns

Claude's instruction-following behavior differs from GPT and Gemini in specific, exploitable
ways. These patterns are not generic "prompt engineering" — they are Claude-specific
optimizations based on how the model processes instructions.

### System Prompt Architecture

Claude gives disproportionate weight to system prompts. Structure them as a hierarchy:

```
[Identity and role — who Claude is in this context]
[Core behavioral rules — what to always/never do]
[Task-specific instructions — how to handle this type of request]
[Output format specification — exact schema or structure]
[Examples — 1-2 demonstrations of ideal output]
```

This order matters. Claude processes system prompts as a priority frame, and earlier
instructions carry slightly more weight when instructions conflict.

### XML Tags for Structured Input

Claude responds exceptionally well to XML-tagged input sections. This is more effective
on Claude than on other models:

```xml
<context>
Background information the model should reference but not repeat.
</context>

<instructions>
The specific task to complete.
</instructions>

<constraints>
Hard rules that must not be violated.
</constraints>

<output_format>
Exact format specification for the response.
</output_format>
```

### Prefilling the Response

Claude supports response prefilling — start the assistant turn with specific text to
constrain the output format:

```python
messages = [
    {"role": "user", "content": "Analyze this data and return JSON."},
    {"role": "assistant", "content": "{"},
]
```

This forces Claude to continue from `{`, guaranteeing JSON output without additional
instructions. Combine with `strict: true` tool use for schema-validated structured output.

### Chain-of-Thought via Extended Thinking vs. Prompt-Based

On Claude, prefer **extended thinking** over prompt-based chain-of-thought ("think step
by step"). Extended thinking uses the model's native reasoning architecture and produces
better results, especially for math, code, and multi-step logic. Reserve prompt-based
CoT for Haiku or when extended thinking's cost is unjustified.

### The `<thinking>` Tag Pattern (Without Extended Thinking)

When you cannot use extended thinking (e.g., Haiku, or cost constraints):

```
Before responding, think through your reasoning inside <thinking> tags.
Then provide your final answer outside the tags.
```

Claude will reliably use the tags, making it easy to parse and discard the reasoning
in production while retaining its quality benefits.

### Negative Instructions

Claude responds well to explicit "do not" instructions. Unlike some models that interpret
negative instructions inconsistently, Claude treats them as hard constraints:

```
Do NOT include a greeting or sign-off.
Do NOT use bullet points — write in full paragraphs.
Do NOT mention competitors by name.
```

### Token Budget Prompting

Claude reliably follows explicit length constraints:

```
Respond in exactly 3 sentences.
Keep your response under 150 words.
Write a 500-word analysis. Target exactly 500 words.
```

This is more reliable on Claude than on GPT models, where length instructions are
frequently violated.

### Multi-Document Analysis Pattern

For RAG and multi-source analysis, structure documents with explicit metadata:

```xml
<document index="1" source="Q3 Earnings Report" date="2025-10-15">
[document content]
</document>

<document index="2" source="Competitor Analysis" date="2025-11-01">
[document content]
</document>

<instructions>
Compare the financial outlook in document 1 with the competitive landscape
in document 2. Cite specific passages using [Doc N] notation.
</instructions>
```

Combined with the Citations API, this pattern produces verifiable, well-grounded analysis
that references exact source passages.

### Caching-Optimized Prompt Architecture

Design prompts with caching in mind. Place all stable content before variable content:

```
[System prompt — cached]                    ← cache_control breakpoint 1
[Reference documents — cached]              ← cache_control breakpoint 2
[Tool definitions — cached]                 ← cache_control breakpoint 3
[Conversation history — partially cached]   ← cache_control breakpoint 4
[Current user message — never cached]
```

This ordering ensures maximum cache hit rates. Moving a single dynamic element (like a
timestamp) before the cache breakpoint invalidates the entire prefix.
