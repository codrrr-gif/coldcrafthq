# Analytics & Optimization — Metrics, Diagnosis & Scaling

The measurement and improvement engine. The difference between operators who plateau at
3-5% reply rates and those who achieve 15%+ is systematic, data-driven optimization.
Not gut feel. Not one-off tweaks. A permanent, structured improvement loop that compounds
over time.

---

## Table of Contents
1. The Metrics Hierarchy — What Actually Matters
2. The Diagnostic Framework — What Metrics Tell You
3. The Weekly Optimization Protocol
4. The Campaign Scoring System
5. Scaling Decision Framework
6. The Optimization Loops
7. Common Performance Failures and Fixes
8. Attribution — Connecting Email to Revenue
9. Benchmarks — Industry Reference Data
10. Reporting Templates

---

## 1. The Metrics Hierarchy — What Actually Matters

Not all metrics are equal. Most operators optimize for the wrong things.

### The Four-Tier Metrics Model

| Tier | Category | Metrics | Why It Matters |
|---|---|---|---|
| **Tier 1** | Revenue Metrics | Meetings/1,000 emails, cost per meeting, pipeline value, revenue attributed | The only things that pay — everything else is a leading indicator |
| **Tier 2** | Quality Metrics | Positive reply rate, reply-to-meeting conversion | Predict revenue before it arrives |
| **Tier 3** | Volume Metrics | Reply rate, open rate | Diagnostic inputs — not goals |
| **Tier 4** | Health Metrics | Bounce rate, spam complaint rate, inbox placement, unsubscribe rate | System maintenance — foundation must be healthy |

### Tier 1 — Revenue Metrics (The Only Things That Pay)

| Metric | Formula | Good | Great | Elite |
|---|---|---|---|---|
| Meetings per 1,000 emails | Meetings booked / (emails sent / 1,000) | 5-8 | 8-15 | 15-25 |
| Cost per meeting | Total system cost / meetings booked | $150-300 | $75-150 | <$75 |
| Pipeline value per 1,000 emails | Sum of deal values / (emails sent / 1,000) | $5K-15K | $15K-40K | $40K+ |
| Revenue per 1,000 emails | Closed revenue / (emails sent / 1,000) | $1K-5K | $5K-15K | $15K+ |

**The north star**: Meetings per 1,000 emails sent. This single metric captures list quality,
copy quality, deliverability, and reply handling in one number.

### Tier 2 — Quality Metrics (Predict Revenue)

| Metric | Formula | Good | Great | Elite |
|---|---|---|---|---|
| Positive reply rate | Positive replies / total replies | 35-50% | 50-65% | 65%+ |
| Reply-to-meeting conversion | Meetings / positive replies | 30-40% | 40-55% | 55%+ |
| Meeting show rate | Meetings held / meetings booked | 70-80% | 80-90% | 90%+ |
| Meeting-to-qualified rate | Qualified opps / meetings held | 40-55% | 55-70% | 70%+ |

A high positive reply rate on a low total reply rate is better than the reverse —
it means you're reaching the right people with the right message.

### Tier 3 — Volume Metrics (Diagnostic Inputs)

| Metric | Formula | Good | Warning | Critical |
|---|---|---|---|---|
| Reply rate | Unique human replies / emails delivered | 5-10% | 2-5% | <2% |
| Open rate | Opens / emails delivered | 50-70% | 30-50% | <30% |

**What open rate actually tells you (and doesn't)**:

**The Apple MPP problem**: Apple's Mail Privacy Protection pre-loads tracking pixels,
registering "opens" for emails that were never read by a human. This inflates open rates
by 20-40% for any audience with Apple mail users.

| Open Rate Signal | Combined With | Diagnosis |
|---|---|---|
| Open rate trending down | Placement stable | Subject lines degrading — test new variants |
| Open rate AND placement declining | — | Deliverability issue, not copy issue. See `infrastructure-deliverability.md` |
| Open rate suddenly spikes | No copy change | Bot activity or tracking anomaly |
| Open rate high, reply rate low | — | Copy isn't converting — hook or CTA problem |
| Open rate low, reply rate low | — | Deliverability problem OR list quality issue |

**Never optimize primarily for open rate.** Optimize for positive reply rate and meetings.

### Tier 4 — Health Metrics (System Maintenance)

| Metric | Target | Warning | Critical | Action at Critical |
|---|---|---|---|---|
| Hard bounce rate | ≤ 1% | 1-2% | > 2% | Pause sending, re-verify list. See `infrastructure-deliverability.md` |
| Spam complaint rate | < 0.05% | 0.05-0.1% | > 0.3% | Stop campaigns, warmup-only mode for 2+ weeks |
| Inbox placement rate | ≥ 80% primary | 60-80% | < 60% | Pause, investigate DNS/reputation/content |
| Unsubscribe rate | < 0.5% | 0.5-1% | > 1% | Messaging-audience mismatch — review targeting |

**Google's 0.3% spam complaint rate threshold**: This is a hard enforcement line. Exceeding it
triggers automated reputation penalties. See `references/infrastructure-deliverability.md`
Section 8 for the complete sender reputation management framework.

---

## 2. The Diagnostic Framework — What Metrics Tell You

When performance is below target, use this diagnostic matrix to identify root cause:

### The Diagnostic Decision Tree

```
START: Campaign underperforming

Is OPEN RATE low (<30%)?
├── YES → Check BOUNCE RATE
│   ├── Bounce >2% → LIST QUALITY issue → Re-verify list, check data source
│   └── Bounce <2% → Check INBOX PLACEMENT
│       ├── Placement <70% → DELIVERABILITY issue
│       │   → Pause campaign
│       │   → Check DNS: SPF/DKIM/DMARC passing?
│       │   → Check blacklists (MXToolbox)
│       │   → Check warmup health
│       │   → Check per-inbox health scores
│       │   → See infrastructure-deliverability.md Section 10
│       └── Placement >70% → SUBJECT LINE issue
│           → Test new subject line variants
│           → Try lowercase, shorter, more curiosity
│
└── NO (open rate OK) → Is REPLY RATE low (<3%)?
    ├── YES → Check reply content qualitatively
    │   ├── Replies confused/irrelevant → TARGETING issue
    │   │   → Tighten ICP (see icp-segmentation.md)
    │   │   → Review segment criteria
    │   └── No replies despite opens → COPY issue
    │       → Test new hook type
    │       → Shorten email (target <80 words)
    │       → Strengthen CTA (see copy-integration.md)
    │
    └── NO (reply rate OK) → Is POSITIVE REPLY RATE low (<40% of replies)?
        ├── YES → VALUE PROP issue
        │   → Too vague — sharpen specific pain reference
        │   → Consider raising CTA friction to filter quality
        │   → Review ICP: are these real buyers?
        │
        └── NO (positive replies OK) → Is MEETING CONVERSION low (<30%)?
            └── REPLY HANDLING issue
                → Check time-to-first-response (target: <1 hour)
                → Audit AI Reply Agent quality
                → Ensure calendar link offered at right moment
                → See instantly-operations.md Section 3
```

### Scenario A: Low Open Rate + Low Reply Rate

**Likely cause**: Deliverability problem (not landing in primary inbox) or list quality issue

**Diagnose**:
1. Run Inbox Placement test in Instantly (Campaign → Deliverability → Run Placement Test)
2. Check per-inbox health scores (any inboxes scoring poorly drag the campaign down)
3. Review bounce rate (above 2% = list hygiene issue tanking reputation)
4. Check domain blacklist status (MXToolbox)

**Fix by severity**:

| Finding | Fix | Timeline |
|---|---|---|
| Placement < 70% primary | Pause campaign, review warmup, reduce volume, re-verify list, check DNS, rotate to fresh inboxes | 1-2 weeks recovery |
| Bounces > 2% | Re-verify entire list, remove hard bounces, check data source | 2-3 days |
| Specific inboxes underperforming | Pause those accounts, rest for 1-2 weeks, warmup only | 1-2 weeks per inbox |
| Blacklisted | Follow recovery protocol in `infrastructure-deliverability.md` Section 10 | 2-8 weeks |

### Scenario B: High Open Rate + Low Reply Rate

**Likely cause**: Copy isn't converting OR list is wrong audience

**Diagnose**:
1. Check positive reply rate (not just total reply rate)
2. Review reply content: are replies relevant? (right pain?) or confused? (wrong audience?)
3. Compare performance across segments — is one segment driving all the opens?
4. Audit the step where most opens occur but no reply (what's failing at that step?)

**Fix**:

| Finding | Fix | Expected Impact |
|---|---|---|
| Replies confused/irrelevant | Targeting problem → tighten ICP | +50-100% positive reply rate |
| No replies despite opens | Copy problem → test new hook type, shorter email, stronger CTA | +30-60% reply rate |
| One CTA outperforming others | Double down on that angle | +20-40% reply rate |
| Opening line strong, body loses them | Shorten body, remove fluff, stronger proof | +15-30% reply rate |

### Scenario C: Decent Reply Rate + Low Positive Reply Rate

**Likely cause**: Reaching people who are mildly curious but not actual buyers, OR value
prop isn't specific enough to filter for qualified interest

**Diagnose**:
1. Read the replies — what are they saying? (qualitative data > quantitative at this stage)
2. Check segment performance: which segments have the highest positive reply %?
3. Review CTA: is it so low-friction that disinterested people reply out of politeness?

**Fix**:
- Tighten ICP: if list includes non-buyers, positive rate suffers
- Sharpen value prop: vague benefits attract vague interest; specific pain → specific buyers
- Consider raising CTA friction slightly: "Would it be worth 20 minutes specifically if
  [specific condition]?" filters for more qualified positive replies

### Scenario D: Good Reply Rate + Poor Meeting Conversion

**Likely cause**: Reply handling failure — slow response, weak follow-up, no system

**Diagnose**:
1. Measure time-to-first-response for "Interested" replies
2. Review the actual replies your team/AI is sending
3. Check whether calendar links are being shared at the right moment

**Fix**:

| Root Cause | Fix | Expected Impact |
|---|---|---|
| Slow response (>1 hour) | Enforce 1-hour SLA; set up Slack notifications | +50-100% meeting conversion |
| AI Agent not booking | Update system prompt: require calendar link in first response to "Interested" | +30-50% meeting conversion |
| Weak follow-up copy | Audit and rewrite AI agent responses | +20-40% meeting conversion |
| No calendar link offered | Add calendar link to all "Interested" responses | +25-35% meeting conversion |

See `references/instantly-operations.md` Section 3 for AI Reply Agent configuration
and system prompt optimization.

---

## 3. The Weekly Optimization Protocol

The permanent, recurring system for continuous improvement. Run every week without exception.

### Monday: Health Check (15 minutes)

```
1. Review Inbox Placement for all active campaigns
   Target: 80%+ primary
   Action if below: Pause affected campaign, investigate

2. Check bounce rates per campaign
   Target: ≤ 1%
   Action if above: Re-verify list, remove bounced contacts

3. Review per-inbox health scores
   Flag any below threshold → rest or investigate

4. Check blacklist status on sending domains
   Tool: Instantly → Campaign Deliverability OR MXToolbox
   Action if listed: See infrastructure-deliverability.md recovery protocol
```

### Wednesday: Performance Review (30 minutes)

```
1. Pull metrics for last 7 days:
   - Reply rate: [%] (target: >5%)
   - Positive reply rate: [%] (target: >50% of replies)
   - Meetings booked: [N]
   - Meetings per 1,000 sent: [N] (target: >8)

2. Compare against previous week and all-time baseline
   - Improving? → Continue current strategy
   - Declining? → Identify which metric dropped first (use diagnostic tree)
   - Stable? → Time to test a new variable

3. Identify top 3 and bottom 3 campaigns/segments
   - What makes the top performers different?
   - Apply learnings to bottom performers

4. Review A/Z test results
   - Any test with 150+ sends per variant?
   - Statistical winner? → Promote to control
   - No winner yet? → Continue running

5. Check Unibox reply patterns
   - What objections are repeating? (adjust copy or ICP)
   - What questions come up? (add to FAQ or proactive copy)
```

### Friday: Optimization and Planning (30 minutes)

```
1. Ship the week's A/Z test winner → promote to control
2. Write next A/Z test hypothesis (use template from campaign-architecture.md)
3. Archive underperformers:
   - Below 2% reply rate for 2+ consecutive weeks → pause and revise
   - Below 1% reply rate for 3+ weeks → kill and rebuild
4. Review lead quality:
   - "Interested" replies converting to meetings? If <30% → adjust targeting
5. Plan next week:
   - New segment to test?
   - New copy angle to try?
   - Infrastructure changes needed?

Time total: ~75 minutes/week for the complete optimization cycle
```

---

## 4. The Campaign Scoring System

Score every active campaign weekly to make scaling and cutting decisions systematic:

```
Campaign Health Score (0-100)

DELIVERABILITY (30 points max):
  Inbox placement ≥ 80% primary              +15 pts
  Inbox placement 60-80%                      +8 pts
  Inbox placement < 60%                       +0 pts

  Bounce rate ≤ 1%                            +10 pts
  Bounce rate 1-2%                            +5 pts
  Bounce rate > 2%                            +0 pts

  Spam complaint rate < 0.1%                  +5 pts
  Spam complaint rate 0.1-0.3%                +2 pts
  Spam complaint rate > 0.3%                  +0 pts

PERFORMANCE (50 points max):
  Positive reply rate ≥ 5%                    +20 pts
  Positive reply rate 3-5%                    +12 pts
  Positive reply rate 1-3%                    +5 pts
  Positive reply rate < 1%                    +0 pts

  Reply rate ≥ 5%                             +15 pts
  Reply rate 3-5%                             +8 pts
  Reply rate 1-3%                             +3 pts
  Reply rate < 1%                             +0 pts

  Meetings per 1,000 sent ≥ 10               +15 pts
  Meetings per 1,000 sent 5-10               +8 pts
  Meetings per 1,000 sent 2-5                +3 pts
  Meetings per 1,000 sent < 2                +0 pts

LIST QUALITY (20 points max):
  List verification rate ≥ 98%               +10 pts
  List verification rate 95-98%              +5 pts
  List verification rate < 95%               +0 pts

  Segment tightness (ICP defined, <500)      +5 pts
  Broad segment (500-1,000)                  +3 pts
  Very broad (>1,000)                        +0 pts

  Personalization data ≥ 90% complete        +5 pts
  Personalization data 70-90%                +3 pts
  Personalization data < 70%                 +0 pts
```

### Score Interpretation and Action

| Score | Rating | Action | Timeline |
|---|---|---|---|
| 80-100 | Scale | Increase send volume by 20-30%/week; expand to similar segments | Immediate |
| 60-79 | Optimize | Identify the specific gap (deliverability? copy? list?); test fixes | This week |
| 40-59 | Pause & Revise | Fundamental issue — stop sending, diagnose, rebuild component | 1-2 weeks |
| Below 40 | Kill | Not worth continued investment; rebuild from scratch with new hypothesis | Start fresh |

---

## 5. Scaling Decision Framework

Scaling before a campaign is proven destroys results and damages domain health.

### The Scaling Prerequisites Checklist

All must be true before scaling:

```
[ ] Inbox placement ≥ 80% primary for 2+ consecutive weeks
[ ] Hard bounce rate ≤ 1% consistently
[ ] Reply rate ≥ 5% on current volume
[ ] Positive reply rate ≥ 40% of total replies
[ ] Current copy variant is a tested winner (not the first draft)
[ ] Campaign health score ≥ 70
[ ] At least 300 emails sent on current version
[ ] Meeting conversion from positive replies ≥ 30%
```

### Scaling Methods

| Method | What Changes | Risk Level | Volume Increase | Monitoring |
|---|---|---|---|---|
| Volume scaling (same segment) | More contacts, same copy | Low | 20-30% per week | Watch bounce rate + placement for 5-7 days |
| Inbox scaling (more senders) | More inboxes on same campaign | Low-Medium | Linear with inboxes | Each new inbox needs warmup period |
| Segment scaling (new ICP) | New segment, adapted copy | Medium | Depends on segment size | Run 200-300 contact test first |
| Geographic scaling | Same ICP, new market | Medium-High | Varies | Localize language, timezone, proof points |
| Copy scaling (proven copy → new campaign) | Same copy, different context | Medium | Depends | Test 200-300 before committing |

### Volume Scaling Protocol

```
Week 1: Baseline — current volume (e.g., 200/day)
Week 2: +20% (240/day) — monitor placement and bounce daily
  → Metrics hold? → Continue
  → Metrics degrade? → Roll back to Week 1 volume, investigate

Week 3: +20% again (290/day) — monitor
Week 4: +20% (350/day) — monitor
...continue until target volume or metrics degrade
```

**Critical rule**: Never increase volume by more than 30% in a single week. The infrastructure
needs time to absorb volume changes. See `references/infrastructure-deliverability.md`
Section 7 for send volume discipline.

### Segment Scaling Protocol

```
1. Identify a winning campaign (score ≥ 70, proven copy, 2+ weeks of data)
2. Define adjacent segment (similar ICP, different dimension)
   - Same role, different industry
   - Same industry, different role
   - Same ICP, different trigger
3. Build test list: 200-300 contacts
4. Adapt copy lightly (proof points, industry language, trigger reference)
5. Run for 2 weeks minimum
6. Compare against original segment's benchmarks
7. If within 70% of original performance → scale
8. If below 70% → analyze why, iterate, or abandon
```

---

## 6. The Optimization Loops

Three optimization loops running simultaneously at different timescales:

### The Micro Loop (Weekly) — Copy and Variant Optimization

| Element | Action | Input | Output |
|---|---|---|---|
| Test | New subject line or hook type | Hypothesis from last week's data | A/Z test live |
| Review | Results at Day 7 | Send volume, reply rate, positive reply rate | Winner/no winner |
| Ship | Winner becomes new control | Statistical confidence ≥ 80% | Updated campaign |
| Repeat | Immediately with next hypothesis | Previous test insight | New test hypothesis |

**Weekly optimization impact**: Consistent weekly testing compounds to 2-5x improvement
in positive reply rate over 3-6 months.

### The Meso Loop (Monthly) — Segment and ICP Optimization

```
Month-End Review:
1. Rank all segments by meetings booked per 1,000 sent
2. Top 20% segments → increase volume allocation by 30%
3. Middle 60% → apply top-segment learnings (copy, targeting)
4. Bottom 20% → if no improvement after 60 days of optimization → retire

Questions to answer monthly:
- Which ICP produces the most meetings?
- Which trigger type (funding vs. hire vs. fit-only) performs best?
- Which hook type wins most consistently?
- What's the optimal segment size for this market?
```

See `references/icp-segmentation.md` Section 10 for the full ICP validation and iteration
protocol that feeds into this monthly review.

### The Macro Loop (Quarterly) — Strategy and System Optimization

```
Quarterly Review:
1. Full-funnel attribution: which campaigns produced closed revenue?
2. Cost analysis:
   - Cost per meeting by segment
   - Cost per qualified opportunity
   - Cost per closed deal
   - CAC for cold-email-sourced customers
3. ROI analysis:
   - Revenue per $1 spent on cold email infrastructure
   - LTV:CAC ratio for cold-email-sourced customers
4. Resource reallocation:
   - Shift budget toward highest-ROI segments
   - Retire segments with negative ROI
   - Update ICP definition based on which customers close and retain best
```

---

## 7. Common Performance Failures and Fixes

### Failure Reference Matrix

| Symptom | Root Cause | Diagnosis | Fix | Expected Recovery Time |
|---|---|---|---|---|
| Opens but no replies | Copy not converting (hook or CTA failing) | Check which step has highest opens-to-no-reply | Test different hook type; shorten email; strengthen CTA | 1-2 weeks (next A/Z test cycle) |
| Reply rate dropped suddenly | Deliverability issue OR bad copy variant | Check placement test immediately; check if new variant launched | If deliverability: pause + investigate. If copy: roll back to previous winner | 1-3 days (copy); 1-2 weeks (deliverability) |
| Replies but no meetings | Reply handling failure | Measure time-to-response; audit actual responses | 1-hour SLA; audit AI Agent; add calendar link to first response | 1-3 days |
| High bounce rates | List quality issue | Which data source? Hard vs. soft bounces? | Re-verify list; exclude catch-alls; switch data source | 2-3 days |
| Stuck at 2% reply rate | ICP problem | Read replies qualitatively; are they recognizing the pain? | Back to ICP definition; interview best customers; rebuild list | 2-4 weeks |
| Reply rates declining over time | List fatigue or stale positioning | How much of total ICP contacted? Lower performance on new vs. existing? | Expand ICP to adjacent segments; refresh positioning angle; new hook type | 2-4 weeks |
| Great reply rate, low deal close rate | Email attracts interest but wrong buyers | Compare ICP of responders vs. closed-won customers | Tighten ICP to match actual buyer profile; increase CTA friction | 4-8 weeks |

### Deep Dive: "Can't Break 2% Reply Rate"

This is the most common plateau. The diagnosis protocol:

```
Step 1: Read 50 actual replies (or non-replies by examining the list)
  → Do contacts match the ICP? (data accuracy check)
  → Do contacts recognize the problem? (pain relevance check)
  → Do contacts have buying authority? (persona accuracy check)

Step 2: If contacts are wrong → LIST PROBLEM
  → Go back to ICP definition (see icp-segmentation.md)
  → Talk to best customers: what was true when they first bought?
  → Rebuild list from customer-derived ICP

Step 3: If contacts are right but don't engage → COPY PROBLEM
  → Test fundamentally different hook type (not just word changes)
  → Test significantly shorter email (sub-60 words)
  → Test different CTA (from question to offer, or vice versa)
  → See copy-integration.md for hook type selection framework

Step 4: If copy tests fail → OFFER PROBLEM
  → The market may not want what you're selling at scale
  → Consider repositioning: different pain angle, different outcome promise
  → This is a business problem, not an email problem
```

---

## 8. Attribution — Connecting Email to Revenue

The final, and most important, piece of the measurement system. Without attribution, you
can't answer the question "is this working?" with confidence.

### The Attribution Stack

| Level | What It Tracks | Data Source | Who Needs It |
|---|---|---|---|
| **Level 1: Campaign** | Which campaign, step, subject line produced this reply | Instantly native | Campaign manager |
| **Level 2: Segment** | Which ICP/trigger produces highest meeting rate | Instantly Opportunities + tagging | Strategy team |
| **Level 3: Revenue** | Which campaigns produce closed revenue and at what LTV | CRM integration + deal tracking | Leadership / P&L owner |

### Level 1 — Campaign Attribution (Instantly Native)

Available directly in Instantly analytics:
- Which campaign produced this meeting?
- Which sequence step produced this reply?
- Which A/Z variant (subject line, hook) generated this conversation?

### Level 2 — Segment Attribution (Requires Tagging)

```
For each Opportunity created in Instantly, tag:
  Campaign name: [e.g., "Series B SaaS - VP Sales - Funding Trigger"]
  Segment: [e.g., "Series B SaaS, 50-200 employees"]
  Hook type: [e.g., "Timeline - funding"]
  Trigger: [e.g., "Series B funding, 3 weeks ago"]
  Intent tier: [e.g., "Trigger-matched"]
```

**Segment attribution report (monthly)**:

| Segment | Emails Sent | Meetings | Meeting Rate | Pipeline Value | Cost/Meeting |
|---|---|---|---|---|---|
| Series B SaaS - VP Sales | 2,400 | 18 | 7.5/1,000 | $270K | $89 |
| Enterprise - Head of RevOps | 1,800 | 8 | 4.4/1,000 | $640K | $150 |
| Startup - Founder | 3,200 | 24 | 7.5/1,000 | $96K | $56 |

### Level 3 — Revenue Attribution (CRM Integration Required)

**CRM field mapping for attribution**:
```
Custom Property: "Instantly Campaign Source" → on Contact AND Deal objects
Custom Property: "Instantly Segment" → on Deal object
Custom Property: "Instantly Hook Type" → on Deal object
Custom Property: "Reply Step" → on Deal object

Mapping flow:
  Instantly webhook → Campaign name + segment + hook type + step →
    CRM Contact (update) → CRM Deal (create with source properties)
```

**The revenue attribution report (quarterly)**:

```
QUARTERLY COLD EMAIL ROI REPORT

Total Investment:
  Infrastructure: $[domains + inboxes + tools] = $X/month × 3 = $Y
  Sending tool: $[Instantly subscription] × 3 = $Z
  Data/enrichment: $[Apollo + Clay + verification] × 3 = $W
  Labor: $[time × hourly rate] × 3 = $V
  Total quarterly cost: $[Y + Z + W + V]

Total Output:
  Emails sent: [N]
  Meetings booked: [N]
  Qualified opportunities: [N]
  Pipeline created: $[sum of deal values]
  Closed revenue: $[sum of won deals]

Unit Economics:
  Cost per email: $[total cost / emails sent]
  Cost per meeting: $[total cost / meetings]
  Cost per qualified opp: $[total cost / qualified opps]
  CAC (cold email): $[total cost / new customers from cold email]
  LTV:CAC ratio: $[average LTV / CAC]
  ROI: ([closed revenue - total cost] / total cost) × 100 = [X]%

Top Performers (by closed revenue):
  1. [Campaign/Segment]: $[revenue] from [N] deals
  2. [Campaign/Segment]: $[revenue] from [N] deals
  3. [Campaign/Segment]: $[revenue] from [N] deals

Bottom Performers:
  [Campaigns producing meetings but no revenue — investigate ICP fit]
```

**The insight this produces**: You will discover that one segment closes at 3-5x the rate of
others. One hook type produces meetings that close. One ICP profile has 2x LTV. This data
is worth more than any tactical optimization — it tells you where to allocate your entire
outbound investment.

### Practical Implementation in Instantly + HubSpot/Salesforce

```
SETUP STEPS:

1. Create custom properties in CRM:
   Contact: "Instantly Campaign Source" (text)
   Contact: "Instantly First Reply Date" (date)
   Deal: "Instantly Campaign Source" (text)
   Deal: "Instantly Segment" (text)
   Deal: "Instantly Hook Type" (dropdown)
   Deal: "Instantly Reply Step" (number)

2. Configure webhook (Instantly → Make/n8n → CRM):
   Trigger: Lead status change to "Interested" or "Meeting Booked"
   Payload: campaign_name, segment_tag, hook_type, reply_step, reply_content

3. Build CRM report:
   Group by: "Instantly Campaign Source"
   Metrics: Deals created, Pipeline value, Deals won, Revenue
   Filter: Created date = last quarter

4. Monthly: Review "Closed Won" deals filtered by "Instantly Campaign Source"
   → This is your true cold email ROI
   → Compare segments: which ICP produces revenue, not just meetings?
```

See `references/instantly-operations.md` Section 6 for the complete CRM integration setup
and field mapping guide.

---

## 9. Benchmarks — Industry Reference Data

### Cold Email Benchmark Ranges (2025-2026)

| Metric | Bottom Quartile | Median | Top Quartile | Elite (Top 5%) |
|---|---|---|---|---|
| Open rate | <30% | 40-55% | 55-70% | 70%+ |
| Reply rate | <2% | 3-5% | 5-10% | 10-20% |
| Positive reply rate (of replies) | <25% | 35-45% | 50-65% | 65%+ |
| Bounce rate | >3% | 1-2% | <1% | <0.5% |
| Meetings per 1,000 sent | <3 | 5-8 | 8-15 | 15-25 |
| Reply-to-meeting conversion | <20% | 30-40% | 40-55% | 55%+ |
| Cost per meeting | >$300 | $150-250 | $75-150 | <$75 |

### Performance by Hook Type (Instantly 2026 Benchmark, 16.5M emails)

| Hook Type | Average Reply Rate | Meeting Rate (per 1,000) | Best For |
|---|---|---|---|
| Timeline | 8-12% | 12-18 | Trigger-matched contacts (funding, hire, launch) |
| Social Proof | 5-8% | 8-14 | Solution-aware audiences with relevant proof |
| Problem | 4-7% | 6-10 | Broad ICP, no strong signal |
| Curiosity | 3-6% | 5-9 | Sophisticated audiences, ad-blind executives |
| Direct | 6-10% | 10-16 | High-intent signals (pricing page, G2 visit) |

**Key finding**: Timeline hooks produce 2.3x more replies and 3.4x more meetings than
problem-only hooks. See `references/copy-integration.md` Section 5 for the complete
hook type selection framework.

### Performance by Sequence Length

| Steps | Total Reply Rate | Marginal Gain (last step) | Spam Risk |
|---|---|---|---|
| 1 step | 58% of potential | — | Lowest |
| 3 steps | 87% of potential | +11% | Low |
| 5 steps | 95% of potential | +8% | Low-Medium |
| 7 steps | 99% of potential | +4% | Medium |
| 9+ steps | ~100% | <1% | High |

**Optimal**: 5 steps captures 95% of potential replies at low spam risk.

---

## 10. Reporting Templates

### Weekly Performance Report

```
WEEKLY COLD EMAIL PERFORMANCE REPORT
Week of: [date range]

HEALTH METRICS:
  Inbox placement: [%] (target: >80%)          [↑/↓/→ vs. last week]
  Bounce rate: [%] (target: <1%)               [↑/↓/→]
  Spam complaint rate: [%] (target: <0.05%)    [↑/↓/→]
  Domains flagged: [N] (target: 0)

VOLUME METRICS:
  Emails sent: [N]                             [↑/↓/→]
  Emails delivered: [N] ([%] delivery rate)

PERFORMANCE METRICS:
  Open rate: [%] (directional only)            [↑/↓/→]
  Reply rate: [%]                              [↑/↓/→]
  Positive reply rate: [%] of total replies    [↑/↓/→]
  Meetings booked: [N]                         [↑/↓/→]
  Meetings per 1,000 sent: [N]                 [↑/↓/→]

PIPELINE METRICS:
  Pipeline value created: $[N]                 [↑/↓/→]
  Reply-to-meeting conversion: [%]             [↑/↓/→]

TOP CAMPAIGNS (by meetings/1,000):
  1. [Campaign]: [meetings/1,000] — [N meetings]
  2. [Campaign]: [meetings/1,000] — [N meetings]
  3. [Campaign]: [meetings/1,000] — [N meetings]

A/Z TEST RESULTS:
  [Test description]: [winner] by [%] lift — [promoted/continuing]

ACTIONS FOR NEXT WEEK:
  1. [specific action]
  2. [specific action]
  3. [specific action]
```

### Monthly Segment Performance Report

```
MONTHLY SEGMENT PERFORMANCE
Month: [month/year]

| Segment | Sent | Reply Rate | Positive % | Meetings | Pipeline | Score | Action |
|---------|------|-----------|-----------|----------|----------|-------|--------|
| [Seg A] | [N]  | [%]       | [%]       | [N]      | $[N]    | [/100]| Scale/Optimize/Kill |
| [Seg B] | [N]  | [%]       | [%]       | [N]      | $[N]    | [/100]| Scale/Optimize/Kill |
| [Seg C] | [N]  | [%]       | [%]       | [N]      | $[N]    | [/100]| Scale/Optimize/Kill |

TOP INSIGHTS:
  1. [What's working and why]
  2. [What's not working and why]
  3. [What to test next month]

ICP REFINEMENT:
  [Any changes to ICP definition based on this month's data]
```

See `references/icp-segmentation.md` Section 10 for integrating monthly segment data
into ICP refinement decisions.
