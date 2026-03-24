# Workflow Playbooks — Applied AI Patterns for the Marketing & Research Stack

Pre-built patterns for the most common use cases. Each playbook is a complete workflow
architecture you can implement immediately. Deeply integrated with the other skills in this stack.

> *See `agentic-systems.md` for the underlying design patterns these playbooks implement.
> See `evaluation-testing.md` for eval frameworks to test workflow quality.
> See `automation-platforms.md` for deployment on n8n/Make.com.
> See `claude-ecosystem.md` for Claude-specific features (caching, tool use, extended thinking).*

---

## Table of Contents
1. Deep Research Workflow
2. Market Intelligence Pipeline
3. Content Generation Pipeline (Copywriting Integration)
4. Brand Voice Enforcement System
5. Funnel Copy Production Pipeline
6. Client AI Deployment Framework
7. Personal Productivity Stack
8. Workflow Cost & Performance Benchmarks

---

## 1. Deep Research Workflow

**Use for**: Competitive analysis, market research, topic deep-dives, due diligence
**Skills integration**: Research & Market Analysis skill → this workflow executes it at AI scale
**Complexity**: Multi-agent (orchestrator + 3 parallel workers + 2 sequential)
**Estimated cost**: $0.05-0.50/run depending on depth
**Estimated latency**: 30-90 seconds (parallel execution)

### Architecture

```
[Query Formulation Agent]
    ↓ generates 5-10 targeted search queries
[Parallel Research Workers] (run simultaneously)
    ├── Web Search + Scrape Worker (Sonnet + tools)
    ├── Academic/Report Worker (Sonnet + tools)
    └── Social Proof Worker — reddit, forums, reviews (Sonnet + tools)
    ↓ raw research artifacts
[Synthesis Agent] (Sonnet with extended thinking)
    ↓ structured research brief
[Quality Check Agent] (Haiku — separate context for unbiased review)
    ↓ validates completeness, flags gaps
[Output: Research Brief]
```

### Cost Breakdown Per Run

| Step | Model | Tokens (in/out) | Est. Cost | Notes |
|---|---|---|---|---|
| Query formulation | Haiku | 500/200 | $0.001 | Fast, simple task |
| Web search worker | Sonnet + tools | 3,000/800 | $0.02 | 3-5 tool calls |
| Academic worker | Sonnet + tools | 3,000/800 | $0.02 | 2-4 tool calls |
| Social proof worker | Sonnet + tools | 3,000/800 | $0.02 | 3-5 tool calls |
| Synthesis | Sonnet + thinking | 8,000/2,000 | $0.06 | Thinking budget: 5K |
| Quality check | Haiku | 3,000/500 | $0.004 | Cheap validation |
| **Total** | | | **$0.13** | Parallel workers run concurrently |

### System Prompts

**Query Formulation Agent**:
```xml
<role>
You are a research strategist. Given a research goal, you generate precise search queries
that will surface the most relevant, current, and diverse information.
</role>

<task>
Generate exactly {{NUM_QUERIES}} search queries for the following research goal.
Each query must approach the topic from a different angle:
- Primary query (direct)
- Competitor/comparison query
- Customer perspective query (forums, reddit, reviews)
- Industry data/statistics query
- Recent news/developments query
</task>

<output_format>
Return a JSON array of objects:
[{"query": string (under 10 words), "angle": string, "expected_source_type": string}]
No explanation, no markdown, just the JSON array.
</output_format>

<research_goal>
{{RESEARCH_GOAL}}
</research_goal>
```

**Synthesis Agent**:
```xml
<role>
You are an elite research analyst. You synthesize raw research into structured, actionable briefs.
You write like a McKinsey analyst: precise, evidence-based, no filler.
</role>

<task>
Synthesize the following research artifacts into a structured brief.

Your brief must include:
1. Key Findings (top 5-7 insights, each with a supporting data point or source)
2. Market Dynamics (size, growth, key players, trends)
3. Customer Voice (direct quotes/sentiments from real customers)
4. Competitive Landscape (top 3-5 competitors, their positioning, weaknesses)
5. Opportunities and Gaps (unmet needs, positioning white space)
6. Recommended Next Steps (3 specific, actionable recommendations)

Be specific. Cite sources. Flag anything uncertain with [LOW CONFIDENCE].
</task>

<output_format>
Return structured markdown with clear section headers. Include:
- Confidence score (1-5) for each Key Finding based on evidence quality
- Source count and quality assessment per section
- A "Data Gaps" section listing what information would strengthen the analysis
</output_format>

<research_artifacts>
{{CONCATENATED_RESEARCH}}
</research_artifacts>
```

**Quality Check Agent** (separate context — prevents bias):
```xml
<role>
You are a research quality reviewer. You evaluate research briefs for completeness,
accuracy, and actionability. You have NOT seen the raw research — you evaluate the
brief on its own merits.
</role>

<task>
Evaluate this research brief against these criteria:

1. COMPLETENESS: Does it cover market size, competitors, customer voice, and opportunities?
2. EVIDENCE QUALITY: Are claims supported by specific data points and sources?
3. ACTIONABILITY: Are the recommendations specific enough to act on?
4. BIAS CHECK: Does it present a balanced view or lean toward a predetermined conclusion?
5. GAPS: What critical questions remain unanswered?

Score each criterion 1-5. Flag any claim that appears unsubstantiated.
</task>

<output_format>
Return JSON:
{
  "scores": {"completeness": int, "evidence_quality": int, "actionability": int, "bias_check": int},
  "overall_score": float,
  "critical_gaps": [string],
  "unsubstantiated_claims": [string],
  "approved": boolean  // true if overall_score >= 3.5
}
</output_format>

<brief>
{{RESEARCH_BRIEF}}
</brief>
```

### Implementation Notes

- Run research workers in parallel (async) to minimize latency — total time is max(worker_times),
  not sum(worker_times). See `automation-platforms.md` for n8n parallel execution.
- Set a `max_pages` limit per worker (3-5 pages) to control cost
- Use Jina AI, Firecrawl, or similar for reliable web scraping
- Store research artifacts in a vector DB for future retrieval/reuse
  (see `context-engineering.md` Section 3 for RAG architecture)
- Add a "freshness check": flag any source older than 90 days for time-sensitive topics
- Use Claude's extended thinking for the synthesis step — complex synthesis benefits from
  a 5,000-10,000 token thinking budget (see `claude-ecosystem.md` Section 3)

---

## 2. Market Intelligence Pipeline

**Use for**: Ongoing competitive monitoring, trend tracking, signal detection
**Skills integration**: Research & Market Analysis + Data Analysis skills
**Complexity**: Scheduled workflow (not agentic — fully deterministic pipeline)
**Run frequency**: Daily or weekly
**Estimated cost**: $0.02-0.10 per run (mostly Haiku classification)

### Architecture

```
[Signal Collection] (scheduled — cron or n8n Schedule Trigger)
    ├── Competitor blog/press monitoring (RSS + scraping)
    ├── Industry news aggregation (Google News API or Brave Search)
    ├── Social listening — mentions, sentiment (Reddit API, Twitter/X API)
    └── Review site monitoring (G2, Capterra, Trustpilot via scraping)
    ↓
[Relevance Filter Agent] (Haiku — fast, cheap classification)
    → Scores each signal by relevance (1-5) and action-urgency (1-5)
    → Discards signals below threshold (relevance < 3)
    ↓
[Synthesis Agent] (Sonnet — weekly aggregation)
    → Weekly intelligence brief
    ↓
[Distribution] (email, Slack, Notion doc)
```

### Signal Volume and Cost Estimates

| Source | Signals/Day | Relevant After Filter | Cost/Day (Haiku) |
|---|---|---|---|
| Competitor blogs | 5-15 | 2-5 | $0.002 |
| Industry news | 20-50 | 5-10 | $0.005 |
| Social mentions | 30-100 | 5-15 | $0.010 |
| Review sites | 5-20 | 2-8 | $0.003 |
| **Total** | **60-185** | **14-38** | **$0.02/day** |

Weekly synthesis (Sonnet): $0.05-0.10 additional.

### Relevance Scoring Prompt

```xml
<task>
Score the following piece of content for relevance to our business context.

Scoring criteria:
- Relevance Score (1-5): How relevant is this to our market, competitors, or customers?
  1=unrelated, 2=tangentially related, 3=industry relevant, 4=directly relevant, 5=critical
- Urgency Score (1-5): Does this require immediate attention or action?
  1=informational, 2=track, 3=discuss this week, 4=act within 48h, 5=immediate action
- Signal Type: competitor_move | market_trend | customer_insight | regulatory | opportunity

Return JSON: {"relevance": int, "urgency": int, "signal_type": string, "one_line_summary": string}
Only include content with relevance >= {{MIN_RELEVANCE_THRESHOLD}}.
</task>

<business_context>
{{COMPANY_CONTEXT}}     ← Store in prompt cache for cost savings
</business_context>

<content>
{{SIGNAL_CONTENT}}
</content>
```

### Automation Platform Implementation

See `automation-platforms.md` for full n8n/Make deployment patterns. Key nodes:
- **n8n**: Schedule Trigger → HTTP Request (RSS) → Split In Batches → Anthropic node (Haiku) → IF (relevance >= 3) → Airtable/Notion (store) → Slack (alert for urgency >= 4)
- **Make**: Scheduled scenario → RSS module → Iterator → Claude module (Haiku) → Router (by relevance) → Google Sheets + Slack

---

## 3. Content Generation Pipeline (Copywriting Integration)

**Use for**: High-volume content production that maintains brand voice and conversion principles
**Skills integration**: Elite Copywriting skill defines WHAT to write; this workflow executes at scale
**Complexity**: Sequential workflow (6-7 steps)
**Output quality**: Matches 80-90% of skilled human copywriter with proper setup
**Estimated cost**: $0.15-0.40 per piece (email, ad, or page section)

### The Pipeline

```
[Brief Intake]
    → Structured brief: offer, audience, awareness level, channel, format
    ↓
[Research Agent] (optional but recommended — adds $0.05-0.15)
    → Pulls relevant market research, competitor examples, customer language
    ↓
[Strategy Agent] (Sonnet + extended thinking)
    → Determines: awareness level, sophistication stage, lead type, hook angle
    → Output: Copy strategy doc
    ↓
[Generation Agent] (Sonnet — brand voice in cached system prompt)
    → Writes first draft using strategy doc + copywriting frameworks
    ↓
[Reflection Agent] (Haiku — cheap quality scoring)
    → Scores against conversion criteria rubric
    → Flags specific weaknesses
    ↓
[Revision Agent] (Sonnet — only runs if score < threshold)
    → Rewrites based on reflection feedback
    ↓
[Brand Voice Check Agent] (Haiku — validates tone compliance)
    → Validates against brand voice guidelines
    ↓
[Output: Final Copy]
```

### Pipeline Cost Breakdown

| Step | Model | When It Runs | Est. Cost |
|---|---|---|---|
| Brief validation | Code (no LLM) | Always | $0.00 |
| Research | Sonnet + tools | Optional | $0.05-0.15 |
| Strategy | Sonnet + thinking | Always | $0.04-0.08 |
| Generation | Sonnet (cached prompt) | Always | $0.03-0.06 |
| Reflection | Haiku | Always | $0.005 |
| Revision | Sonnet | ~40% of runs | $0.03-0.06 |
| Brand voice check | Haiku | Always | $0.005 |
| **Total** | | | **$0.15-0.40** |

### Brief Intake Schema

```json
{
  "offer": {
    "product": "string",
    "price": "string or null",
    "core_promise": "string (the transformation — be specific)",
    "unique_mechanism": "string (how/why it works differently)"
  },
  "audience": {
    "description": "string (demographics + psychographics)",
    "awareness_level": "unaware|problem_aware|solution_aware|product_aware|most_aware",
    "top_desire": "string (what they want, in their words)",
    "top_fear": "string (what they're afraid of)",
    "primary_objection": "string (why they wouldn't buy)"
  },
  "channel": "email|landing_page|facebook_ad|google_ad|vsl|sales_letter|linkedin_ad",
  "format": "string (e.g., 'long-form sales page', '3-email sequence', '5 ad variants')",
  "tone": "string (reference brand voice guidelines)",
  "word_count": "int or range (e.g., 500-800)",
  "examples": ["url or description of reference copy to model"],
  "must_include": ["string (specific points, data, testimonials to weave in)"],
  "must_avoid": ["string (competitor names, specific claims, etc.)"]
}
```

### Strategy Agent Prompt

```xml
<role>
You are an elite direct-response strategist trained in Eugene Schwartz's Breakthrough Advertising
framework. You diagnose the strategic approach BEFORE any copy is written.
</role>

<task>
Given the brief, determine the copy strategy. Specifically:

1. AWARENESS DIAGNOSIS: What is the prospect's awareness level and why?
   (Cite specific evidence from the brief)
2. SOPHISTICATION STAGE: What market sophistication stage (1-5)? What does this mean for the lead?
3. EMOTIONAL CORE: What is the deepest emotional driver (beyond surface desire)?
   Use Masterson's Core Emotional Complex framework.
4. LEAD TYPE: Should we lead with Claim, Promise, Proof, Problem, Secret, or Story?
   Justify with the awareness + sophistication diagnosis.
5. HOOK ANGLE: What is the single strongest opening hook concept?
   Write it as a one-sentence headline.
6. OBJECTION PRIORITY: Which objection must be addressed first? Where in the copy?
7. CTA STRATEGY: Given the awareness level, what CTA approach works best?
   (Direct ask, soft CTA, curiosity close, urgency close, etc.)

Be specific. Give the actual strategic direction, not general principles.
</task>

<output_format>
Return JSON:
{
  "awareness_level": string,
  "awareness_reasoning": string,
  "sophistication_stage": int (1-5),
  "emotional_core": string,
  "lead_type": string,
  "lead_type_reasoning": string,
  "hook_angle": string,
  "primary_objection": string,
  "objection_placement": string,
  "cta_strategy": string,
  "strategic_notes": string (any additional strategic guidance)
}
</output_format>

<brief>
{{STRUCTURED_BRIEF}}
</brief>
```

### Reflection Agent Rubric

```json
{
  "evaluation_criteria": [
    {"criterion": "hook_strength", "weight": 0.25, "question": "Does the opening stop the scroll and demand attention? Is it specific, not generic?"},
    {"criterion": "awareness_match", "weight": 0.20, "question": "Does the lead match the diagnosed awareness level? Would this work for someone at that stage?"},
    {"criterion": "specificity", "weight": 0.15, "question": "Are claims specific and credible? Numbers, names, timeframes — not vague promises?"},
    {"criterion": "emotional_resonance", "weight": 0.15, "question": "Does it speak to the deeper emotional core identified in strategy, not just surface benefits?"},
    {"criterion": "objection_handling", "weight": 0.15, "question": "Is the primary objection addressed before it blocks the sale? Is the placement natural?"},
    {"criterion": "cta_clarity", "weight": 0.10, "question": "Is the desired action clear, compelling, and matched to the awareness level?"}
  ],
  "scoring": "1-5 per criterion, weighted total 0-5",
  "threshold": 3.5,
  "output": {
    "scores": "object with criterion keys and integer values",
    "weighted_total": "float 0-5",
    "passes_threshold": "boolean",
    "top_weakness": "string — most impactful issue to fix",
    "specific_fixes": [{"original_text": "string", "revised_text": "string", "reason": "string"}]
  }
}
```

---

## 4. Brand Voice Enforcement System

**Use for**: Ensuring all AI-generated content sounds like your brand, not generic AI
**Skills integration**: Brand Voice skill defines the standard; this system enforces it
**Implementation**: System prompt + validation layer
**Cost**: $0.003-0.008 per validation check (Haiku)

### The Brand Voice System Prompt Block

This is a reusable, cacheable block you inject into any generation prompt. Cache it to save
90% on repeated calls (see `claude-ecosystem.md` Section 4).

```xml
<brand_voice>
  <positioning>{{POSITIONING_STATEMENT}}</positioning>
  <personality>{{3-5 PERSONALITY TRAITS with behavioral descriptions}}</personality>
  <voice_matrix>
    <dimension name="Formality">{{SCORE 1-5}}: {{DESCRIPTION with examples}}</dimension>
    <dimension name="Humor">{{SCORE 1-5}}: {{DESCRIPTION with examples}}</dimension>
    <dimension name="Directness">{{SCORE 1-5}}: {{DESCRIPTION with examples}}</dimension>
    <dimension name="Technical depth">{{SCORE 1-5}}: {{DESCRIPTION with examples}}</dimension>
  </voice_matrix>
  <vocabulary>
    <preferred_terms>{{WORDS AND PHRASES TO USE}}</preferred_terms>
    <forbidden_terms>{{WORDS AND PHRASES NEVER TO USE}}</forbidden_terms>
  </vocabulary>
  <always_do>
    - {{POSITIVE STYLE RULES — specific, measurable}}
  </always_do>
  <never_do>
    - {{FORBIDDEN PATTERNS — specific examples}}
  </never_do>
  <example_sentences>
    <on_brand>
      1. "{{EXEMPLARY SENTENCE}}" — Why: {{REASON}}
      2. "{{EXEMPLARY SENTENCE}}" — Why: {{REASON}}
      3. "{{EXEMPLARY SENTENCE}}" — Why: {{REASON}}
    </on_brand>
    <off_brand>
      1. "{{COUNTEREXAMPLE}}" — Problem: {{WHAT'S WRONG}}
      2. "{{COUNTEREXAMPLE}}" — Problem: {{WHAT'S WRONG}}
      3. "{{COUNTEREXAMPLE}}" — Problem: {{WHAT'S WRONG}}
    </off_brand>
  </example_sentences>
</brand_voice>
```

### Brand Voice Validation Agent

```xml
<task>
Evaluate whether the following content matches the brand voice specification.

For each dimension, score 1-5 (1=completely off-brand, 5=perfectly on-brand).
Identify the specific sentences that deviate most from the voice.
Provide exact rewrite suggestions for the top 2 deviations.

Return JSON: {
  "scores": {"formality": int, "humor": int, "directness": int, "technical_depth": int},
  "overall": float (weighted average),
  "deviations": [
    {"sentence": string, "issue": string, "rewrite": string, "severity": "minor"|"moderate"|"major"}
  ],
  "forbidden_terms_found": [string],
  "approved": boolean  // true if overall >= 4.0 AND no major deviations AND no forbidden terms
}
</task>

<brand_voice>{{CACHED BRAND VOICE BLOCK}}</brand_voice>

<content_to_evaluate>{{GENERATED_CONTENT}}</content_to_evaluate>
```

### Integration Pattern

```python
async def generate_with_voice_check(brief: dict, max_voice_retries: int = 2) -> dict:
    # Generate copy
    copy = await generation_agent.run(brief)

    # Voice check loop
    for attempt in range(max_voice_retries):
        voice_result = await voice_validator.run(copy)

        if voice_result["approved"]:
            return {"copy": copy, "voice_score": voice_result["overall"], "attempts": attempt + 1}

        # Revise based on voice feedback
        copy = await revision_agent.run(
            copy=copy,
            feedback=voice_result["deviations"],
            forbidden_terms=voice_result["forbidden_terms_found"]
        )

    # Return best effort with warning
    return {"copy": copy, "voice_score": voice_result["overall"],
            "warning": "Did not pass voice check after max retries", "attempts": max_voice_retries}
```

---

## 5. Funnel Copy Production Pipeline

**Use for**: Full funnel content suites — generating copy for every stage in one coordinated run
**Skills integration**: Funnel Architecture skill defines the structure; this executes the copy
**Output**: Complete funnel copy package per product/offer
**Estimated cost**: $0.80-2.50 per complete funnel (depends on funnel type and length)
**Estimated time**: 3-8 minutes (with parallel execution)

### Funnel Copy Workflow

```
[Funnel Strategy Input]
    → Value Ladder position, traffic temperature, funnel type
    ↓
[Offer Stack Agent] (Sonnet + extended thinking)
    → Defines: Core offer, OTO1, OTO2, downsell, guarantee, bonuses
    ↓
[Parallel Copy Generation] (all run simultaneously — critical for speed)
    ├── Opt-in Page Copy Agent        (Sonnet, cached brand voice)
    ├── VSL Script Agent              (Sonnet + thinking, cached frameworks)
    ├── Email Sequence Agent x5       (Sonnet, Soap Opera structure)
    ├── Sales Page Agent              (Sonnet + thinking, longest output)
    ├── OTO Page Agent(s)             (Sonnet, cached from sales page context)
    └── Thank You Page Agent          (Haiku — simple)
    ↓
[Consistency Check Agent] (Sonnet — sees all outputs)
    → Ensures promise continuity across all pages
    → Flags contradictions between pages
    → Verifies awareness-level progression matches funnel flow
    ↓
[Output: Complete Copy Package]
```

### Funnel Copy Cost Estimate

| Funnel Component | Model | Est. Tokens (in/out) | Est. Cost |
|---|---|---|---|
| Offer stack design | Sonnet + thinking | 2,000/1,500 | $0.03 |
| Opt-in page | Sonnet (cached) | 2,500/800 | $0.02 |
| VSL script (5-10 min) | Sonnet + thinking | 3,000/3,000 | $0.06 |
| Email sequence (5 emails) | Sonnet (cached) x5 | 2,000/600 each | $0.08 |
| Sales page (long-form) | Sonnet + thinking | 4,000/4,000 | $0.08 |
| OTO page x2 | Sonnet (cached) x2 | 2,000/1,000 each | $0.04 |
| Thank you page | Haiku | 1,000/300 | $0.001 |
| Consistency check | Sonnet | 15,000/1,000 | $0.06 |
| **Total** | | | **$0.37-0.80** |

*With prompt caching on brand voice and framework instructions, input costs reduce by ~60%
on the parallel generation steps.*

### Awareness-Level Context Injection

The funnel copy system injects awareness level into every generation call, ensuring copy
matches where the prospect is in the journey:

```python
FUNNEL_STAGE_AWARENESS = {
    "opt_in_page": {
        "level": "unaware_to_problem_aware",
        "description": "Broad audience, curious but not committed. Lead with intrigue or problem agitation.",
        "hook_strategy": "curiosity or problem identification",
        "cta_style": "low commitment (free, instant access)"
    },
    "vsl_opening": {
        "level": "problem_aware",
        "description": "They clicked — they have the problem. Validate their experience, then introduce the mechanism.",
        "hook_strategy": "empathy + story + mechanism reveal",
        "cta_style": "continue watching / read more"
    },
    "sales_page": {
        "level": "solution_aware",
        "description": "They watched the VSL or read the pre-frame. They know a solution exists. Now convince them THIS solution.",
        "hook_strategy": "unique mechanism + proof + offer stack",
        "cta_style": "direct purchase with risk reversal"
    },
    "oto_page": {
        "level": "product_aware",
        "description": "They just bought. High trust, high momentum. Offer is a natural extension.",
        "hook_strategy": "complement the purchase + urgency",
        "cta_style": "one-click upsell"
    },
    "email_day1": {
        "level": "product_aware",
        "description": "Just opted in. High attention, low commitment. Deliver value, build relationship.",
        "hook_strategy": "deliver the promise + tell your story",
        "cta_style": "soft CTA to consume content"
    },
    "email_day3_5": {
        "level": "most_aware",
        "description": "They've seen the offer, received value. Need a reason to act NOW.",
        "hook_strategy": "urgency + scarcity + social proof",
        "cta_style": "direct with deadline"
    },
}

def get_copy_prompt(stage: str, offer_brief: dict) -> str:
    awareness = FUNNEL_STAGE_AWARENESS[stage]
    return f"""
    Write {stage} copy for this offer.
    The prospect is at the {awareness['level']} stage of awareness.
    This means: {awareness['description']}
    Hook strategy: {awareness['hook_strategy']}
    CTA style: {awareness['cta_style']}

    Offer brief: {json.dumps(offer_brief, indent=2)}
    """
```

---

## 6. Client AI Deployment Framework

**Use for**: Building and deploying AI workflows for clients — from discovery to production
**Complexity**: Multi-phase project framework
**Timeline**: 2-6 weeks depending on complexity

### Phase 1: Discovery and Scoping (Week 1)

Before building anything, answer these questions with the client:

**The AI Audit** (5 discovery questions):

| Question | What It Reveals | Example Good Answer |
|---|---|---|
| What are the 3 highest-volume, most repetitive tasks? | Automation candidates | "We write 50 product descriptions/week" |
| Which tasks produce consistent outputs? | AI-suitable vs. judgment-heavy | "Product descriptions follow a template" |
| Where does quality inconsistency cause downstream problems? | High-ROI targets | "Inconsistent emails confuse customers" |
| What does "good" look like? Show 3 examples. | Evaluation criteria + training data | Client provides 3 rated examples |
| What's the cost of doing this manually per week? | ROI calculation input | "2 people x 10 hours x $40/hr = $800/week" |

**ROI Estimation**:
```python
# ROI calculator
manual_cost_per_week = hours_saved_per_run * runs_per_week * hourly_cost
ai_cost_per_week = ai_cost_per_run * runs_per_week
weekly_savings = manual_cost_per_week - ai_cost_per_week
annual_savings = weekly_savings * 52
roi_multiplier = weekly_savings / ai_cost_per_week

# Example: 50 product descriptions/week
# Manual: 0.5 hours * 50 * $40 = $1,000/week
# AI: $0.15 * 50 = $7.50/week
# Weekly savings: $992.50
# Annual savings: $51,610
# ROI: 132x
```

Target: >10x ROI on straightforward automation tasks. Be conservative in estimates.

### Phase 2: Prototype (Week 2)

Build the simplest version that demonstrates value:

| Principle | Implementation |
|---|---|
| Single LLM call, not agentic | One prompt, one model, one output |
| Manual input/output | Google Sheet or form as I/O — no integrations |
| Quality first, automation second | Nail the output before wiring anything |
| Test with real examples | 20+ actual inputs from the client's work |
| Define quality criteria first | Written rubric before building the eval |

**Prototype eval set**: Collect 20+ real inputs from the client. Run through the prototype.
Have the client score outputs 1-5 on their quality criteria. Target: average score >= 4.0.

### Phase 3: Production Hardening (Weeks 3-4)

Before deploying to production, complete this checklist:

| Category | Requirement | Tool/Method |
|---|---|---|
| **Eval suite** | 50+ test cases (normal, edge, adversarial) | Promptfoo (see `evaluation-testing.md`) |
| **Output validation** | Schema enforcement + business logic | jsonschema/Pydantic + custom rules |
| **Error handling** | Graceful failures, retry, escalation | Try/catch + circuit breaker pattern |
| **Logging** | Full prompt + response per call | Structured logging to DB or Airtable |
| **Cost monitoring** | Per-run cost tracking with alerts | Token tracking + daily budget cap |
| **Human review** | Checkpoint for external outputs | Approval gate pattern |
| **Model pinning** | No auto-updates to new versions | Specific model version ID |
| **Rollback plan** | Manual process remains available | Documented fallback procedure |

### Phase 4: Measurement and Improvement (Ongoing)

Track from day 1:

| Metric | How to Measure | Alert Threshold |
|---|---|---|
| **Volume** | Runs per day/week | Below 50% of projected (underutilized) |
| **Quality score** | LLM-as-Judge (automated) + human spot-check | Below 4.0/5.0 average |
| **Cost per output** | Total AI spend / successful outputs | >2x projected |
| **Time saved** | Actual vs. projected hours saved | <50% of projected |
| **Failure rate** | Runs requiring human intervention | >15% |
| **Client satisfaction** | NPS or satisfaction survey | Below 7/10 |

### Client System Prompt Template

```xml
<role>
You are an AI assistant for {{COMPANY_NAME}}, specialized in {{SPECIFIC_FUNCTION}}.
You have deep expertise in {{RELEVANT_DOMAIN}}.
</role>

<company_context>
{{COMPANY_DESCRIPTION}}
{{THEIR_CUSTOMER_PROFILE}}
{{THEIR_UNIQUE_VALUE_PROPOSITION}}
</company_context>

<brand_voice>
{{BRAND_VOICE_BLOCK — see Section 4}}
</brand_voice>

<task_instructions>
{{SPECIFIC_TASK_INSTRUCTIONS}}
</task_instructions>

<quality_standards>
{{QUALITY_CRITERIA — specific, measurable, tied to eval rubric}}
</quality_standards>

<output_format>
{{EXACT_SCHEMA — JSON or structured text}}
</output_format>

<constraints>
- Never mention competitor products by name
- Never make claims about pricing without confirming with the provided price list
- If uncertain about company-specific information, say "I'll need to verify this" rather than guessing
- If the input is ambiguous or incomplete, list what's missing before attempting the task
- Escalate to a human if: {{ESCALATION_CONDITIONS}}
</constraints>
```

---

## 7. Personal Productivity Stack

**Use for**: Supercharging personal research, writing, and decision-making workflows
**Complexity**: Mix of single calls and simple workflows
**Cost**: $1-10/day for active use

### The Daily Intelligence Brief

Automated morning brief that aggregates and synthesizes overnight signals:

```python
# Runs on schedule (overnight via n8n Schedule Trigger)
sources = [
    fetch_rss_feeds(SUBSCRIBED_FEEDS),          # 20-50 articles
    fetch_twitter_timeline(ACCOUNTS_TO_WATCH),   # 30-100 posts
    fetch_newsletter_inbox(),                     # 5-15 newsletters
    search_web(f"[industry] news {yesterday}")    # 10-20 results
]

# Step 1: Filter with Haiku (fast, cheap)
filtered = await haiku_filter.run(
    sources=sources,
    criteria=MY_FOCUS_AREAS,    # cached
    threshold=3                  # relevance score >= 3
)
# Cost: ~$0.01 for filtering 100-200 items

# Step 2: Synthesize with Sonnet
brief = await sonnet_synthesizer.run(
    filtered_signals=filtered,
    format="executive_brief",
    max_length="500 words",
    sections=["top_signals", "trends", "action_items"]
)
# Cost: ~$0.03

# Output delivered to email at 7am — total cost: ~$0.04/day
```

### The Research-to-Output Pipeline

For any significant piece of writing (article, proposal, strategy doc):

| Step | Time | Method | Cost |
|---|---|---|---|
| Research | 15 min | Deep research workflow (Section 1) | $0.10-0.30 |
| Outline | 5 min | Outline agent → section structure | $0.02 |
| Draft | 20 min | Section-by-section with research injected | $0.10-0.20 |
| Edit | 10 min | Reflection agent + human review | $0.03 |
| Polish | 5 min | Brand voice check + final human pass | $0.01 |
| **Total** | **~55 min** | | **$0.26-0.56** |

Equivalent manual time: 3-4 hours. Human judgment still required at: outline approval, edit
review, and final polish. The AI handles research, drafting, and quality-checking.

### The Decision Support Prompt

For complex decisions, use structured reasoning before deciding:

```xml
<task>
Help me think through this decision rigorously. Do not tell me what to decide — help me
think more clearly about the tradeoffs.

Specifically:
1. Steelman both options (strongest case for each — 3-4 points per option)
2. Identify my likely blind spots (what am I probably underweighting?)
3. Identify what information would most change the decision if I had it
4. What would the person I most respect in this domain think of each option?
5. Pre-mortem for each option: what causes it to fail 12 months from now?
6. Second-order effects: what does each option make easier or harder in the future?
</task>

<decision>{{DECISION DESCRIPTION}}</decision>
<context>{{RELEVANT CONTEXT — situation, constraints, history}}</context>
<options>{{OPTION A VS OPTION B — described factually}}</options>
<constraints>{{NON-NEGOTIABLES — things that must be true regardless}}</constraints>
<values>{{WHAT MATTERS MOST TO ME — ranked priorities}}</values>
```

**Cost**: $0.03-0.08 per decision analysis (Sonnet with extended thinking recommended for
complex decisions — see `claude-ecosystem.md` Section 3).

### The Prompt Library System

Maintain a personal library of your best prompts. Version control like code.

```
/prompts
  /research
    - competitive-analysis.md        ← v1.3, 92% eval pass rate
    - market-sizing.md               ← v2.1, 87% eval pass rate
    - customer-interview-synthesis.md ← v1.0, 85% eval pass rate
  /copy
    - email-subject-lines.md
    - cold-email.md
    - landing-page-section.md
  /strategy
    - offer-design.md
    - positioning-diagnosis.md
    - decision-support.md
  /meta
    - prompt-improvement.md     ← Prompt that improves other prompts
    - eval-generation.md        ← Generates test cases for a prompt
  /evals
    - competitive-analysis-eval.yaml  ← Promptfoo config
    - cold-email-eval.yaml
```

**Version control for prompts**:

```markdown
# prompt-name.md

## v1.2 (2026-03-01)
**Change**: Added output length constraint (200 words max)
**Reason**: v1.1 was producing outputs too long for email format
**Performance**: 87% pass rate on eval set (up from 74% in v1.1)
**Eval**: 50 test cases, Promptfoo config in /evals/

## Current Prompt
[prompt text here]
```

See `evaluation-testing.md` Section 3 for Promptfoo config-as-code eval setup and
Section 10 for CI/CD integration to automatically test prompt changes.

---

## 8. Workflow Cost & Performance Benchmarks

### Summary Comparison

| Workflow | Cost/Run | Latency | Quality (1-5) | Complexity |
|---|---|---|---|---|
| Deep Research | $0.10-0.50 | 30-90s | 4.0-4.5 | High (multi-agent) |
| Market Intelligence (daily) | $0.02-0.10 | 15-30s | 3.5-4.0 | Low (sequential) |
| Content Generation | $0.15-0.40 | 20-45s | 3.8-4.3 | Medium (pipeline) |
| Brand Voice Check | $0.003-0.008 | 2-5s | 4.0+ | Low (single call) |
| Funnel Copy Package | $0.40-2.50 | 3-8 min | 3.5-4.0 | High (parallel pipeline) |
| Decision Support | $0.03-0.08 | 5-15s | 4.0-4.5 | Low (single call + thinking) |
| Daily Intelligence Brief | $0.03-0.05 | 15-30s | 3.5-4.0 | Medium (filter + synthesize) |

### Model Selection Per Workflow Step

| Step Type | Recommended Model | Why |
|---|---|---|
| Classification / filtering | Claude Haiku 3.5 | Fast, cheap, accurate enough |
| Strategy / planning | Claude Sonnet 4 + thinking | Complex reasoning benefits from thinking |
| Content generation | Claude Sonnet 4 (cached) | Balanced quality/cost, caching saves 60%+ |
| Quality review / scoring | Claude Haiku 3.5 | Fast scoring, separate context for objectivity |
| Complex synthesis | Claude Sonnet 4 + thinking | Multi-source integration needs reasoning budget |
| Simple formatting / extraction | Claude Haiku 3.5 or GPT-4.1 mini | Cheapest option for simple tasks |

### Optimization Priorities by Workflow Volume

| Daily Volume | Primary Optimization | Secondary | Tools |
|---|---|---|---|
| <10 runs | Quality (get it right) | N/A | Manual testing |
| 10-100 runs | Quality + eval automation | Cost monitoring | Promptfoo, basic logging |
| 100-1K runs | Caching + model routing | Eval CI/CD | Prompt caching, Braintrust |
| 1K+ runs | Full cost governance | Batching + routing | All of the above + monitoring |

See `production-optimization.md` for model routing, fine-tuning breakpoints, and latency
optimization at scale.
