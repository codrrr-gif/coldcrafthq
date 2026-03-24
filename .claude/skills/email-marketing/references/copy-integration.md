# Copy Integration — The Bridge Between System and Craft

This reference is the explicit integration point between this skill (the system layer) and
the Elite Copywriting skill (the craft layer). When email copy is needed, these two skills
operate as a unit. This file defines the handoff protocol: what the system layer provides
to the copy layer, and what the copy layer must produce for the system to use it.

> "Great copy running in a bad system produces average results.
> An average system running great copy produces above-average results.
> A great system running great copy produces elite results."

The Elite Copywriting skill governs the craft. This file governs the interface.

---

## Table of Contents
1. The Division of Responsibility
2. The Copy Brief — What System Layer Provides to Copywriting
3. The Copywriting Deliverable — What Copy Layer Produces for the System
4. Awareness Level Application in Cold Email
5. Hook Type Selection Framework
6. The Follow-Up Copy Protocol
7. CTA Architecture for Cold Email
8. Spintax Copy Guidelines
9. AI-Assisted Copy Production Workflow
10. Quality Standards Checklist
11. Copy Performance Benchmarks
12. Common Copy Failures & Diagnostic Patterns

---

## 1. The Division of Responsibility

**Email System Layer (this skill)**:
- Who receives the email (ICP, segment, trigger)
- When they receive it (cadence, sequence position, timing)
- What structure it fits (step 1 vs. follow-up vs. breakup)
- What the CTA achieves (the desired conversation outcome)
- How it's tested (A/Z variant structure)
- How it's delivered (spintax wrapper, personalization variables)

**Elite Copywriting Skill**:
- What specific words, phrases, and constructions achieve the desired response
- How to implement the selected hook type with maximum impact
- How to write a subject line that earns the open
- How to write an opening line that earns the read
- How to transition from problem/proof to offer without feeling like a pitch
- How to write a CTA that gets a yes

**The practical division**:
The system layer writes the brief. The copywriting skill executes the brief.
This file is the brief template.

---

## 2. The Copy Brief — What System Layer Provides

Before any email is written (by you, a copywriter, or AI), complete this brief.
Incomplete briefs produce copy that doesn't fit the system.

**[COPY BRIEF TEMPLATE]**

```
CAMPAIGN CONTEXT
Campaign Name: [Descriptive name including ICP + hook type]
Sequence Step: [Step 1 / Step 2 / Step 3 / etc.]
Step Purpose: [Primary hook / Follow-up / Proof / Direct ask / Breakup]
Intent Tier: [High-intent / Trigger-matched / Fit-only / Re-engagement]
Cadence: [Day 1, 3, 7, 11, 17 / compressed / extended]

ICP PROFILE
Target person: [Exact title, seniority, company type]
Company characteristics: [Size, industry, stage, tech stack]
Trigger/signal: [What specific event or signal identified this person as relevant]
Psychographic profile: [Data-driven / Relationship-driven / Risk-averse / Growth-oriented]

PAIN AND AWARENESS
Awareness level: [Problem Aware / Solution Aware]
Primary pain: [The specific frustration — in their language, not yours]
Cost of inaction: [What happens if they don't solve this — specific, quantified if possible]
Current "good enough" solution: [How they're coping now]
Why it's insufficient: [The specific limitation creating the opening]

OFFER CONTEXT
What you do in one line: [Concise mechanism statement — not features, the transformation]
The unique proof: [Most relevant case study: "[Company] achieved [result] in [timeframe]"]
Competitive differentiation: [Why this vs. their current approach or alternatives]
Social proof tier: [Direct competitor proof / same industry / same size / general]

COPY OBJECTIVES
Step purpose in the sequence: [What this step must do given prior context]
Desired emotion upon reading: [Curious / Recognized / Validated / Motivated]
CTA target: [Exact ask — be specific about friction level and outcome]
Word count target: [Step 1: ≤80 / Step 2: ≤50 / Step 3: ≤60 / Step 4: ≤30 / Step 5: ≤40]
Hook type: [Problem / Timeline / Social Proof / Curiosity / Direct]

PERSONALIZATION VARIABLES
Available fields: [List the actual data fields: {{companyName}}, {{firstName}}, {{trigger_field}}]
Custom icebreaker source: [LinkedIn post / recent news / funding / job posting / etc.]
Segment-specific proof: [The case study or social proof most relevant to THIS segment]
AI personalization tier: [None / Basic (variables only) / Medium (AI first line) / Deep (Clay research)]

SPINTAX REQUIREMENT
Subject line variants needed: [3-4 recommended]
Opening line variants needed: [3-4 recommended]
CTA variants needed: [2-3 recommended]
Total unique versions target: [50+ for spam filter safety]
```

See `references/icp-segmentation.md` for ICP definition frameworks and segment mapping
templates that feed directly into this brief.

See `references/ai-personalization.md` for Clay-based enrichment that populates the
personalization variables section automatically at scale.

---

## 3. The Copywriting Deliverable — What Copy Layer Must Produce

Every piece of email copy produced for use in Instantly must deliver:

**For each sequence step**:

| Deliverable | Specification | Notes |
|---|---|---|
| Subject line | 3-4 spintax variants, <50 characters each | All equally strong — no filler variants |
| Opening line | 3-4 spintax variants, <20 words each | Prospect-first — first word is NOT "I" |
| Body | Complete email within word count target | Single idea, one proof point maximum |
| CTA | 2-3 spintax variants | Same friction level, different phrasing |
| Full assembled version | Complete spintax-ready email for Instantly import | All variants must read naturally in combination |

### Format for Instantly Import

```
Subject: {Quick question about {{companyName}}|Following up on your growth|Noticed something about {{companyName}}}

{Hi|Hey} {{firstName}},

{I noticed|I came across|I saw} {{triggerField}} — {most companies at that stage|teams like yours|similar companies}
{run into|struggle with|face} {{specificPain}}.

{We helped|I worked with} {{comparableCompany}} {achieve|get to|increase} {{specificResult}}
{in|within|over} {{timeframe}}.

{Would it make sense|Worth a quick chat|Open to a quick call} to see if we can do the same for {{companyName}}?

{{signature}}
```

### Deliverable Quality Gates

Before accepting copy from any source (human writer, AI, Copilot):

```
GATE 1: Structure (pass/fail)
  [ ] Within word count target for this step
  [ ] Single CTA (not multiple asks)
  [ ] No calendar link in Step 1
  [ ] Subject line under 50 characters

GATE 2: Relevance (pass/fail)
  [ ] Opens with prospect's world, not sender's
  [ ] References specific pain from the brief
  [ ] Proof point matches ICP segment (not generic)
  [ ] CTA friction appropriate for sequence step

GATE 3: Quality (pass/fail)
  [ ] Passes Instantly Copilot spam check
  [ ] All spintax variants are equally strong
  [ ] Reads naturally when spoken aloud
  [ ] No jargon the prospect might not recognize

GATE 4: System fit (pass/fail)
  [ ] All {{variables}} exist in the contact data
  [ ] Fallback behavior defined for empty variables
  [ ] Spintax produces 50+ unique combinations
  [ ] Compatible with A/Z testing structure
```

---

## 4. Awareness Level Application in Cold Email

Cold email audiences are almost always at the **Problem Aware** or **Solution Aware** stage.
Rarely Unaware (if they don't know the problem exists, they can't respond to a cold email about it).
Rarely Product Aware (they don't know you yet — that's why it's cold).

**Read `references/psychology.md` in the Elite Copywriting skill** for the full awareness
framework. Below is the application specifically for cold email:

### Awareness Level Matrix for Cold Email

| Awareness Level | % of Cold Email Audience | Lead With | Avoid | Sequence Strategy |
|---|---|---|---|---|
| **Problem Aware** | 60-75% | The pain in their language | Your solution or features | Pain amplification in Step 1; introduce solution only in Step 2-3 |
| **Solution Aware** | 20-30% | Why your mechanism is different | Vague benefit claims | Faster to mechanism; more proof; more specific CTA |
| **Unaware** | 3-5% | Don't cold email them | Cold email as a channel for this segment | Educate through content marketing, not cold email |
| **Product Aware** | 2-5% | Not typical in cold email | Treating them like Problem Aware | Only relevant for re-engagement of previous prospects |

### Problem Aware (Most Common in Cold Email)

The prospect knows they have the problem but hasn't actively searched for a solution,
or has accepted it as "just how it is."

**Lead with**: The pain in their language. Not your solution. The problem.
**Opening pattern**: "Most [role]s at [company type] deal with [specific pain]..."
**Sequence strategy**: Start with pain amplification; introduce solution only in step 2-3
after establishing that you understand their world
**Proof type**: Social proof from a similar company ("we helped [comparable] solve this exact thing")

**Step 1 Template (Problem Aware, VP Sales, Series B SaaS)**:
```
Subject: {pipeline visibility at {{companyName}}|quick question about forecasting|thought about {{companyName}}'s pipeline}

{Hi|Hey} {{firstName}},

{Most VP Sales at Series B companies I talk to|A lot of sales leaders at your stage|
Teams like yours} are {flying blind on pipeline health until their weekly forecast call|
stuck doing manual pipeline reviews that are outdated by the time they're done} —
{by which time it's too late to change anything|which means surprises every Friday}.

We helped [Company] go from {weekly surprises to real-time pipeline confidence|
guessing at forecast to 94% accuracy within 60 days}.

{Worth a quick chat?|Would it make sense to connect?|Any interest in comparing notes?}
```

**Performance benchmark**: Problem Aware Step 1 emails with tight ICP targeting typically
produce 4-7% reply rates with 40-55% positive reply rate.

### Solution Aware (High-Intent Segments)

The prospect knows solutions exist and is evaluating them. More sophisticated audience
that will see through vague messaging immediately.

**Lead with**: Why your mechanism is different from alternatives they've already considered.
**Opening pattern**: Reference the category ("you're probably already looking at [category]...")
**Sequence strategy**: Faster to the mechanism; more proof; more specific CTA
**Proof type**: Direct results data, ideally from a company they know or can verify

**Step 1 Template (Solution Aware, Head of RevOps evaluating tools)**:
```
Subject: {different approach to {{companyName}}'s [category]|quick thought on [category] at {{companyName}}}

{Hi|Hey} {{firstName}},

{If you're evaluating|I imagine you've already looked at} [category] tools —
{most of them|the usual suspects} {solve for [surface problem] but miss|
handle [basic function] fine but fall short on} [the deeper problem you uniquely solve].

{The difference with our approach|What's different about how we handle this}:
[1-sentence mechanism — how, specifically, you solve it differently].

{[Company] switched from [competitor/old approach] and saw|After moving from
[alternative], [Company] achieved} [specific result in timeframe].

{Worth 15 minutes to see if it'd work for {{companyName}}?|Open to a quick comparison?}
```

**Performance benchmark**: Solution Aware emails to intent-signal contacts typically
produce 8-15% reply rates with 55-70% positive reply rate.

---

## 5. Hook Type Selection Framework

The hook type is the single highest-leverage copy decision. Data from Instantly's 2026
benchmark (16.5M emails): **Timeline hooks produce 2.3x more replies and 3.4x more meetings
than problem-only hooks.**

### Hook Type Performance Data

| Hook Type | Reply Rate Range | Meeting Rate/1,000 | Positive Reply % | Best For |
|---|---|---|---|---|
| **Timeline** | 8-12% | 12-18 | 55-70% | Recent trigger exists (funding, hire, launch) |
| **Social Proof** | 5-8% | 8-14 | 50-65% | Similar companies to prospect have achieved results |
| **Direct** | 6-10% | 10-16 | 60-75% | High-intent audiences (pricing page visit) |
| **Problem** | 4-7% | 6-10 | 40-55% | Broad ICP, no strong signal |
| **Curiosity** | 3-6% | 5-9 | 45-60% | Sophisticated audiences who tune out direct approaches |

### Decision Logic (Follow in Order)

```
Step 1: Do I have a specific trigger for this person?
        (Funding, hire, product launch, M&A, growth spike)
        → YES → Timeline hook
        → NO → Continue

Step 2: Do I have directly relevant social proof?
        (Same industry, same size, same pain, specific results)
        → YES → Social Proof hook
        → NO → Continue

Step 3: Is this a high-intent signal contact?
        (Pricing page visit, G2 category page, competitor review)
        → YES → Direct hook
        → NO → Continue

Step 4: Is the audience sophisticated and likely ad-blind?
        (C-suite, 10+ cold emails/day, enterprise buyers)
        → YES → Curiosity hook
        → NO → Continue

Step 5: None of the above?
        → Problem hook (the safe default)
```

### Hook Type Templates

**Timeline Hook**:
```
"Congrats on [specific trigger]. Companies at that stage usually hit [specific growing pain]
right around [timeframe] — we help teams [specific solution]."

Key elements: Specific event + natural consequence + your role
```

**Social Proof Hook**:
```
"[Similar Company] was dealing with [their exact pain]. We helped them [specific result
in X timeframe]. Curious if you're running into something similar at {{companyName}}."

Key elements: Comparable company + specific result + connecting question
```

**Direct Hook**:
```
"I'll be brief — [specific observation about their situation]. We specialize in helping
[their type of company] with [specific outcome]. Worth 15 minutes?"

Key elements: Observation + specialization + direct ask
```

**Problem Hook**:
```
"Most [role]s at [company type] deal with [specific pain] — and it usually costs them
[quantified cost of inaction]. Worth exploring whether [specific outcome] is realistic?"

Key elements: Universal pain + cost of inaction + outcome question
```

**Curiosity Hook**:
```
"Found something interesting about [their industry/company]. Most teams in your space are
[common approach] when the data shows [counterintuitive insight]. Open to hearing more?"

Key elements: Intrigue + common behavior + counterintuitive finding
```

See `references/icp-segmentation.md` Section 3 for matching intent tiers to hook types
in campaign design.

---

## 6. The Follow-Up Copy Protocol

The most underdeveloped part of most sequences. Follow-ups are not reminders — they are
new attempts from a different angle.

### The Angle Rotation Model

Each follow-up uses a different persuasion angle from the Master Angles list. Never repeat
the same angle twice in a sequence.

**Master Angles for Follow-Ups**:

| Angle # | Angle Type | What It Does | Best For Step | Template |
|---|---|---|---|---|
| 1 | New data / statistic | Introduces specific, relevant number | Step 2-3 | "Quick stat: [X% of companies like yours] [relevant finding]" |
| 2 | Comparable company proof | Social proof from a similar company | Step 3 | "Worked with [company] on this exact thing — they [result]" |
| 3 | Their own language | References their website, LinkedIn, press | Step 2 | "Noticed you mentioned [quote] — that's exactly the problem we solve" |
| 4 | Reframe the problem | Same pain, completely different perspective | Step 3-4 | "Different way to think about [problem]: [reframe]" |
| 5 | Future cost | Quantified cost of inaction | Step 3 | "For teams your size, [problem] typically costs [amount] in [timeframe]" |
| 6 | Curiosity gap | Insight without revealing everything | Step 2-3 | "Found something about [their industry] that most [role]s miss..." |
| 7 | Direct question | Strip away all pitch; just ask | Step 4 | "Quick question: is [pain] something you're actively solving?" |

### The "Feels Like a Reply" Technique (Step 2)

The most effective follow-up format. Keep the subject as "Re: [original subject]".
Write as if you're naturally continuing a conversation:

```
Subject: Re: {original subject}

{One more thing I should have mentioned|Forgot to add this|Quick thought} —

[New specific angle: data point, reframe, or proof. ONE sentence.]

{Still worth a few minutes?|Any interest?|Does this resonate?}
```

**Performance data**: "Feels like a reply" Step 2 emails generate 18% of total sequence
replies — the highest of any follow-up step.

### The Breakup Email (Step 5 or Final)

**Copy principles**:
- Complete absence of pressure or guilt
- Genuine tone — not performative
- One last piece of value OR one last simple question
- Clear signal that this is the last reach-out
- Always leave the door open for them to reach out in the future

**Breakup template**:
```
Subject: Re: {original subject}

{{firstName}} — {I've sent a few notes over the past weeks|Last reach-out on this}.

{If timing isn't right or this isn't relevant, completely understand — won't
reach out again.|No worries if this isn't a fit — just closing the loop.}

{If [specific problem] becomes a priority, would love to help.|I'm here if
anything changes.}

{Either way, wish you well.|All the best.}
```

**Performance data**: Breakup emails generate 5% of total sequence replies. These are often
the highest-quality replies — prospects who were interested but procrastinating.

See `references/campaign-architecture.md` Section 3 for the complete step-by-step
design guide with templates for all 5 steps.

---

## 7. CTA Architecture for Cold Email

The CTA is where most cold email copy fails. The rules:

### The Friction Spectrum

| Friction Level | CTA Example | When to Use | Conversion Impact |
|---|---|---|---|
| **Lowest** | "Is this relevant?" | Step 1, cold ICP | Highest reply rate, lowest qualification |
| Low | "Would it be worth 15 minutes?" | Step 1-2 | 3.4x higher meeting rate than complex CTAs |
| Medium | "Can I send you a quick breakdown?" | Step 2-3 | Micro-commitment → builds toward meeting |
| Medium-High | "Worth a quick call this week?" | Step 3-4 | Direct scheduling ask |
| High | "Book a 20-minute call here: [link]" | Step 3-5 only | Only after prior engagement |
| **Highest (avoid)** | "Sign up for a demo" | Never in cold email | Product pitch framing; too high friction |

### CTA Rules by Sequence Step

| Step | CTA Rule | Why | Examples |
|---|---|---|---|
| Step 1 | Question-based only. No calendar links. No demo requests. | Too early for commitment | "Would it make sense to connect?" / "Is this on your radar?" |
| Step 2-3 | Can offer resource or suggest time. Still question-based preferred. | Building interest | "Happy to send a quick breakdown" / "Worth comparing notes?" |
| Step 4 | Direct call ask acceptable. Calendar link for first time. | Earned the right to ask directly | "How about [day] at [time]?" / "[Calendar link]" |
| Step 5 | Ultra low friction. Close the loop. | Breakup — remove all pressure | "If you ever want to explore, just reply" |

### The Winning CTA (Instantly 2026 Benchmark)

"Would you have a couple minutes to chat about this over the next few days?"
- Simple. Human. Non-threatening. Binary.
- 3.4x higher meeting rate than complex CTAs
- Works across industries and seniority levels

### CTAs to Avoid

| Bad CTA | Why It Fails | Better Alternative |
|---|---|---|
| "Schedule a demo" | Product pitch framing; too high friction | "Worth a quick chat?" |
| "Check out our website" | Sends them away; no accountability | "Can I send you a relevant case study?" |
| Multiple CTAs | Fragments attention; reduces action on all | Single ask per email |
| "Let me know your thoughts" | Too vague; prospect doesn't know what to do | "Is this relevant to what you're working on?" |
| "Would love to connect on LinkedIn" | Wrong channel for conversion | Keep conversion in email |
| "If you're interested, reply" | Passive; no urgency or direction | "Would [specific time] work for a quick call?" |

---

## 8. Spintax Copy Guidelines

When writing spintax variations for Instantly, follow these rules for quality:

### Core Principles

| Principle | Rule | Example |
|---|---|---|
| Equal strength | Every variant must perform well standalone | Test the "worst" variant — would you still send it? |
| Structural variety | Don't just synonym-swap — vary sentence structure | `{I noticed|Came across|Saw}` + `{I was looking at|While reviewing|Checking out}` |
| Meaning consistency | All variants must communicate the same core idea | Don't spin "problem" into "opportunity" — different framing |
| Personalization outside spintax | Variables stay outside spin brackets | `{I noticed|I saw} {{triggerField}}` NOT `{I noticed {{triggerField}}|I saw your company}` |
| Natural combinations | Every possible combination must read naturally | Preview 10+ full versions before launching |

### Spintax Quality Checklist

```
Before any spintax-enabled email goes live:

[ ] All variants read naturally (preview 10+ combinations in Instantly)
[ ] No variant creates awkward or nonsensical sentences
[ ] All variants maintain the same core meaning and tone
[ ] Personalization variables {{}} are OUTSIDE spintax brackets {}
[ ] Subject line spintax produces 3+ distinct subjects
[ ] Worst-case variant is still send-worthy
[ ] Spin points generate 50+ total unique combinations
[ ] Each spin point has 3-5 variants (not 2, not 8+)
[ ] Core proof claims are NOT spun (keep specific and consistent)
[ ] CTA core ask is consistent across variants (phrasing varies, not the ask itself)
[ ] Company name and offer name are NOT spun
[ ] Compliance elements present in every possible combination
```

### What NOT to Spin

| Element | Why | What to Do Instead |
|---|---|---|
| Your proof point / case study | Must remain specific and credible | Keep exact: "[Company] achieved [result]" |
| CTA's core ask | Varying the ask confuses; vary the phrasing | Same ask, different words |
| Personalization data (trigger, company, role) | Their data should be specific, not interchangeable | Use {{variables}} outside spintax |
| Company name or offer name | Brand consistency | Fixed text |
| Compliance elements (unsubscribe, identity) | Legal requirement | Fixed text per `compliance-legal.md` |

See `references/compliance-legal.md` for elements that must appear in every email variant
regardless of spintax.

---

## 9. AI-Assisted Copy Production Workflow

The optimal workflow for producing email copy at scale with AI assistance:

### The 6-Step Production Pipeline

| Step | Action | Tool | Time |
|---|---|---|---|
| 1 | Complete the Copy Brief (Section 2) | This template | 10-15 min |
| 2 | Load the Elite Copywriting skill context | `references/email-copy.md` | 2 min |
| 3 | Prompt Claude with full brief + skill context | Claude / Copilot | 5-10 min |
| 4 | Review output against Quality Standards (Section 10) | Manual + checklist | 5-10 min |
| 5 | Run through Instantly Copilot Spam Checker | Instantly | 2-5 min |
| 6 | Import to Instantly + set up A/Z test | Instantly | 5-10 min |

**Total time per sequence**: 30-60 minutes for a complete 5-step sequence with spintax.

### The AI Prompt Template

```
[Paste completed Copy Brief from Section 2]

Using the Elite Copywriting skill frameworks — specifically:
- Schwartz awareness level: [level from brief]
- Hook type: [hook from brief]
- Email copy principles from email-copy.md reference

Write Step [X] of a [N]-step cold email sequence.

Specific requirements:
- Under [word count] words
- Awareness level: [level]
- Hook type: [type]
- CTA: [specific ask — including friction level]
- Personalization variables to use: [list actual {{variables}}]
- Spintax required: [yes/no — specify which elements: subject, opening, CTA]

Reference proof: [specific case study: "[Company] achieved [result] in [timeframe]"]
Their specific pain: [pain statement in prospect's language]
Tone: [conversational / professional / direct / consultative]

Additional context:
- This is a [cold / warm / re-engagement] email
- Previous steps in the sequence: [brief description of prior steps if step 2+]
- What angle this step uses: [from angle rotation model]
```

### AI Output Review Protocol

After AI generates copy, verify:

```
1. Word count check: [actual] vs. [target] → Must be within 10% of target
2. First word check: Is the first word "I"? → Rewrite to be prospect-first
3. CTA check: Single ask? Appropriate friction? → Adjust if needed
4. Proof specificity: Is the case study specific or generic? → Must be specific
5. Pain accuracy: Does it match the brief's pain language? → Must match
6. Spintax quality: All variants equally strong? → Rewrite weak variants
7. Spam check: Any trigger words? → Run through Copilot
8. Natural speech test: Read aloud — does it sound human? → Revise if robotic
```

See `references/ai-personalization.md` for scaling this workflow with Clay-based AI
personalization that generates unique first lines for hundreds of contacts simultaneously.

---

## 10. Quality Standards Checklist

Before any email enters Instantly, verify:

### Subject Line

| Check | Standard | Why |
|---|---|---|
| Character count | Under 50 characters | Mobile truncation at 50 chars |
| Case | Lowercase (default for cold) | 32% higher open rate vs. title case |
| Curiosity | Creates curiosity gap OR specific context | Does not summarize the email — teases it |
| Spam check | No spam trigger words | Verified via Copilot spam checker |
| Variants | 3-4 spintax variants (all equally strong) | Testing + uniqueness |
| Personalization | Company name or trigger when available | 26% higher open rate with personalization |

### Opening Line

| Check | Standard | Why |
|---|---|---|
| First word | NOT "I" (prospect-first, not sender-first) | Self-focused opens reduce engagement 15-20% |
| Specificity | References something specific and true about them | Generic opens = generic results |
| Length | Under 20 words | Hooks must be fast |
| Value | Creates reason to keep reading (curiosity, recognition, relevance) | The opening earns the body read |
| Variants | 3-4 spintax variants | Testing + uniqueness |

### Body

| Check | Standard | Why |
|---|---|---|
| Step 1 word count | Under 80 words total | Every word over 80 reduces reply rate ~5% |
| Follow-up word count | Under 50 words total | Shorter follow-ups outperform by 22% |
| Idea count | Single idea per email | Multiple ideas fragment attention |
| Proof specificity | Specific company + specific result + specific timeframe | Generic "we help companies" = 0 credibility |
| Jargon check | No jargon the prospect might not recognize | Confusion ≠ curiosity |
| Read-aloud test | Reads naturally when spoken aloud | If it sounds robotic spoken, it reads robotic |

### CTA

| Check | Standard | Why |
|---|---|---|
| Count | Single ask per email | Multiple CTAs reduce conversion on ALL of them |
| Friction level | Appropriate for sequence step (see Section 7) | Too high too early kills reply rate |
| Calendar link | NO calendar link in Step 1 | Too presumptuous for first cold touch |
| Format | Binary or close-ended question (Steps 1-2) | Easy to answer = more answers |
| Variants | 2-3 spintax variants | Testing + uniqueness |

### Spam Check (Instantly Copilot)

| Check | Standard | Why |
|---|---|---|
| Trigger words | No flagged spam words | Copilot identifies risky phrasing |
| Formatting | No ALL CAPS | Spam signal |
| Punctuation | No excessive punctuation (!!!) | Spam signal |
| Links | No suspicious link patterns | Link-heavy emails flag filters |
| HTML | Plain-text style preferred | Text-to-HTML ratio impacts deliverability |

### Personalization

| Check | Standard | Why |
|---|---|---|
| Variable existence | All `{{variables}}` exist in contact data | Empty variables = broken personalization |
| Fallback handling | Defined behavior if `{{triggerField}}` is empty | Prevents "Hi {{firstName}}" failures |
| Authenticity | Personalization feels specific and genuine | Template-feeling personalization performs worse than none |
| Data accuracy | Verified for first 20-30 contacts in segment | Bad data = embarrassing errors at scale |

---

## 11. Copy Performance Benchmarks

### Performance by Copy Element

| Element Changed | Typical Impact on Reply Rate | Testing Priority |
|---|---|---|
| Hook type (problem → timeline) | +50-130% (2.3x for timeline) | Highest |
| Subject line (curiosity vs. direct) | +20-80% open rate variation | Highest |
| Opening line specificity (generic → trigger-based) | +30-60% reply rate | High |
| Email length (100+ words → sub-80) | +15-25% reply rate | High |
| CTA type (complex → simple question) | +40-100% (3.4x for simple) | High |
| Proof specificity (generic → same-industry case study) | +20-40% positive reply rate | Medium |
| Tone (formal → conversational) | +10-20% reply rate | Medium |
| Personalization depth (basic → AI first line) | +25-45% reply rate | Medium |

### Benchmark Targets by Campaign Type

| Campaign Type | Reply Rate Target | Positive Reply Target | Meetings/1,000 Target |
|---|---|---|---|
| High-intent (pricing page + ICP) | 15-30% | 60-75% of replies | 15-25 |
| Trigger-matched (funding, hire) | 8-15% | 50-65% of replies | 10-18 |
| Fit-only (ICP match, no signal) | 3-7% | 35-50% of replies | 5-10 |
| Re-engagement ("not now" contacts) | 10-20% | 50-70% of replies | 12-20 |

See `references/analytics-optimization.md` Section 9 for complete industry benchmark data.

---

## 12. Common Copy Failures & Diagnostic Patterns

### The Failure → Diagnosis → Fix Matrix

| Failure Pattern | Symptom | Root Cause | Copy Fix |
|---|---|---|---|
| **The Feature Dump** | Low reply rate despite relevant ICP | Email lists features instead of addressing pain | Rewrite: lead with their pain, not your product |
| **The Generic Open** | Opens but no replies | "I came across your company and..." — zero specificity | Rewrite: reference specific trigger, news, or observation |
| **The Wall of Text** | Low open-to-reply ratio | 150+ words, multiple paragraphs | Cut to <80 words Step 1, <50 words follow-ups |
| **The Premature Ask** | Low positive reply rate | Calendar link or demo request in Step 1 | Remove all high-friction CTAs from Step 1; use questions only |
| **The Identity Crisis** | Confused replies, "what do you do?" | Value prop unclear or tries to cover too much | One sentence: "We help [who] achieve [what] by [how]" |
| **The Copycat** | Declining performance over time | Using templates everyone else uses | Write original copy from the brief; test unconventional angles |
| **The Variable Failure** | Embarrassing "Hi {{firstName}}" sends | Empty variables or wrong field mapping | Always define fallbacks; test with 20 contacts before full send |
| **The Tone Mismatch** | Low engagement from target persona | Casual tone to enterprise buyers, or formal tone to startups | Match tone to psychographic profile from the brief |

### Copy Diagnostic Protocol

When any email underperforms (reply rate below target for 200+ sends):

```
Step 1: Check deliverability first
  → Is this a delivery problem, not a copy problem?
  → See analytics-optimization.md diagnostic framework

Step 2: Check subject line (open rate)
  → Open rate below 30%? Subject line is the bottleneck
  → Test 3 new subjects with fundamentally different approaches

Step 3: Check opening line (open → reply conversion)
  → High opens, low replies? Opening line loses them
  → Rewrite with more specificity, different hook type

Step 4: Check CTA (reply quality)
  → Getting replies but wrong type? CTA is misfiring
  → Adjust friction level, simplify the ask

Step 5: Check proof point (positive reply rate)
  → Low positive %, high confused %? Proof isn't landing
  → Use more specific, more relevant case study for this segment

Step 6: Nuclear option — completely new approach
  → If steps 2-5 don't move the needle after 2 test cycles
  → Different hook type, different angle, different awareness level treatment
  → See campaign-architecture.md for A/Z testing methodology
```

See `references/analytics-optimization.md` Section 2 for the complete diagnostic framework
that integrates copy diagnosis with system-level metrics.
