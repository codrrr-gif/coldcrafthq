# Campaign Architecture — Sequence Design, Cadence & Testing

The structural layer of the system. This is where list precision becomes a measurable
outcome. Campaign architecture determines: how many touches reach a prospect, when each
arrives, what angle each takes, how variations are tested, and how the sequence branches
based on behavior. Done right, this is the 50% of the 30/30/50 rule that most operators
neglect.

---

## Table of Contents
1. Sequence Architecture Principles
2. The Optimal Sequence Structure
3. Step-By-Step Design Guide
4. The Follow-Up Doctrine
5. Cadence and Timing
6. Spintax — Variation at Scale
7. A/Z Testing Methodology
8. Subsequences — Behavioral Branching
9. The Evergreen Campaign Model
10. Campaign Settings in Instantly
11. Campaign Launch Checklist

---

## 1. Sequence Architecture Principles

### Every Step Must Earn Its Place
A sequence step that exists only to "bump" a previous email is a wasted opportunity and
a mild reputation risk. Each step should bring a new angle, new piece of evidence, new
framing, or new value. The prospect who didn't reply to step 1 wasn't convinced by that
angle — not by the email itself.

**The angle rotation rule**: Each step rotates through a different persuasion lever:

| Step | Angle | Purpose | Word Count Target |
|---|---|---|---|
| Step 1 | Primary hook (problem/timeline/social proof) | Earn the first read + reply | ≤ 80 words |
| Step 2 | "Feels like a reply" — new angle | Re-engage without repeating | ≤ 50 words |
| Step 3 | Proof / insight / case study | Build credibility | ≤ 60 words |
| Step 4 | Direct question about their situation | Strip away pitch; genuine inquiry | ≤ 30 words |
| Step 5 | Breakup — close the loop | Create closure, trigger latent interest | ≤ 40 words |

See `references/copy-integration.md` for the full hook type selection framework and copy
brief template for each step.

### Brevity Is Not Optional

| Email Type | Target Word Count | Maximum | Performance Impact |
|---|---|---|---|
| Step 1 (cold open) | 60-80 words | 100 words | Every 10 words over 80 reduces reply rate ~5% |
| Step 2-3 (follow-ups) | 30-50 words | 60 words | Shorter follow-ups outperform longer by 22% |
| Step 4 (direct question) | 15-30 words | 40 words | Ultra-short = highest per-word conversion |
| Step 5 (breakup) | 25-40 words | 50 words | Brevity signals respect for their time |

Elite performers average fewer than 80 words per first-touch email. Every word beyond the
minimum necessary is a word that creates an opportunity for the prospect to stop reading.
Cold email is not a brochure. It is a conversation starter.

### One CTA Per Email
Every email ends with exactly one ask. Multiple CTAs fragment attention and lower conversion
on all of them. The ask should be the lowest possible friction that still moves the prospect
toward a conversation.

**CTA progression across a sequence**:
```
Step 1: "Would it be worth a quick chat?" (conversational, low commitment)
Step 2: "Is this on your radar for Q[X]?" (timing-based, easy yes/no)
Step 3: "I put together a quick breakdown of how [Company] solved X..."
Step 4: "I'll keep this short — is [specific problem] something you're actively working on?"
Step 5: "Figured I'd reach out one more time — if timing's off, totally understand."
```

See `references/copy-integration.md` Section 7 for the full CTA friction spectrum and
rules by sequence step.

---

## 2. The Optimal Sequence Structure

Based on the Instantly 2026 benchmark data (16.5M+ emails analyzed):

### Reply Distribution by Step

| Step | % of Total Replies | Cumulative | Implication |
|---|---|---|---|
| Step 1 | 58% | 58% | Step 1 must be your best copy — it does most of the work |
| Step 2 | 18% | 76% | "Feels like a reply" format; high leverage |
| Step 3 | 11% | 87% | Proof/insight step — catches the skeptics |
| Step 4 | 8% | 95% | Direct question — catches the busy |
| Step 5 | 5% | 100% | Breakup — catches the procrastinators |

The sweet spot for sequence length is **4-7 steps**:
- Under 4 steps: leaves significant reply rate on the table (up to 24% of replies come after step 3)
- Over 7 steps: diminishing returns without new value; spam complaint risk increases
- **Optimal: 5 steps over 14-21 days**

### Default Elite Sequence Architecture

```
Step 1 (Day 1)    — Primary hook. Best copy. Clearest value prop. Lowest friction CTA.
                     Subject: 6-10 words, lowercase, curiosity gap
                     Format: 3-4 short paragraphs, ≤80 words total

Step 2 (Day 3)    — "Feels like a reply" format. New angle. ~30% shorter than step 1.
                     Subject: Re: [original subject line]
                     Format: 2-3 sentences only

Step 3 (Day 7)    — Social proof or insight. Case study, stat, or counterintuitive finding.
                     Subject: Re: [original subject line] OR new subject
                     Format: Proof point + connecting question, ≤60 words

Step 4 (Day 11)   — Direct question about their specific situation. Personal, short.
                     Subject: Re: [original subject line]
                     Format: 1-2 sentences, ≤30 words

Step 5 (Day 17)   — Breakup email. Close the loop. Leave door open for future.
                     Subject: Re: [original subject line]
                     Format: Acknowledge outreach, offer closure, ≤40 words
```

### Adjustments by Intent Tier

| Intent Level | Cadence | Steps | CTA Style | Expected Reply Rate |
|---|---|---|---|---|
| High-intent (pricing page visit) | Day 1, 2, 5 | 3-4 | Direct: book a call | 15-30% |
| Trigger-matched (funding, hire) | Day 1, 3, 7, 12 | 4-5 | Low-friction question | 8-15% |
| Fit-only (no strong signal) | Day 1, 4, 9, 14, 21 | 5-7 | Curiosity / resource offer | 3-7% |
| Re-engagement | Day 1, 5, 12 | 3 | New angle + timing check | 5-10% |

See `references/icp-segmentation.md` Section 3 for the intent tier definitions and
campaign-to-intent mapping.

---

## 3. Step-By-Step Design Guide

### Step 1 — The Opening

**Subject line** (most tested element — highest leverage):

| Element | Best Practice | Data Point |
|---|---|---|
| Length | 6-10 words; under 50 characters | Mobile truncation at 50 chars; 1-3 word subjects: 75.4% open rate |
| Case | Lowercase | 32% higher open rate vs. title case (Instantly 2026 benchmark) |
| Style | Curiosity gap > direct benefit | Curiosity subjects: 2.1x click-through vs. benefit statements |
| Personalization | Company name or trigger reference | Personalized subjects: 26% higher open rate |
| Avoid | Summarizing the email | Subject that reveals everything removes reason to open |

**Subject line templates that work**:
```
{quick question about {{companyName}}|{{companyName}}'s [specific area]|thought about [trigger]}
{noticed something about {{companyName}}|question about [their initiative]|[pain topic] at {{companyName}}}
```

**Opening line** (second-most important — determines if they keep reading):
- No "I hope this finds you well"
- No throat-clearing about yourself
- Enter the conversation already happening in their mind (Robert Collier's principle)
- Reference a specific trigger, observation, or their stated priority
- Maximum 1-2 sentences before value

**Opening line patterns by hook type**:
```
Problem: "Most [role]s at [company type] I talk to are dealing with [specific pain]..."
Timeline: "Congrats on [specific trigger] — typically when teams hit that stage..."
Social Proof: "[Similar company] was facing the exact same challenge with [pain]..."
Curiosity: "Found something interesting about [their space/company]..."
Direct: "I'll be brief — are you the right person to talk to about [problem]?"
```

**Body** (the bridge):
- State the specific problem you solve (not features — the transformation)
- Connect it to their situation (ICP, trigger, or pain signal you identified)
- One proof point or social signal (not a list — one specific, concrete example)
- Under 80 words total for Step 1

**CTA**:
- Single question or single request
- Binary (yes/no) or minimal decision load
- "Would it make sense to connect?" — 3.4x higher meeting rate than complex CTAs
- Never include a calendar link in Step 1 cold email (too presumptuous; jumps steps)

### Step 1 Complete Template

```
Subject: {quick question about {{companyName}}|{{companyName}}'s [area]|thought about [trigger]}

{Hi|Hey} {{firstName}},

{I noticed|I saw|I came across} {{triggerField}} — {most|many} {[role]s|teams} at
{companies like {{companyName}}|[company type]} {struggle with|run into} [specific pain point].

{We helped|I worked with} [comparable company] {achieve|get to} [specific result]
{in|within} [timeframe].

{Would it make sense|Worth a quick chat|Open to exploring} {to connect|to compare notes}?

{{senderFirstName}}
```

### Step 2 — The Follow-Up That Feels Like a Reply

The most underutilized technique: making the follow-up feel like a continuation, not a chase.

**Format**: Short. 2-3 sentences. Feels like you're bumping your own previous message casually.
**Subject**: Re: [original subject line] (creates open-loop continuity)
**Content**: Don't repeat step 1. Add a new specific angle:
  - New data point relevant to them
  - Different framing of the problem
  - Quick question about whether the problem resonates
  - Mention of a comparable company you helped

**Step 2 template**:
```
Subject: Re: {original subject}

{One more thing I should have mentioned|Forgot to add this|Quick thought} —

[New specific angle: data point, reframe, or proof].

{Still worth a few minutes?|Any interest?|Does this resonate?}
```

**What not to do**: "Just following up on my previous email" — this adds zero value and signals
you have nothing new to say. Replace with actual content.

### Step 3 — The Proof Step

**Purpose**: For prospects who are aware of the problem but need evidence you can actually solve it.

**Step 3 template**:
```
Subject: Re: {original subject}

{Quick example|Relevant to what I mentioned} —

{[Company in their industry/size] was dealing with [their exact pain].
We helped them [specific result in X timeframe].}

{Curious if you're running into something similar?|Worth comparing notes?}
```

### Step 4 — The Direct Question

**Purpose**: Strip away all pitch content. Ask directly about their situation.
**Format**: 1-2 sentences maximum

**Step 4 templates**:
```
Version A: "Quick question — is [specific problem] something your team is
            actively trying to solve this quarter?"

Version B: "Honest question: is the timing off, or is [pain point] not
            a current priority?"

Version C: "Are you the right person to speak with about [problem], or
            should I reach out to someone else on your team?"
```

The direct question reframes the interaction. It's no longer a sales sequence — it's a
genuine attempt to understand their situation.

### Step 5 — The Breakup Email

**Purpose**: Close the loop, preserve the relationship, leave the door open.
**The psychological mechanism**: Creating closure gives the prospect "permission" to reply.
Many positive replies come from breakup emails from prospects who were interested but hadn't
acted.

**Step 5 template**:
```
Subject: Re: {original subject}

{{firstName}} — I've sent a few notes over the past weeks.

{If timing isn't right or this isn't relevant to what you're working on,
completely understand — won't reach out again.|No worries if the timing's
off — just wanted to close the loop.}

{If [specific problem] becomes a priority, would love to help.|If anything
changes, I'm here.}

{Either way, wish you well.|All the best.}
```

**Rules**:
- Complete absence of pressure or guilt
- Genuine tone — not performative
- One last piece of value OR one last simple question
- Clear signal that this is the last reach-out
- Never guilt or pressure

---

## 4. The Follow-Up Doctrine

The data is unambiguous:

| Follow-Up Fact | Number | Source |
|---|---|---|
| Reply increase from a single follow-up | 40-50% | Instantly 2026 benchmark |
| Replies that come from follow-up steps (not Step 1) | 42% | 16.5M email dataset |
| Pipeline from follow-ups (30/30/50 rule) | 50% of results | Follow-up strategy portion |
| Most sales orgs give up after N touches | 2 | Industry average |
| Optimal touches before stopping | 4-7 | Diminishing returns beyond 7 |

**The follow-up principles**:

1. **Always follow up at least once** — non-negotiable. A sequence without follow-up leaves
   40% of your potential pipeline untouched.

2. **New angle every time** — a follow-up that repeats step 1 adds no value. Change the angle.

   **Angle rotation map**:
   ```
   Step 1: Problem angle          → "Most [role]s deal with [pain]..."
   Step 2: Social proof angle     → "[Company] solved this exact thing..."
   Step 3: Insight/data angle     → "Interesting stat: [relevant finding]..."
   Step 4: Direct question angle  → "Is [pain] a priority this quarter?"
   Step 5: Breakup angle          → "Closing the loop — no worries if timing's off."
   ```

3. **Shorter as the sequence progresses** — step 1 can be 80 words. Step 4 should be 20-30 words.
   Length signals how much you value their time.

4. **Follow up with intent, not desperation** — the tone of follow-ups must maintain confidence
   and genuine value. When the tone shifts to "please respond," conversion plummets.

5. **Stop after value is exhausted** — don't follow up 8 times with nothing new to say. If you
   have 4 genuinely different angles, build a 4-step sequence. If you only have 2, build a
   2-step sequence. Volume without value is spam.

---

## 5. Cadence and Timing

### The Default Cadence

**Day 1 → Day 3 → Day 7 → Day 11 → Day 17**

| Cadence Pattern | Structure | Best For | Reply Rate Impact |
|---|---|---|---|
| Default (recommended) | Day 1, 3, 7, 11, 17 | General B2B cold outreach | Baseline |
| 3-7-7 pattern | Day 1, 4, 11, 18 | Conservative, longer-cycle sales | -5% vs. default (more respectful spacing) |
| Compressed | Day 1, 2, 5, 9 | High-intent signals, time-sensitive triggers | +15-25% (strike while hot) |
| Extended | Day 1, 5, 12, 19, 28 | Executive-level, high ACV, relationship-first | -10% reply rate, but +20% positive reply quality |

### Send Window Configuration

| Dimension | Best Practice | Data Point |
|---|---|---|
| Best days | Tuesday, Wednesday, Thursday | 23% higher engagement vs. Mon/Fri |
| Worst days | Friday afternoon, all of Monday | Lowest open and reply rates |
| Best hours (primary) | 7:00 AM - 10:30 AM recipient timezone | 67% of positive replies occur in this window |
| Best hours (secondary) | 1:00 PM - 3:00 PM recipient timezone | 22% of positive replies |
| Weekend | Avoid for B2B | Unprofessional signal; deliverability concerns |

**Instantly send window settings**:
```
Campaign → Settings → Schedule:
  ☑ Enable "Prospect timezone" sending (when available)
  ☑ Send window: 7:00 AM - 10:30 AM (primary)
  ☑ Secondary window: 1:00 PM - 3:00 PM
  ☑ Days: Tuesday, Wednesday, Thursday (primary)
  ☑ Days: Monday, Friday (secondary — reduced volume)
  ☑ Random send time within window: ENABLED (avoids machine-like patterns)
  Daily sending limit per inbox: Start at 30-40/day
```

See `references/infrastructure-deliverability.md` Section 7 for the full volume discipline
framework and per-inbox daily limits.

### Volume Pacing

**New inbox ramp schedule**:

| Week | Cold Emails/Inbox/Day | Warmup/Inbox/Day | Total/Inbox/Day | Notes |
|---|---|---|---|---|
| Week 1 | 0 | 3-10 | 3-10 | Warmup only — zero cold sends |
| Week 2 | 5-10 | 15-25 | 20-35 | First cold sends — monitor carefully |
| Week 3 | 15-25 | 20-30 | 35-55 | Ramp if health metrics are green |
| Week 4 | 25-40 | 15-20 | 40-60 | Approaching operational capacity |
| Week 5+ | 30-50 | 10-15 | 40-65 | Full capacity — maintain warmup permanently |

**Scale beyond 50/inbox/day only when**:
- Inbox placement is consistently 80%+
- Bounce rate stable at ≤ 1%
- Domain reputation shows "Good" or "High" in Google Postmaster

See `references/infrastructure-deliverability.md` Section 5 for the complete warmup protocol.

---

## 6. Spintax — Variation at Scale

Spintax creates copy variation within a single campaign, generating unique versions of each
email across sends. This reduces the "duplicate content" signal that spam filters penalize
and enables continuous variation testing without building separate campaigns.

### Spintax Syntax in Instantly

```
{Hi|Hey|Hello} {{firstName}},

{I noticed|I saw|I came across} {your company|{{companyName}}}'s
{recent growth|expansion into new markets|team scaling}.

{Most companies at your stage|Teams like yours|Companies in your position}
{struggle with|run into|face challenges around} [specific pain point].

{We've helped|I've worked with|Our platform has helped}
{companies like|teams similar to|businesses including} [comparable company]
{increase [metric] by|achieve|get to} [specific result].

{Would it make sense|Worth a quick chat|Open to exploring}
{to connect|to compare notes|to see if we can help}?
```

### Spintax Variation Math

| Spin Points | Variants per Point | Total Unique Versions | Sufficient For |
|---|---|---|---|
| 3 spin points | 3 each | 27 unique versions | Small campaigns (<200) |
| 4 spin points | 3 each | 81 unique versions | Medium campaigns (200-500) |
| 5 spin points | 3 each | 243 unique versions | Large campaigns (500+) |
| 5 spin points | 4 each | 1,024 unique versions | Maximum variation |

**Target**: 50+ unique versions per campaign to avoid duplicate content flags.

### Spintax Best Practices

| Do | Don't |
|---|---|
| Spin subject line separately from body | Over-spin to the point of awkward variants |
| Ensure all variants read naturally | Synonym-swap only — vary structure too |
| Test worst-case variant before launch | Spin your core proof claim (keep it specific) |
| Focus on opening lines, transitions, CTAs | Spin personalization variables |
| Limit to 3-5 variants per element | Create variants you wouldn't send standalone |
| Preview 10+ versions in Instantly before launch | Assume all combinations work without checking |

### What Not to Spin
- Your proof point (the specific case study must remain specific)
- Your CTA's core ask (vary phrasing but not the fundamental ask)
- The contact's personalization data (their trigger, their company, their role)
- Your company name or offer name
- Compliance elements (unsubscribe links, sender identity)

See `references/compliance-legal.md` for required elements that must appear in every variant.

### Spintax Quality Check Template
```
Before launch, verify:
[ ] All possible combinations read naturally (preview 10+ versions)
[ ] No variant creates an awkward or nonsensical sentence
[ ] All variants maintain the same core meaning
[ ] Personalization variables are outside spintax brackets
[ ] Subject line spintax produces 3+ distinct subjects
[ ] Worst-case variant is still send-worthy
```

---

## 7. A/Z Testing Methodology

Instantly supports A/Z testing (up to multiple variants, not just A/B). This is the engine
of continuous performance improvement. The elite operators run permanent testing programs —
there is always an active test running.

### The Testing Hierarchy

Test in this order — highest leverage first:

| Priority | Variable | Leverage | Expected Impact Range |
|---|---|---|---|
| 1 | Subject line | Highest — determines open rate | 20-80% open rate variation |
| 2 | Opening line / hook type | Determines first-read engagement | 30-60% reply rate variation |
| 3 | Value proposition framing | What benefit you lead with | 20-40% reply rate variation |
| 4 | CTA wording | Question type, commitment level | 15-30% reply rate variation |
| 5 | Email length | Ultra-short <60 words vs. standard 75-100 | 10-25% variation |
| 6 | Send window | Morning vs. early afternoon | 5-15% variation |
| 7 | Sequence length | 5 steps vs. 7 steps | 5-10% total reply variation |

### Testing Protocol

**Statistical requirements**:

| Element | Minimum | Recommended | Why |
|---|---|---|---|
| Sends per variant | 150 | 200-300 | Below 150 = unreliable results |
| Test duration | 7 days | 10-14 days | <7 days = timing artifacts distort data |
| Variants per test | 2 | 2-3 | >3 variants requires >600 total sends |
| Confidence threshold | 80% | 90%+ | Below 80% = could be random noise |

**Single variable rule**: Change exactly one element per test. Changing two things
simultaneously makes it impossible to know which produced the difference.

**Winner criteria**: Positive reply rate (not open rate, not total reply rate)
- Open rate = deliverability signal + subject line signal
- Reply rate = copy quality + list quality signal
- **Positive reply rate** = the system is producing qualified conversations

**Shipping cadence**: Review results at Day 7 and Day 14 per test. Promote winner to control.
Rotate in next challenger. Never run a test for less than 7 days (timing effects distort early data).

### Instantly A/Z Testing Setup

```
Campaign → Sequence → Step [N]:
  1. Click "Add Variant" to create Variant B (and C if needed)
  2. Write the challenger copy — change ONLY the variable being tested
  3. Set traffic split: 50/50 for A/B; 33/33/33 for A/B/C
  4. Enable "Auto-Optimize" to shift volume toward winners after threshold
  5. Review in Analytics → A/Z Performance at Day 7 and Day 14
  6. Promote winner → archive loser → create next challenger
```

### Test Hypothesis Template

Before each test, write a hypothesis:
```
Variable: [what you're testing]
Current control: [current version — paste exact text]
Challenger: [new version — paste exact text]
Hypothesis: [why you expect the challenger to win — be specific]
Success metric: [positive reply rate / meetings booked]
Minimum sample: [150-200 per variant]
Test duration: [7-14 days]
Expected lift: [what would make this a meaningful win — e.g., +2% positive reply rate]
```

### Test Results Log

Track every test in a structured format for institutional knowledge:

```
TEST LOG ENTRY
Date: [start date] - [end date]
Campaign: [campaign name]
Variable tested: [subject line / hook type / CTA / etc.]
Control: [exact text]
Challenger: [exact text]
Sends: [control sends] / [challenger sends]
Positive reply rate: [control %] / [challenger %]
Winner: [control / challenger]
Confidence: [%]
Key insight: [what this teaches about this ICP/market]
Next test: [what to test next based on this result]
```

This discipline prevents random testing and builds a learnable knowledge base about what works
for your specific ICP, offer, and market.

See `references/analytics-optimization.md` Section 3 for integrating A/Z test results into
the weekly optimization protocol.

---

## 8. Subsequences — Behavioral Branching

Subsequences are automated follow-up paths triggered by reply classification. They're the
mechanism that turns a passive sequence into an intelligent, responsive conversation system.

### The Core Subsequence Architecture

**Trigger**: Reply classification in Unibox (AI-assigned label)

```
Reply Classified as "Interested"
  → Pause main sequence immediately
  → Trigger "Hot Lead" subsequence OR move to human follow-up queue
  → Notify rep via Slack/email within 5 minutes
  → Push to CRM as Opportunity
  → SLA: respond within 1 hour (7x qualification rate — HBR data)

Reply Classified as "Not Interested"
  → End sequence immediately
  → Add to global block list (do not contact again)
  → Log reason for analysis (pattern-match objections monthly)

Reply Classified as "Out of Office"
  → Pause sequence for OOO period + 2 days
  → Resume with a personalized reference to their return
  → Auto-detect return date from OOO message when possible

Reply Classified as "Not the Right Person"
  → Pause sequence
  → Trigger referral follow-up: "Thanks for letting me know — who would be the right person?"
  → Add referred contact to appropriate campaign if provided
  → Original contact → block list for this campaign

Reply Classified as "Not Now / Wrong Timing"
  → Move to 90-day re-engagement queue
  → Tag with reason: budget cycle, ongoing project, wrong quarter
  → Trigger re-engagement sequence at appropriate time
  → These contacts convert at 3-5x the rate of a cold contact

Reply Classified as "Want More Information"
  → Send targeted resource (case study, comparison guide, relevant content)
  → Follow up on the resource 3-4 days later
  → Route to SDR if they engage with the resource
```

See `references/instantly-operations.md` Section 2 for AI reply label configuration and
Section 3 for the AI Reply Agent setup that automates these responses.

### Configuring Subsequences in Instantly

In Campaign Settings → Sequences → Add Subsequence:
1. Define the trigger condition (reply label, or manual lead status change)
2. Build the subsequence steps (can be 1-5 steps with specific angles)
3. Set delay between subsequence steps (typically shorter than main sequence)
4. Define end condition (reply received, steps exhausted, manual removal)

### Subsequence Templates

**The "Interested but No Meeting" Subsequence**:
```
Trigger: Reply labeled "Interested" + no meeting booked within 48 hours

Step 1 (Day 1 after reply):
  "Thanks for the reply, {{firstName}} — how about [specific day/time],
   or here's my calendar: [link]?"

Step 2 (Day 3):
  "[Proof point relevant to their company] — figured this would be
   useful context. Still up for a quick chat?"

Step 3 (Day 7):
  "Last follow-up on this — if async works better, happy to send
   a quick Loom walking through how this could work for {{companyName}}."
```

**The OOO Management Subsequence**:
```
Trigger: Reply labeled "Out of Office"

Step 1: Pause main sequence for [return date from OOO] + 2 business days
Step 2 (after pause):
  "Welcome back — wanted to circle back on my note from [date].
   [Brief 1-sentence recap of original value prop]. Worth a quick chat?"
```

**The Resource-Sent Subsequence**:
```
Trigger: Reply labeled "Want More Info" + resource sent

Step 1 (Day 3 after resource):
  "Wanted to check in — did you get a chance to look at [resource]?"

Step 2 (Day 7):
  "Any questions after looking it through? Happy to jump on a
   quick call if it'd be helpful."
```

### The "Not Now" Nurture System

The most valuable underused subsequence: the re-engagement of "not now" replies.

"Not now" replies are warm leads who are aware of you and have acknowledged the problem is
real — they just aren't in a buying window. These are the highest-converting future contacts
in your entire system if handled correctly.

| Metric | "Not Now" Re-engagement | Fresh Cold Contact |
|---|---|---|
| Reply rate | 15-25% | 3-7% |
| Positive reply rate | 50-70% | 35-50% |
| Meeting conversion | 25-40% | 10-20% |
| Average deal cycle | 20-30% shorter | Baseline |

**Re-engagement protocol**:
- Tag with estimated timing: "Budget Q3" / "Post-rebrand" / "After hire"
- Set calendar reminder or automation trigger for 60-90 days post-reply
- When re-engaging: reference their previous reply + what's changed + a new angle
- Shorter sequence (3 steps), lower pressure, more value-first

See `references/icp-segmentation.md` Section 8 for the full re-engagement protocol
and sequence template.

---

## 9. The Evergreen Campaign Model

The highest-leverage operational improvement for teams doing ongoing outbound: replace
one-time batch campaigns with continuously running, auto-populating evergreen campaigns.

### How It Works in Instantly

```
Step 1: Create campaign with tight ICP criteria
Step 2: Link a SuperSearch saved search (auto-populates matching new contacts)
Step 3: Set daily contact cap (e.g., 20-50 new contacts enter per day)
Step 4: Campaign runs continuously, fresh leads enter the top of sequence daily
Step 5: Review performance monthly, update copy based on current A/Z test winners
```

### Evergreen Campaign Configuration

| Setting | Recommended Value | Why |
|---|---|---|
| Daily new contact cap | 20-50 | Matches inbox capacity; prevents overload |
| List refresh source | SuperSearch saved search | Auto-populates matching criteria |
| Copy update frequency | Monthly (or when A/Z test produces winner) | Keep copy fresh |
| Segment review | Quarterly | Validate ICP still producing meetings |
| Re-verification schedule | Every 60 days for unsent contacts | Data decay prevention |

### Benefits
- Eliminates the "campaign launch" bottleneck
- Creates predictable, consistent pipeline instead of feast-or-famine batch sending
- New list-building discoveries automatically feed into running system
- Test learnings improve the evergreen campaign continuously
- Reduces operational overhead by 60-70% vs. batch campaign management

---

## 10. Key Campaign Settings in Instantly

The settings that most operators overlook and that elite operators optimize:

### Tracking Settings

| Setting | Recommendation | Why |
|---|---|---|
| Open tracking | Enable | Diagnostic value; understand Apple MPP inflates numbers |
| Link tracking | Enable | Click = high-intent signal; useful for subsequence triggers |
| Custom tracking domain | Your own domain per sending domain | Reputation isolation from shared Instantly tracking |

See `references/infrastructure-deliverability.md` Section 4 for custom tracking domain setup.

### Sending Behavior

| Setting | Recommendation | Impact |
|---|---|---|
| Single sending account per time gap | Enable | Natural pattern; prevents simultaneous sends to same contact |
| Daily sending limit per account | Start at 30-40; scale with domain health | Prevents inbox burnout |
| Random send time within window | Enable always | Avoids robotic pattern detection |
| Send on recipient timezone | Enable when available | +12% open rate vs. sender timezone |

### Reply Handling

| Setting | Recommendation | Why |
|---|---|---|
| Auto-pause on reply | Enable | Prevents sending sequence steps after prospect responds |
| Stop on OOO detected | Enable with resume delay | Respects their absence; resumes automatically |
| Auto-pause on high bounce rate | Enable | Safety net — see `infrastructure-deliverability.md` for thresholds |

### Deliverability Settings

```
Campaign → Deliverability:
  ☑ Custom tracking domain: [your domain] (NOT shared Instantly subdomain)
  ☑ Minimum 3-5 inboxes per campaign for volume above 100/day
  ☑ Inbox rotation: Enable (round-robin or smart rotation)
  ☑ Separate cold domains from primary business domain
  ☑ Warmup active on all inboxes (permanently)
```

See `references/infrastructure-deliverability.md` for the complete domain isolation
strategy, warmup protocols, and sender reputation management framework.

---

## 11. Campaign Launch Checklist

Run through this checklist before activating any campaign. Every item is a potential
failure point that kills performance.

```
PRE-LAUNCH CHECKLIST

Infrastructure:
  [ ] All sending domains have SPF, DKIM, DMARC passing
  [ ] Custom tracking domain configured per sending domain
  [ ] All inboxes warmed for 3+ weeks (warmup opens >80%, replies >30%)
  [ ] Inbox health scores above threshold in Instantly
  [ ] See infrastructure-deliverability.md for DNS setup checklist

List Quality:
  [ ] Email verification completed (target: <1% expected bounce)
  [ ] Deduplication against CRM + existing Instantly lists + block list
  [ ] Spot-checked 10%+ of list manually for ICP accuracy
  [ ] Personalization variables populated for 90%+ of contacts
  [ ] Catch-all addresses flagged and handled
  [ ] See icp-segmentation.md for full hygiene protocol

Copy:
  [ ] Step 1 under 80 words
  [ ] All follow-ups under 50 words
  [ ] Single CTA per email
  [ ] No calendar link in Step 1
  [ ] Spintax produces 50+ unique versions
  [ ] All spintax variants previewed and natural-sounding
  [ ] Spam check passed (Instantly Copilot)
  [ ] See copy-integration.md for quality standards checklist

Campaign Settings:
  [ ] Send window configured (Tue-Thu primary, 7-10:30 AM)
  [ ] Prospect timezone enabled
  [ ] Random send time enabled
  [ ] Daily limit per inbox set (30-40 starting)
  [ ] Inbox rotation enabled (3+ inboxes per campaign)
  [ ] Reply auto-pause enabled
  [ ] OOO detection enabled
  [ ] High bounce auto-pause enabled

Testing:
  [ ] A/Z test hypothesis written
  [ ] Minimum 150 sends per variant planned
  [ ] Winner criteria defined (positive reply rate)
  [ ] Day 7 and Day 14 review scheduled

Compliance:
  [ ] Sender identity clear and accurate
  [ ] Opt-out mechanism present (or documented exception)
  [ ] See compliance-legal.md for jurisdiction-specific requirements
```
