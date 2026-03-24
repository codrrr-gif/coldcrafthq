# Campaign Playbooks — Complete Worked Examples

Three complete campaign builds from zero to live, showing every decision, every setting,
every piece of copy, and the resulting metrics. Use these as templates — adapt the specifics
to your client's market, but preserve the structural patterns.

> *"The difference between theory and practice is that in theory, there is no difference."*

---

## Table of Contents
1. SaaS Selling to Mid-Market (B2B, $15K-50K ACV)
2. Agency Selling to E-Commerce (Service, $3K-8K/mo retainer)
3. Consultant Selling to Enterprise (Advisory, $50K+ engagement)

---

## 1. SaaS Selling to Mid-Market

### The Setup

**Product**: Data observability platform (think: Datadog competitor for mid-market)
**ACV**: $25,000/year
**Target**: VP Engineering / Head of Platform at companies with 100-500 employees
**Market sophistication**: Stage 4 (many competitors, prospects are bombarded)
**Awareness level**: Problem Aware → Solution Aware

### ICP Definition (from `icp-segmentation.md`)

```
Title:         VP Engineering, Head of Platform, Director of SRE
Company size:  100-500 employees
Industry:      SaaS, Fintech, HealthTech (data-heavy verticals)
Tech stack:    AWS/GCP, Kubernetes, Datadog or New Relic (indicates monitoring maturity)
Trigger:       Recently raised Series B/C (scaling infra), OR hiring DevOps/SRE (growing team)
Disqualifier:  Already using a direct competitor, <50 employees, no cloud infrastructure
```

### List Building

**Sources**: Apollo (primary) + LinkedIn Sales Navigator (validation) + Clay (enrichment)

**Apollo filters**:
- Title contains: VP Engineering, Head of Platform, Director of SRE, VP Infrastructure
- Company headcount: 100-500
- Industry: Computer Software, Internet, Financial Technology
- Technologies: AWS OR GCP OR Azure, Kubernetes
- Funding: Series B or later, raised in last 18 months

**Clay enrichment layer** (see `ai-personalization.md`):
- Waterfall email: Apollo → Hunter → Dropcontact → Findymail
- Company enrichment: Recent funding amount, tech stack from BuiltWith
- AI first line: Claygent researches company's engineering blog + recent hires

**List size**: 2,000 contacts (micro-segmented into 4 batches of 500)
**Expected bounce**: <2% (triple-verified emails)

### Domain & Infrastructure Setup (from `infrastructure-deliverability.md`)

```
Primary domain:    acmedata.com (do NOT send from this)
Sending domains:   acmedata.io, getacmedata.com, tryacmedata.com
Inboxes per domain: 3 (Google Workspace)
Total inboxes:     9
Daily send limit:  30/inbox → 270/day total capacity
Warmup period:     3 weeks minimum before campaign launch
DNS:               SPF + DKIM (2048-bit) + DMARC (p=none initially)
Custom tracking:   track.acmedata.io (CNAME)
```

### Sequence Architecture (from `campaign-architecture.md`)

**Sequence: 4 steps, 10-day cadence**

```
Step 1 (Day 1) — Problem-Led Hook
Subject A: {{first_name}}, quick q about observability at {{company}}
Subject B: monitoring blind spots at {{company}}?

{{ai_first_line}}

Most engineering teams scaling past 100 people hit the same wall:
your monitoring tools were built for a smaller team. Alert fatigue
goes up, MTTR creeps higher, and nobody trusts the dashboards anymore.

We built {{product}} specifically for this stage — teams that have
outgrown their current observability stack but aren't ready to hire
a dedicated platform team.

Worth a 15-min look? Happy to show you what {{similar_company}}
saw after switching.

{{sender_first}}

---

Step 2 (Day 3) — Social Proof
Subject: re: {{subject_line_step1}}

{{first_name}} — quick follow-up.

{{similar_company_2}} reduced their MTTR by 42% in the first
quarter after switching. Their VP Eng said the biggest win was
"getting our on-call team to actually trust the alerts again."

Would that kind of outcome move the needle for {{company}}?

{{sender_first}}

---

Step 3 (Day 7) — New Angle (Cost)
Subject: the hidden cost of alert fatigue

{{first_name}}, one data point that might be relevant:

Teams our size (100-500 eng) typically spend 15-20% of SRE time
triaging false-positive alerts. At your headcount, that's roughly
{{estimated_cost}} in engineering time annually.

If reducing that number by even half would be useful, I'd love
to show you how in 15 min.

{{sender_first}}

---

Step 4 (Day 10) — Breakup / Permission-Based
Subject: should I close the loop?

{{first_name}} — I know observability isn't always top of mind
until something breaks.

If the timing isn't right, totally understand. But if you'd want
to see a quick demo before your next planning cycle, happy to
set something up.

Either way, no hard feelings — just let me know and I'll stop
reaching out.

{{sender_first}}
```

### Spintax Implementation

```
Step 1 opening variants:
{Most|The majority of} engineering teams {scaling past|growing beyond}
{100 people|the 100-person mark} {hit the same wall|run into the same problem}:
{your monitoring tools|the monitoring stack} {were built for|was designed for}
a {smaller team|different scale}.
```

### A/Z Test Plan

**Test 1 (Week 1-2)**: Subject line — Problem vs Curiosity
- Variant A: `{{first_name}}, quick q about observability at {{company}}`
- Variant B: `monitoring blind spots at {{company}}?`
- Min sends per variant: 200
- Winner metric: Positive reply rate

**Test 2 (Week 3-4)**: CTA — Direct ask vs Permission-based
- Variant A: `Worth a 15-min look?`
- Variant B: `Would it make sense to explore this?`

**Test 3 (Week 5-6)**: Opening — AI first line vs Standard personalization
- Variant A: `{{ai_first_line}}` (Clay-generated)
- Variant B: `Saw {{company}} recently {{trigger_event}} — congrats.`

### Subsequence Triggers

```
Positive reply → Tag "Interested", move to Opportunities, notify AE in Slack
Neutral reply  → Subsequence: "Helpful resource" (send case study PDF)
OOO reply      → Auto-pause, re-enter sequence 7 days after return date
"Not interested" → Tag "Not Now", add to quarterly nurture list
Referral       → Tag "Referred", create new lead for referred contact
```

### Expected Metrics (4 weeks)

| Metric | Target | Notes |
|---|---|---|
| Emails sent | 2,000 | 4 batches of 500, staggered weekly |
| Open rate | 55-65% | Directional only (Apple MPP distortion) |
| Reply rate | 8-12% | 160-240 total replies |
| Positive reply rate | 50-60% of replies | 80-144 positive replies |
| Meetings booked | 40-70 | ~50% of positive replies convert to meeting |
| Meetings per 1,000 sent | 20-35 | Elite range |

### Post-Launch Optimization Protocol (from `analytics-optimization.md`)

```
Week 1: Monitor deliverability (inbox placement, bounce rate)
Week 2: First A/Z test results — declare subject line winner
Week 3: Second A/Z test (CTA), scale winner from Test 1
Week 4: Review full funnel: sent → replied → meeting → pipeline
Week 5+: Expand to next micro-segment with proven sequence
```

---

## 2. Agency Selling to E-Commerce

### The Setup

**Service**: Email marketing agency (Klaviyo management + lifecycle flows)
**Retainer**: $5,000/month
**Target**: E-commerce brand founders/CMOs doing $1M-10M revenue
**Market sophistication**: Stage 5 (hyper-competitive, everyone's been pitched)
**Awareness level**: Most Aware (they know they need email, they've heard every pitch)

### ICP Definition

```
Title:         Founder, CEO, CMO, Head of Marketing, Director of Growth
Company size:  5-50 employees
Industry:      DTC e-commerce (fashion, beauty, supplements, home goods)
Revenue:       $1M-10M/year (on Shopify, established but not enterprise)
Trigger:       Running paid ads (Meta/Google) but email revenue <30% of total
               OR recently switched/considering switching email platforms
               OR hiring for email marketing role (signal: trying to build in-house)
Disqualifier:  Already has an agency, <$500K revenue, B2B e-commerce
```

### List Building

**Sources**: Apollo + Shopify app store reviews + LinkedIn (manual enrichment for top 200)

**Clay personalization** (Medium Tier — see `ai-personalization.md`):
- Company website → Claygent extracts: brand aesthetic, product category, price point
- Shopify store data: estimated revenue tier, tech stack (Klaviyo vs Mailchimp vs other)
- AI variable: `{{store_observation}}` — one specific observation about their email/site

### Sequence Architecture

**Sequence: 5 steps, 14-day cadence**
(More steps because this market is noisier — persistence matters)

```
Step 1 (Day 1) — Observation-Led (Pattern Interrupt)
Subject: {{company}}'s welcome flow

{{first_name}} — I signed up for {{company}}'s email list
yesterday and went through your welcome sequence.

{{store_observation}}

Most DTC brands at your stage are leaving 20-30% of revenue
on the table with their email flows alone — before we even
talk about campaigns.

Would it be useful if I mapped out the 3 highest-impact
fixes for {{company}}'s flows? No pitch — just the audit.

{{sender_first}}
Founder, [Agency Name]

---

Step 2 (Day 3) — Value-First Follow-Up
Subject: re: {{subject_line_step1}}

Quick follow-up — here's one specific thing I noticed:

{{specific_flow_gap}}

For a brand at {{company}}'s stage, fixing this one flow
typically adds ${{estimated_monthly_revenue}}/mo in recovered
revenue. Happy to show you the math.

{{sender_first}}

---

Step 3 (Day 7) — Case Study
Subject: how {{similar_brand}} added $47K/mo from email

{{first_name}} — {{similar_brand}} was in a similar spot:
strong paid acquisition, but email was doing ~18% of revenue.

We rebuilt their flows + launched a structured campaign calendar.
6 months later: email is 38% of revenue, adding $47K/month
they weren't capturing before.

The full breakdown is here if you want to see it: {{case_study_link}}

If {{company}} is anywhere near that gap, worth 15 min to talk?

{{sender_first}}

---

Step 4 (Day 10) — Different Angle (Competitive)
Subject: what {{competitor_brand}} is doing with email

{{first_name}} — I was looking at {{competitor_brand}}'s email
strategy (one of your competitors in the {{product_category}} space).

They're running {{competitor_email_tactic}} — and it's clearly
working based on their sending frequency and creative quality.

Not saying you need to copy them, but there might be some
moves worth borrowing. Happy to walk through what I'm seeing
if useful.

{{sender_first}}

---

Step 5 (Day 14) — Breakup
Subject: last one from me

{{first_name}} — I'll keep this short.

If email isn't a priority right now, totally get it. But if
you want a free audit of {{company}}'s flows with specific
revenue estimates, the offer stands.

Just reply "audit" and I'll send it over. No call required.

{{sender_first}}
```

### Key Tactical Notes

- **CTA is a free audit, not a call.** E-com founders are allergic to "let's hop on a call" from agencies. The audit is the wedge — it demonstrates value before asking for time.
- **Step 1 requires real research.** The `{{store_observation}}` variable must be genuine. If using Clay, the Claygent prompt should visit their site and identify a specific gap. If manual, spend 2 min per prospect signing up for their email list.
- **Step 4 uses competitor intelligence.** This is a pattern interrupt — founders always want to know what competitors are doing. Source this from the Research & Market Analysis skill.

### Expected Metrics

| Metric | Target | Notes |
|---|---|---|
| Emails sent | 1,000 (200/week over 5 weeks) | Smaller, higher-quality list |
| Reply rate | 10-15% | Higher due to deep personalization |
| Positive reply rate | 40-50% of replies | Lower than SaaS (more noise) |
| Audit requests | 25-40 | The "reply audit" CTA converts well |
| Meetings from audits | 15-25 | 60-70% of audit recipients take a call |
| Closed clients (3 months) | 5-10 | 30-40% close rate from meetings |

---

## 3. Consultant Selling to Enterprise

### The Setup

**Service**: Strategic operations consulting (revenue ops, GTM architecture)
**Engagement**: $50K-150K project, 3-6 month duration
**Target**: CRO / VP RevOps at companies with 500-5,000 employees
**Market sophistication**: Stage 3-4
**Awareness level**: Solution Aware (they know they need help, evaluating options)

### ICP Definition

```
Title:         CRO, VP Revenue Operations, VP Sales Operations, SVP Growth
Company size:  500-5,000 employees
Industry:      B2B SaaS, Enterprise Software
Revenue:       $50M-500M ARR
Trigger:       New CRO hired (last 6 months) — mandate to fix GTM
               OR missed revenue target last quarter (earnings call data)
               OR recently acquired a company (integration complexity)
Disqualifier:  Has Big 4 consulting on retainer, <$30M ARR, not B2B
```

### Key Differences from SMB Campaigns

```
1. VOLUME: 200-500 contacts total (not thousands). Quality >>> quantity.
2. PERSONALIZATION: Deep tier only. Every email references something
   specific about their company, earnings call, or public statements.
3. MULTICHANNEL: Email + LinkedIn mandatory (see multichannel-orchestration.md).
   These executives are not email-only reachable.
4. CTA: Never "15-min call." Instead: "I put together a brief analysis
   of [specific thing]. Worth sharing?"
5. CADENCE: Slower. Day 1, Day 5, Day 12, Day 21. Enterprise moves slow.
6. COMPLIANCE: Extra caution with GDPR if targeting EU execs (see compliance-legal.md).
```

### Sequence Architecture (4 steps, 21-day cadence)

```
Step 1 (Day 1) — Executive Insight
Subject: {{company}}'s GTM motion post-{{trigger_event}}

{{first_name}} — congrats on {{trigger_event}}. That kind of
transition usually surfaces some hard questions about the GTM
architecture.

I spent some time looking at {{company}}'s go-to-market from
the outside. A few observations:

{{custom_analysis_paragraph}}

I put together a short brief on what I'd prioritize if I were
in your seat. Happy to share it — no strings.

Best,
{{sender_first}}
{{sender_title}}, [Firm Name]
[One line of credibility: "Previously led RevOps transformation at [logo]"]

---

Step 2 (Day 5) — Follow-Up with LinkedIn Touch
[LinkedIn connection request sent Day 3 — see multichannel-orchestration.md]

Subject: re: {{company}}'s GTM motion

{{first_name}} — following up on my note last week.

To give you a sense of what the brief covers: I looked at
{{company}}'s sales cycle length relative to your ACV tier
and the team structure visible on LinkedIn. There are 2-3
structural patterns I see that typically add 15-25% to
pipeline velocity when addressed.

Worth 20 minutes to walk through? I can make it specific
to your current quarter.

{{sender_first}}

---

Step 3 (Day 12) — Third-Party Proof
Subject: how {{similar_company}} restructured their GTM

{{first_name}} — {{similar_company}} (similar stage, similar
market) was dealing with the same GTM complexity after their
Series D.

We restructured their handoff architecture between marketing
and sales, rebuilt their scoring model, and aligned comp to
pipeline quality instead of volume. Result: 31% increase in
pipeline-to-close conversion in two quarters.

If that outcome would be meaningful for {{company}}, I'd
welcome the chance to discuss.

{{sender_first}}

---

Step 4 (Day 21) — Graceful Close
Subject: timing

{{first_name}} — I recognize the timing may not be right.

If it would be more useful to revisit this next quarter, I'm
happy to circle back then. Just let me know.

In the meantime, I published a brief on GTM architecture
patterns for companies at {{company}}'s scale: {{content_link}}

Might be useful regardless.

{{sender_first}}
```

### Expected Metrics

| Metric | Target | Notes |
|---|---|---|
| Contacts | 300 | Highly curated, deeply researched |
| Emails sent | 1,200 (4 steps x 300) | Low volume, high quality |
| Reply rate | 12-18% | High due to executive-level personalization |
| Positive reply rate | 55-70% of replies | These are warm, not cold replies |
| Meetings | 25-35 | ~65% of positive replies convert |
| Proposals sent | 10-15 | ~40-50% of meetings advance |
| Closed engagements | 3-6 | 30-40% close rate at this ACV |
| Revenue | $150K-$900K | 3-6 engagements at $50K-150K |

---

## Pattern Summary — What's Consistent Across All Three

| Element | Universal Pattern |
|---|---|
| **ICP precision** | Narrow. 3-5 qualifying criteria + at least 1 timing trigger |
| **List quality** | Triple-verified, enriched, micro-segmented. Never bulk |
| **First email** | Problem-led or observation-led. Never feature-led |
| **CTA** | Lowest friction possible. Audit > Call > Demo |
| **Follow-ups** | Each brings NEW value — proof, angle, or resource. Never "just following up" |
| **Personalization** | Minimum: company + trigger. Ideal: AI first line + custom variable |
| **Testing** | One variable at a time, 150-200 per variant minimum |
| **Subsequences** | Pre-built for positive, neutral, OOO, and not-interested |
| **Metrics** | Optimize for meetings per 1,000 sent, not open rates |

---

## How to Use These Playbooks

1. **Choose the playbook closest to your situation** — adapt the specifics, keep the structure
2. **Read the referenced files** for each section — the playbooks reference `icp-segmentation.md`, `campaign-architecture.md`, `ai-personalization.md`, etc. for deeper detail on each component
3. **Start with Playbook 1 or 2** if you're building your first campaign — they're simpler and faster to execute
4. **Use Playbook 3** only when you have the personalization capacity for deep, per-prospect research
5. **Copy the sequence templates** and adapt the variables — the structure is proven, the specifics are yours to customize
