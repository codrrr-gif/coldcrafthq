# Metrics Frameworks & Business Model Analytics

---

## Table of Contents

- [Part 1: The One Metric That Matters (OMTM)](#the-one-metric-that-matters-omtm--croll--yoskovitz)
- [Part 2: AARRR / Pirate Metrics (McClure)](#aarrr--pirate-metrics-mcclure)
- [Part 3: Lean Analytics Stages](#lean-analytics-stages-croll--yoskovitz)
- [Part 4: Business Model Metrics](#business-model-metrics)
  - [SaaS Metrics](#saas-metrics)
  - [E-Commerce Metrics](#e-commerce-metrics)
  - [Two-Sided Marketplace Metrics](#two-sided-marketplace-metrics)
  - [Media/Content Metrics](#mediacontent-metrics)
  - [Mobile App Metrics](#mobile-app-metrics)
- [Part 5: Cross-Model Principles](#cross-model-principles)
- [Part 6: OMTM Selection Worked Example — TaskFlow](#part-6-omtm-selection-worked-example--taskflow)
- [Part 7: Stage Diagnosis Checklist](#part-7-stage-diagnosis-checklist--what-stage-is-my-business-in)
- [Part 8: Industry-Specific Benchmark Variations](#part-8-industry-specific-benchmark-variations)
- [Part 9: Metric Health Scorecard](#part-9-metric-health-scorecard)
- [Cross-References](#cross-references)

---

## Cross-References

| Reference File | Skill | Relationship to This File |
|---|---|---|
| [experimentation.md](./experimentation.md) | data-analysis | How to run experiments once you've chosen your OMTM — A/B testing, significance, sample sizing |
| [measurement-principles.md](./measurement-principles.md) | data-analysis | Foundational principles for what makes a metric valid, reliable, and actionable |
| [statistical-foundations.md](./statistical-foundations.md) | data-analysis | The math underneath — distributions, confidence intervals, regression for metric modeling |
| [data-storytelling.md](./data-storytelling.md) | data-analysis | How to communicate metric results to stakeholders who don't live in dashboards |
| [optimization-methodology.md](./optimization-methodology.md) | data-analysis | Systematic approach to improving the OMTM once selected — CRO, growth loops, diminishing returns |
| SKILL.md | business-strategy | Strategic context: where metrics sit within competitive positioning, market entry, and growth planning |
| SKILL.md | funnel-architecture | How AARRR and Lean Analytics stages map to funnel design, conversion architecture, and lifecycle marketing |
| SKILL.md | research-market-analysis | Market sizing and competitive benchmarking that inform your "drawing lines in the sand" targets |

---

## The One Metric That Matters (OMTM) — Croll & Yoskovitz

### Core Concept
At any given time, there is ONE metric you should focus on above all others. Not the only metric you track — the one you OPTIMIZE.

### Why OMTM Works
1. **It answers the most important question you have** — forces clarity on what matters NOW
2. **It draws a clear line in the sand** — gives you a target that defines success or failure
3. **It focuses the entire organization** — everyone knows what they're optimizing for
4. **It inspires a culture of experimentation** — with one target, you naturally run experiments to move it

### How to Choose the OMTM
- What stage is the business in? (Empathy → Stickiness → Virality → Revenue → Scale)
- What's the riskiest assumption right now?
- What business model are you running?
- The OMTM should be the metric most tightly linked to the current stage's core risk

### The Squeeze Toy Principle
"Whenever you squeeze one part of a problem, another part bulges out." When you optimize one metric to satisfaction, it reveals the NEXT bottleneck. The OMTM changes as you progress — it's always the current constraint.

**Example (Moz)**: First OMTM was free trial signups → then activation (first meaningful use) → then paid conversion → then retention/churn → then expansion revenue.

### Drawing Lines in the Sand
Set a target for your OMTM BEFORE optimizing. If you don't know what "good" looks like, you can't know when to move on. Use reference class data, competitor benchmarks, or theoretical models to set initial targets. Adjust based on what you learn — but adjust the LINE, not your ambition.

## AARRR / Pirate Metrics (McClure)

### The Framework
A lifecycle funnel for measuring how users interact with your product:

| Stage | Question | Example Metrics |
|---|---|---|
| **Acquisition** | How do users find you? | Traffic by channel, CAC by channel, signup rate |
| **Activation** | Do they have a great first experience? | Onboarding completion, time-to-value, "aha moment" rate |
| **Retention** | Do they come back? | DAU/MAU ratio, cohort retention curves, churn rate |
| **Referral** | Do they tell others? | Viral coefficient, NPS, referral rate, shares per user |
| **Revenue** | Do they pay? | ARPU, LTV, conversion to paid, expansion revenue |

### How to Use AARRR
1. Map your current funnel to AARRR stages
2. Measure conversion between each stage
3. Find the biggest drop-off — that's where you focus
4. The biggest leak in the funnel is your OMTM area

### Key Insight
Don't optimize acquisition until activation and retention are healthy. Pouring users into a leaky bucket wastes money and burns your market. Fix the bucket first.

## Lean Analytics Stages (Croll & Yoskovitz)

### Stage 1: Empathy
**Core question**: Have I found a problem worth solving?
**Key activities**: Customer interviews, problem validation, solution ideation
**Metrics**: Qualitative (interview scores, problem severity rankings)
**Move on when**: You've identified a real, painful problem that people will pay to solve
**Risk**: Falling in love with a solution before validating the problem

### Stage 2: Stickiness
**Core question**: Have I built something people will use and come back to?
**Key activities**: MVP development, retention measurement, feature iteration
**Metrics**: Engagement (DAU/WAU/MAU), retention curves, feature usage, session length
**Move on when**: Retention stabilizes at an acceptable rate (varies by model)
**Risk**: Building features nobody uses, confusing engagement with value

**Critical concept — Leading Indicators of Stickiness**:
- Twitter: Users who follow 30+ people
- Dropbox: Users who put a file in a shared folder
- LinkedIn: Users who reach 7+ connections in 10 days
- Zynga: Users who return on day 1

These "aha moments" are the activation events that predict long-term retention. Find yours.

### Stage 3: Virality
**Core question**: Can my users bring me more users?
**Key activities**: Referral programs, sharing mechanics, viral loops
**Metrics**: Viral coefficient, cycle time, organic vs. paid acquisition mix
**Move on when**: You have a scalable, repeatable growth engine (viral coefficient approaching or exceeding 1.0)
**Risk**: Artificial virality (spam-like behavior) vs. inherent virality (genuine value sharing)

**Viral coefficient formula**: K = invitations sent per user × conversion rate of invitations
- K > 1: Viral growth (each user brings more than one new user)
- K = 0.5-0.99: Amplified growth (virality supplements paid acquisition)
- K < 0.5: Not viral (need paid or organic channels)

**Cycle time matters as much as coefficient**: K = 0.9 with a 1-day cycle crushes K = 0.95 with a 30-day cycle.

### Stage 4: Revenue
**Core question**: Can I make money sustainably?
**Key activities**: Pricing optimization, unit economics, channel development
**Metrics**: CAC, LTV, LTV:CAC ratio, payback period, revenue per user, margins
**Move on when**: Unit economics are positive and scalable (LTV:CAC > 3:1 as a common benchmark)
**Risk**: Premature scaling before unit economics work

**The Penny Machine**: Think of your business as a machine. Put a penny in (CAC), get money out (LTV). Revenue stage is about proving the machine works before putting more pennies in.

### Stage 5: Scale
**Core question**: Can I grow the business sustainably?
**Key activities**: Channel expansion, market expansion, operational efficiency
**Metrics**: Growth rate, market share, channel efficiency, operational margins
**Move on when**: You've built a sustainable, scalable business
**Risk**: The "hole in the middle" — being stuck between niche and mass market (Porter)

## Business Model Metrics

### SaaS Metrics
| Metric | What It Measures | Target/Benchmark |
|---|---|---|
| MRR/ARR | Recurring revenue | Growth rate > 15% month-over-month (early stage) |
| Churn (revenue) | Revenue lost from existing customers | < 2% monthly; negative net revenue churn is elite |
| Churn (logo) | Customers lost | < 5% monthly |
| CAC | Cost to acquire a customer | Payback < 12 months |
| LTV | Lifetime customer value | LTV:CAC > 3:1 |
| LTV:CAC | Unit economics health | > 3:1 is healthy, > 5:1 means under-investing in growth |
| Expansion revenue | Upsell/cross-sell from existing | Should offset or exceed gross churn (negative net churn) |
| NPS | Customer satisfaction/advocacy | > 50 is excellent |
| Time to value | Speed of onboarding | Shorter = better activation |

**Key SaaS insight**: "Churn is everything." A 5% monthly churn means you replace half your customer base every year. At scale, growth cannot outrun high churn. The most successful SaaS companies achieve negative net revenue churn — existing customers grow faster than departing customers shrink the base.

**Freemium as sales tactic, not business model**: The free tier is a customer acquisition channel, not the product. Measure free-to-paid conversion rate (typical: 1-5%) and time-to-conversion.

### E-Commerce Metrics
| Metric | What It Measures | Target/Benchmark |
|---|---|---|
| Conversion rate | Visitors → Buyers | 1-3% typical; varies by category |
| Average order value | Revenue per transaction | Category-dependent |
| Cart abandonment | Drop-off at checkout | 60-70% is typical |
| Revenue per visitor | Combines conversion + AOV | The key efficiency metric |
| Customer acquisition cost | Cost per new buyer | Must be < first-order profit for acquisition mode |
| Repeat purchase rate | Loyalty indicator | Varies: 1-3x/year (furniture) to weekly (groceries) |
| Days to purchase | Consideration period | Longer = need nurturing content |

**Three e-commerce modes** (Hillstrom):
1. **Acquisition mode**: Growth from new customers. Focus on CAC and first-purchase profitability.
2. **Hybrid mode**: Mix of new and returning. Focus on balancing acquisition cost with lifetime value.
3. **Loyalty mode**: Growth from existing customers. Focus on repeat rate, basket size, and reactivation.

### Two-Sided Marketplace Metrics
| Metric | What It Measures |
|---|---|
| Buyer/seller growth rate | Supply and demand balance |
| Liquidity | % of listings that transact within a time period |
| Search effectiveness | Searches that lead to a result click or transaction |
| Buyer/seller conversion | Visitors → Transactors on each side |
| Take rate | Revenue as % of GMV |
| Supply/demand balance | Ratio of supply (listings) to demand (searches/purchases) |
| Fraud rate | % of flagged or fraudulent listings/transactions |

**The chicken-and-egg problem**: You need sellers to attract buyers, and buyers to attract sellers. Most successful marketplaces solve one side first (usually supply), often by providing standalone value to one side.

### Media/Content Metrics
| Metric | What It Measures |
|---|---|
| Audience size | Unique visitors / subscribers |
| Engagement | Time on site, pages per visit, return rate |
| Sessions-to-clicks ratio | How many sessions before a monetization click |
| Ad inventory | Available impressions |
| Click-through rate | % of impressions that generate clicks |
| Revenue per thousand (RPM/CPM) | Monetization efficiency |
| Content quality indicators | Shares, comments, time-on-article |

### Mobile App Metrics
| Metric | What It Measures |
|---|---|
| Downloads / Installs | Top of funnel |
| Day 1 / Day 7 / Day 30 retention | Stickiness |
| DAU / MAU | Active user base |
| ARPU / ARPPU | Revenue efficiency |
| Session length / frequency | Engagement depth |
| % paying users | Monetization penetration (1-5% typical for freemium) |
| LTV | Long-term revenue per user |

## Cross-Model Principles

### The Model-Stage Matrix
Every business model has different critical metrics at each stage. The intersection of MODEL × STAGE determines your OMTM.

| | Empathy | Stickiness | Virality | Revenue | Scale |
|---|---|---|---|---|---|
| **SaaS** | Problem severity | Engagement + retention | Referral rate, NPS | MRR growth, churn, LTV:CAC | Market share, expansion rev |
| **E-commerce** | Purchase intent | Repeat purchase rate | Shares, referrals | Revenue/visitor, margins | Channel efficiency |
| **Marketplace** | Listing quality | Liquidity | Word-of-mouth, both sides | Take rate, GMV | Geographic/category expansion |
| **Media** | Content resonance | Return visitor rate | Sharing, virality | RPM, ad fill rate | Audience scale, diversified rev |
| **Mobile App** | Problem-solution fit | Day 1/7/30 retention | Viral coefficient, K factor | ARPU, % paying | Global expansion, platform |

### Universal Metric Principles
1. **Rates and ratios beat absolute numbers** — "100 new users" means nothing without context. "2% of visitors converted" is actionable.
2. **Comparative metrics beat standalone** — Always compare: vs. last period, vs. cohort, vs. segment, vs. benchmark.
3. **Leading indicators beat lagging** — By the time churn shows up in monthly reports, the damage is done. Watch the leading indicators (engagement drops, support ticket spikes, NPS decline).
4. **Cohort analysis beats aggregate** — Aggregate metrics hide the story. Month-2 retention for January cohort vs. February cohort reveals whether you're actually improving.

---

## Part 6: OMTM Selection Worked Example — TaskFlow

### Company Profile

**TaskFlow** is a B2B SaaS project management tool built for creative and marketing agencies. At the start of this story, they have just closed their seed round and are beginning to formalize their metrics practice.

- **Product**: Project management with resource allocation, client portals, and time tracking
- **Market**: Creative/marketing agencies with 10-100 employees
- **ARR**: $1.2M
- **Customers**: 180 paying accounts
- **ACV**: ~$6,700/year (~$556/month average)
- **Team**: 22 people (8 engineering, 3 product, 4 sales, 3 CS, 2 marketing, 2 ops)
- **Funding**: $3.2M seed, 18 months of runway at current burn

### Transition 1: Empathy Stage — OMTM: Qualitative Feedback Score (QFS)

#### Context

TaskFlow started as a side project by two ex-agency founders who were frustrated with Asana and Monday.com for agency-specific workflows. They had early traction — 180 customers — but realized they had never systematically validated whether they were solving the RIGHT problem. Customers were signing up, but churn was 6.8% monthly and they did not know why. Before optimizing anything, they needed to understand the problem landscape deeply.

#### How They Measured It

They created a Qualitative Feedback Score (QFS) — a structured scoring system applied to customer interviews:

- **Interview format**: 45-minute semi-structured interviews with agency owners and project managers
- **Scoring dimensions** (each scored 1-5):
  1. Problem severity: "How painful is this problem in your daily work?"
  2. Frequency: "How often do you encounter this problem?"
  3. Current alternatives: "How well do existing solutions address it?" (reverse scored)
  4. Willingness to pay: "Would you pay to make this problem go away?"
  5. Problem articulation: How clearly and emotionally the interviewee describes the pain (interviewer-rated)
- **QFS** = average of the five dimensions, per interview, then averaged across the rolling batch

**Target**: QFS >= 4.0 across a batch of 15+ interviews, with at least 3 distinct problem themes scoring above 4.0 independently.

#### What They Learned

Over 8 weeks, they conducted 47 interviews. The data revealed something they did not expect:

| Problem Theme | QFS Score | # Mentions |
|---|---|---|
| "I don't know if we're profitable on this client" | 4.6 | 38/47 |
| "Resource allocation across projects is a nightmare" | 4.3 | 31/47 |
| "Client communication is scattered across 5 tools" | 4.1 | 29/47 |
| "Task management for creative work is too rigid" | 3.2 | 22/47 |
| "We need better reporting for clients" | 2.9 | 18/47 |

The top problem — client profitability visibility — was not even a feature they had built. They had built task management (scored 3.2) and reporting (scored 2.9). Their highest-value feature according to users was a side feature: the time tracking that happened to give rough profitability estimates.

#### When They Knew to Move On

**Signal**: Three consecutive interview batches (batches of 10-15) all returned QFS >= 4.0 on the same top-3 themes. The problem landscape had stabilized — new interviews were confirming, not revealing. They had convergence.

**Decision**: Refocus the product roadmap around client profitability and resource allocation. Deprioritize the client reporting portal entirely.

#### What Would Have Happened If They Stayed

If TaskFlow had skipped Empathy or stayed too long, two failure modes were possible:
- **Skipped Empathy**: They would have continued building better task management features — the thing they assumed mattered — while churn continued at 6.8% because the real pain (profitability visibility) went unaddressed. They would have blamed churn on competition or pricing, never realizing it was a product-problem-fit issue.
- **Stayed too long**: Analysis paralysis. After 100+ interviews, the data would not materially change, but they would delay building for another quarter. In a seed-stage company with 18 months of runway, a quarter of delay is existential.

### Transition 2: Stickiness Stage — OMTM: Weekly Active Users / Total Users (WAU Ratio)

#### Context

Armed with Empathy-stage insights, TaskFlow spent 10 weeks rebuilding around client profitability. They shipped a "Project P&L" dashboard — real-time profit/loss per client project. Now they needed to know: does this feature actually create stickiness? Are users coming back for it?

#### How They Measured It

**OMTM**: WAU Ratio = Weekly Active Users / Total Registered Users on paid accounts

- **"Active" definition**: Logged in AND performed at least one "core action" (viewed a Project P&L, updated time tracking, or modified resource allocation) within the trailing 7 days
- **"Total Users"**: All users on active paid accounts (not just account owners — individual team members)
- **Measurement cadence**: Calculated every Monday morning, covering the prior Monday-Sunday window
- **Segmented by**: Account size (< 20 users, 20-50 users, 50+ users), user role (owner, PM, team member), and tenure cohort (month of signup)

**Target**: WAU Ratio >= 60% sustained over 4 consecutive weeks. This target was set by benchmarking against published B2B SaaS engagement data, where 60% weekly active rate places a product in the top quartile for collaboration tools.

#### The Dashboard

Their internal tracking sheet (simplified):

| Week | Total Users | WAU | WAU Ratio | Core Action Breakdown |
|---|---|---|---|---|
| W1 (Baseline) | 1,240 | 496 | 40.0% | P&L: 18%, Time: 31%, Resource: 12% |
| W4 | 1,285 | 579 | 45.1% | P&L: 24%, Time: 30%, Resource: 14% |
| W8 | 1,340 | 670 | 50.0% | P&L: 31%, Time: 28%, Resource: 16% |
| W12 | 1,410 | 790 | 56.0% | P&L: 35%, Time: 27%, Resource: 19% |
| W14 | 1,445 | 838 | 58.0% | P&L: 36%, Time: 26%, Resource: 20% |
| W16 | 1,490 | 909 | 61.0% | P&L: 37%, Time: 26%, Resource: 21% |
| W17 | 1,505 | 918 | 61.0% | P&L: 37%, Time: 25%, Resource: 22% |
| W18 | 1,520 | 936 | 61.6% | P&L: 38%, Time: 25%, Resource: 22% |
| W19 | 1,538 | 953 | 62.0% | P&L: 38%, Time: 25%, Resource: 22% |

#### Interventions They Tried

The journey from 40% to 62% was not passive. Key interventions:

1. **Week 2-3: Onboarding redesign**. Replaced the generic product tour with a "Set Up Your First Project P&L" guided flow. Impact: new user 7-day activation rate jumped from 34% to 52%.
2. **Week 5: Monday Morning Digest email**. Automated weekly email to account owners showing "Last week's project profitability summary" with a deep link. Impact: +4 percentage points on WAU ratio for account owners specifically.
3. **Week 9: Team member roles**. Added a "team member view" of Project P&L so individual contributors could see how their logged hours mapped to profitability. Before this, only PMs and owners engaged with P&L. Impact: team member WAU rose from 22% to 41%.
4. **Week 11: Slack integration**. Push notifications to Slack when a project's profitability dropped below target margin. Impact: modest (+2 points) but improved real-time engagement patterns.

#### When They Knew to Move On

**Signal**: WAU Ratio crossed 60% in Week 16 and held above 60% for four consecutive weeks (W16-W19). Simultaneously, monthly logo churn dropped from 6.8% to 3.1% — a secondary confirmation that stickiness was real, not just activity inflation.

**Decision**: The product was sticky. Users came back weekly. Churn was under control. Time to figure out scalable growth — enter Virality stage (which TaskFlow largely skipped, as B2B SaaS rarely goes viral; they moved to Revenue).

#### What Would Have Happened If They Stayed

If TaskFlow had kept optimizing WAU Ratio past 62%:
- Diminishing returns. Going from 62% to 68% would require increasingly niche interventions (gamification, notification spam) with decreasing business impact.
- Opportunity cost. Every week spent polishing stickiness was a week not spent proving unit economics. With $1.2M ARR and 14 months of remaining runway, proving LTV:CAC was more urgent than squeezing another 3 points of engagement.
- The squeeze toy principle in action: stickiness was no longer the constraint. Revenue efficiency was.

### Transition 3: Revenue Stage — OMTM: Net Revenue Retention (NRR)

#### Context

TaskFlow now had a sticky product with manageable churn. But their unit economics were unclear. CAC was roughly $8,500 (blended across inbound and outbound), ACV was $6,700, and they had no systematic expansion revenue motion. On paper, LTV:CAC was concerning. They needed to prove that existing customers would grow — that NRR could carry the business toward sustainable economics.

#### How They Calculated It

**NRR** = (Starting MRR + Expansion MRR - Contraction MRR - Churned MRR) / Starting MRR, measured monthly on a trailing-3-month rolling basis.

Component definitions:
- **Starting MRR**: MRR from all customers who were active at the beginning of the measurement period
- **Expansion MRR**: Additional MRR from existing customers (seat additions, plan upgrades, add-on features)
- **Contraction MRR**: Reduced MRR from existing customers (seat removals, plan downgrades)
- **Churned MRR**: MRR from customers who cancelled entirely

**Example calculation (Month 1 of Revenue-stage focus)**:
- Starting MRR: $102,000 (from 175 active accounts — a few had churned since the 180 count)
- Expansion: +$3,100 (12 accounts added seats, 3 upgraded plans)
- Contraction: -$1,800 (6 accounts removed seats)
- Churned: -$2,900 (4 accounts cancelled)
- NRR = ($102,000 + $3,100 - $1,800 - $2,900) / $102,000 = **98.4%**

#### Benchmarking

They benchmarked NRR against published B2B SaaS data:

| NRR Range | Classification | Who's Here |
|---|---|---|
| < 90% | Leaking badly | Troubled SaaS; customers shrinking faster than growing |
| 90-100% | Net negative | Typical early-stage B2B SaaS without expansion motion |
| 100-110% | Net positive | Good SMB SaaS, shows organic expansion |
| 110-130% | Strong | Best-in-class SMB/mid-market SaaS (Slack early days: ~130%) |
| 130%+ | Elite | Enterprise SaaS with land-and-expand (Snowflake, Datadog) |

TaskFlow at 98.4% was in "net negative" territory — customers were slowly shrinking the revenue base. Not catastrophic, but not sustainable. Target: NRR >= 105% sustained over a rolling quarter.

#### How They Used NRR to Guide Expansion Strategy

**Intervention 1: Usage-based seat expansion (Months 1-2)**. Built an in-app prompt: when an account regularly had more active users than licensed seats, surfaced a "Your team is growing" upgrade prompt. Impact: Expansion MRR from seat additions increased 40%.

**Intervention 2: "Agency Growth" plan tier (Month 3)**. Introduced a higher-tier plan with multi-agency features (holding company view, cross-agency resource sharing). Priced at 2.2x the standard plan. Impact: 8% of existing customers upgraded within 6 weeks.

**Intervention 3: Professional services add-on (Month 4)**. Offered "Profitability Optimization Review" — a paid engagement where TaskFlow's CS team analyzed an agency's project profitability data and recommended operational changes. $2,000 one-time, leading to average $200/month MRR increase from resulting feature adoption. Impact: 12 accounts purchased in the first month.

**Results over 6 months**:

| Month | NRR (trailing 3-month) |
|---|---|
| M1 | 98.4% |
| M2 | 99.1% |
| M3 | 101.3% |
| M4 | 104.2% |
| M5 | 106.8% |
| M6 | 108.1% |

#### When They Knew to Move On

**Signal**: NRR exceeded 105% for three consecutive rolling months (M4-M6). Simultaneously, LTV:CAC improved from ~2.4:1 to ~3.8:1 as LTV expanded through better retention and expansion revenue. The penny machine was working.

**Decision**: Unit economics were proven. Time to scale — invest in channel expansion, hire more sales reps, increase marketing spend. They entered Scale stage with confidence that each dollar invested in acquisition would return 3.8x over the customer lifetime.

#### What Would Have Happened If They Stayed

If TaskFlow had continued to hyper-focus on NRR past 108%:
- They would have missed the growth window. Their market (agency PM tools) was heating up with competitors raising large rounds. The time to capture market share was now, not after achieving 115% NRR.
- Over-engineering expansion could alienate customers. Aggressive upselling when NRR is already healthy risks creating a "nickel-and-dime" reputation that damages the brand.
- The constraint had shifted to distribution. The product and economics were proven. The bottleneck was now reaching more of the ~45,000 agencies in their addressable market.

### Key Takeaways from the TaskFlow Case

1. **Each OMTM had a clear, pre-set target**. They did not drift. They drew a line in the sand and moved on when they crossed it.
2. **The OMTM changed exactly when it should have** — when the current metric was no longer the binding constraint.
3. **Secondary metrics confirmed the signal**. QFS convergence was confirmed by problem-theme stability. WAU was confirmed by churn reduction. NRR was confirmed by LTV:CAC improvement.
4. **They resisted the temptation to optimize past the point of diminishing returns**. "Good enough to move on" is a discipline, not a compromise.
5. **The total journey took ~10 months** — 8 weeks in Empathy, 19 weeks in Stickiness, ~6 months in Revenue. This is typical for a seed-stage B2B SaaS company executing with focus.

---

## Part 7: Stage Diagnosis Checklist — "What Stage Is My Business In?"

### How to Use This Checklist

For each Lean Analytics stage below, answer the 5 diagnostic questions honestly. If you answer "Yes" to 4 or more questions in a stage, you are IN that stage. If you score 4+ on multiple stages, you are in the EARLIEST one that qualifies — you cannot skip stages.

### Stage 1: Empathy — Diagnostic Questions

| # | Question | Yes/No |
|---|---|---|
| 1 | Have you conducted fewer than 30 structured problem-discovery interviews with target customers? | |
| 2 | Can you clearly articulate the #1 problem your product solves — and do at least 80% of recent interviewees independently name the same problem? | |
| 3 | Is your product roadmap still primarily driven by founder intuition rather than validated customer pain data? | |
| 4 | If asked "Why do customers churn?", would your honest answer include the phrase "we're not sure"? | |
| 5 | Are you still debating who your ideal customer profile (ICP) is — or has it changed in the last 3 months? | |

**If 4/5 "Yes"**: You are in Empathy. Do not write code, do not buy ads, do not optimize funnels. Talk to people.

### Stage 2: Stickiness — Diagnostic Questions

| # | Question | Yes/No |
|---|---|---|
| 1 | Do you have a shipped product with real users (not just a landing page or waitlist)? | |
| 2 | Is your primary concern "are users coming back?" rather than "are users signing up?" | |
| 3 | Can you define what an "active user" means in your product — and is that definition based on a core action, not just a login? | |
| 4 | Is your retention curve still declining at Day 30, rather than flattening? | |
| 5 | Have you NOT yet identified your product's "aha moment" — the activation event that predicts long-term retention? | |

**If 4/5 "Yes"**: You are in Stickiness. Your only job is to make something people return to. Ignore growth. Ignore revenue optimization. Nail retention.

### Stage 3: Virality — Diagnostic Questions

| # | Question | Yes/No |
|---|---|---|
| 1 | Do you have stable retention (Day 30 retention curve is flat or upticking for recent cohorts)? | |
| 2 | Do users organically mention or share your product without being prompted (in interviews, on social media, in communities)? | |
| 3 | Is your current growth primarily driven by paid acquisition or founder-led sales, rather than word-of-mouth? | |
| 4 | Have you NOT yet built or tested a formal referral/invitation mechanism? | |
| 5 | Is your viral coefficient (K) below 0.5, or do you not know what it is? | |

**If 4/5 "Yes"**: You are in Virality. Your product is sticky — now build the growth engine. Note: many B2B companies (like TaskFlow above) skip or lightly pass through this stage, moving directly to Revenue. That is fine if your model is sales-led.

### Stage 4: Revenue — Diagnostic Questions

| # | Question | Yes/No |
|---|---|---|
| 1 | Do you have a repeatable way to acquire customers (whether viral, organic, or paid)? | |
| 2 | Can you state your CAC, LTV, and LTV:CAC ratio — and is LTV:CAC currently below 3:1? | |
| 3 | Is your pricing based more on "what felt right" than on structured experimentation or willingness-to-pay research? | |
| 4 | Is your net revenue retention (NRR) below 100% — meaning your existing customer base is shrinking over time? | |
| 5 | Would doubling your marketing spend right now feel irresponsible because you are not confident in your unit economics? | |

**If 4/5 "Yes"**: You are in Revenue. Your product works and people come back. Now prove the economics: can you acquire customers profitably and expand their value over time?

### Stage 5: Scale — Diagnostic Questions

| # | Question | Yes/No |
|---|---|---|
| 1 | Is your LTV:CAC ratio above 3:1 and has it been stable for 2+ quarters? | |
| 2 | Do you have at least 2 proven acquisition channels (not just one channel that works)? | |
| 3 | Is your primary constraint now operational (hiring, infrastructure, market coverage) rather than product-market fit or unit economics? | |
| 4 | Are you actively expanding into new segments, geographies, or product lines? | |
| 5 | Would an additional $1M in marketing spend predictably generate >$3M in pipeline based on current channel performance? | |

**If 4/5 "Yes"**: You are in Scale. The machine works. Your job is to grow it efficiently without breaking what works.

### Common Misdiagnosis Patterns

**"We're in Revenue, but we're actually in Stickiness."**
This is the single most common misdiagnosis. Symptoms: You have paying customers and you are focused on improving CAC and LTV, but your monthly logo churn is above 5%. You are not in Revenue — you are in Stickiness. If users do not retain, no amount of pricing optimization or expansion revenue will save you. The leak in the bucket must be fixed before you worry about unit economics. Go back. Fix retention. Then return to Revenue.

**"We're in Scale, but we're actually in Revenue."**
Symptoms: You are hiring aggressively, expanding to new markets, and increasing spend — but your LTV:CAC is below 2:1 and your payback period is 18+ months. You are scaling a money-losing machine. Every new customer acquired at negative unit economics accelerates your path to running out of cash. This is how well-funded startups die: scaling before the economics work.

**"We're in Virality, but we're actually in Empathy."**
Symptoms: You built referral programs and sharing features, but your product changes every month because you keep learning new things about what customers actually want. If the product itself is still in flux, virality mechanics are premature. A referral program for a product that has not found problem-solution fit will amplify confusion, not growth.

**"We skipped Empathy because we have customers."**
Having customers does not mean you've completed Empathy. If you acquired those customers through heavy discounting, founder relationships, or market timing — and you cannot articulate WHY they stay or WHY they churn — you need to go back. Revenue is not evidence of problem-solution fit. Understanding is.

### Stage-Appropriate Metrics: What Matters vs. What Is Vanity

#### Empathy Stage

| Metrics That Matter | Vanity Metrics at This Stage |
|---|---|
| Qualitative Feedback Score / problem severity | Revenue / MRR |
| Number of interviews conducted | Website traffic |
| Problem-theme convergence rate | Social media followers |
| ICP clarity (can you describe them in 2 sentences?) | Product feature count |
| Willingness-to-pay signal strength | Team size |

#### Stickiness Stage

| Metrics That Matter | Vanity Metrics at This Stage |
|---|---|
| Day 1 / Day 7 / Day 30 retention | Total signups |
| WAU/MAU ratio | Press mentions |
| Core action completion rate | App store downloads |
| Time to "aha moment" | Pageviews |
| Cohort retention improvement (is each new cohort better?) | Total registered users |

#### Virality Stage

| Metrics That Matter | Vanity Metrics at This Stage |
|---|---|
| Viral coefficient (K) | Total impressions |
| Cycle time (time between invitation waves) | Ad spend efficiency |
| Organic vs. paid acquisition mix | Brand awareness surveys |
| Invitation-to-activation rate | Content marketing output volume |
| Net Promoter Score | Vanity "shares" with no downstream conversion |

#### Revenue Stage

| Metrics That Matter | Vanity Metrics at This Stage |
|---|---|
| LTV:CAC ratio | Gross revenue (without cost context) |
| Net Revenue Retention (NRR) | Number of new logos (without economics) |
| CAC payback period | Total ARR (if unit economics are negative) |
| Expansion revenue as % of total | Product feature launches |
| Gross margin per customer | Headcount growth |

#### Scale Stage

| Metrics That Matter | Vanity Metrics at This Stage |
|---|---|
| Channel efficiency by segment | Total addressable market size |
| Market share in core segments | Award nominations |
| Operational margin trend | Valuation multiples |
| New market penetration rate | Vanity press coverage |
| Employee productivity (revenue per employee) | Office square footage |

---

## Part 8: Industry-Specific Benchmark Variations

### SaaS by Segment

#### SMB SaaS (ACV < $5K)

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Monthly logo churn | > 5% | 3-5% | 2-3% | < 1.5% |
| Monthly revenue churn | > 4% | 2-4% | 1-2% | < 0.5% (negative net) |
| CAC | > $3,000 | $1,500-$3,000 | $500-$1,500 | < $500 |
| LTV:CAC | < 2:1 | 2-3:1 | 3-5:1 | > 5:1 |
| CAC payback (months) | > 18 | 12-18 | 6-12 | < 6 |
| NRR | < 90% | 90-100% | 100-110% | > 110% |
| Free-to-paid conversion | < 1% | 1-3% | 3-5% | > 7% |

**SMB SaaS context**: High volume, low touch. Churn rates are structurally higher because SMBs go out of business, change tools readily, and have lower switching costs. Compensate with efficient self-serve acquisition and fast payback periods.

#### Mid-Market SaaS (ACV $5K-$50K)

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Monthly logo churn | > 3% | 2-3% | 1-2% | < 0.8% |
| Monthly revenue churn | > 2.5% | 1.5-2.5% | 0.5-1.5% | Negative (net expansion) |
| CAC | > $25,000 | $15,000-$25,000 | $8,000-$15,000 | < $8,000 |
| LTV:CAC | < 2.5:1 | 2.5-3.5:1 | 3.5-5:1 | > 5:1 |
| CAC payback (months) | > 18 | 12-18 | 8-12 | < 8 |
| NRR | < 95% | 95-105% | 105-120% | > 120% |
| Sales cycle (days) | > 90 | 60-90 | 30-60 | < 30 |

**Mid-market context**: Blend of self-serve and sales-assisted. The "Goldilocks zone" — large enough ACVs to justify sales involvement, but short enough cycles to maintain growth velocity. NRR is the defining metric: best-in-class mid-market companies expand aggressively through seat-based and usage-based pricing.

#### Enterprise SaaS (ACV > $50K)

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Annual logo churn | > 15% | 10-15% | 5-10% | < 5% |
| Annual revenue churn | > 10% | 5-10% | 0-5% | Negative (strong net expansion) |
| CAC | > $100,000 | $50,000-$100,000 | $25,000-$50,000 | < $25,000 |
| LTV:CAC | < 3:1 | 3-5:1 | 5-8:1 | > 8:1 |
| CAC payback (months) | > 24 | 18-24 | 12-18 | < 12 |
| NRR | < 100% | 100-115% | 115-140% | > 140% |
| Sales cycle (days) | > 180 | 120-180 | 60-120 | < 60 |

**Enterprise context**: Long sales cycles, high CAC, but very high LTV if retention holds. NRR above 130% is the hallmark of the best enterprise SaaS companies (Snowflake, Datadog, CrowdStrike). Land-and-expand is the defining motion: start with one team or use case, then expand across the organization.

### E-Commerce by Category

#### Fashion / Apparel

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Conversion rate | < 1.0% | 1.0-2.0% | 2.0-3.5% | > 3.5% |
| Average order value | < $50 | $50-$80 | $80-$120 | > $120 |
| Return rate | > 35% | 25-35% | 15-25% | < 15% |
| Repeat purchase rate (12-mo) | < 15% | 15-25% | 25-40% | > 40% |
| CAC (paid) | > $60 | $35-$60 | $20-$35 | < $20 |
| Email revenue % | < 10% | 10-20% | 20-35% | > 35% |

**Fashion context**: High return rates are the silent killer. A 30% return rate means your real conversion rate is ~70% of the reported number. Measure "kept conversion rate" (orders minus returns divided by visitors) for a true picture. Repeat purchase rate is the unlock for profitability — first-order economics are often negative after returns and CAC.

#### Electronics / Tech Products

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Conversion rate | < 0.8% | 0.8-1.5% | 1.5-3.0% | > 3.0% |
| Average order value | < $100 | $100-$250 | $250-$500 | > $500 |
| Return rate | > 15% | 8-15% | 4-8% | < 4% |
| Repeat purchase rate (12-mo) | < 10% | 10-15% | 15-25% | > 25% |
| CAC (paid) | > $80 | $40-$80 | $20-$40 | < $20 |
| Research-to-purchase time (days) | > 30 | 14-30 | 7-14 | < 7 |

**Electronics context**: High AOV but long consideration cycles and heavy comparison shopping. Content marketing (reviews, comparisons, videos) is disproportionately important. Repeat purchase rates are lower because purchase frequency is inherently low — focus on cross-category expansion and accessory attach rates instead.

#### Food & Beverage (DTC)

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Conversion rate | < 2.0% | 2.0-4.0% | 4.0-6.0% | > 6.0% |
| Average order value | < $30 | $30-$50 | $50-$75 | > $75 |
| Return/refund rate | > 8% | 4-8% | 2-4% | < 2% |
| Repeat purchase rate (12-mo) | < 20% | 20-35% | 35-50% | > 50% |
| Subscription conversion (1st to 2nd order) | < 15% | 15-30% | 30-45% | > 45% |
| CAC (paid) | > $40 | $25-$40 | $15-$25 | < $15 |

**Food/Bev context**: Lower AOV demands either subscription (to increase LTV) or very efficient acquisition. The subscription conversion rate — percentage of first-time buyers who subscribe or make a second purchase — is the make-or-break metric. Best-in-class DTC food brands achieve > 45% first-to-second order conversion.

#### Health & Beauty

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Conversion rate | < 1.5% | 1.5-3.0% | 3.0-5.0% | > 5.0% |
| Average order value | < $35 | $35-$60 | $60-$90 | > $90 |
| Return rate | > 12% | 6-12% | 3-6% | < 3% |
| Repeat purchase rate (12-mo) | < 20% | 20-35% | 35-50% | > 50% |
| Subscription retention (6-mo) | < 30% | 30-50% | 50-70% | > 70% |
| CAC (paid) | > $50 | $30-$50 | $15-$30 | < $15 |

**Health/Beauty context**: High replenishment rates make this a subscription-friendly category. The key metric is subscription retention at the 6-month mark — early attrition is common (novelty wears off), but customers who survive 6 months tend to stay 2+ years. Influencer marketing typically drives the lowest CAC in this category.

### Marketplace Benchmarks

#### Supply-Side Metrics

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Seller activation rate (listed 1+ item) | < 30% | 30-50% | 50-70% | > 70% |
| Seller 90-day retention | < 20% | 20-40% | 40-60% | > 60% |
| Avg listings per active seller | < 3 | 3-10 | 10-30 | > 30 |
| Time to first transaction (days) | > 30 | 14-30 | 7-14 | < 7 |
| Seller NPS | < 20 | 20-40 | 40-60 | > 60 |

#### Demand-Side Metrics

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Buyer conversion (visit to purchase) | < 1% | 1-3% | 3-6% | > 6% |
| Buyer repeat rate (90-day) | < 15% | 15-30% | 30-50% | > 50% |
| Search-to-result satisfaction | < 40% | 40-60% | 60-80% | > 80% |
| Time to first purchase (days) | > 14 | 7-14 | 3-7 | < 3 |
| Buyer NPS | < 30 | 30-50 | 50-70 | > 70 |

#### Liquidity and Platform Metrics

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| Liquidity (% listings transacted / 30 days) | < 10% | 10-25% | 25-50% | > 50% |
| Supply/demand ratio | > 10:1 or < 0.5:1 | 3-10:1 | 1-3:1 | ~1:1 (dynamic) |
| Fraud rate | > 5% | 2-5% | 0.5-2% | < 0.5% |

#### Take Rates by Marketplace Category

| Category | Typical Take Rate |
|---|---|
| Real estate | 1-3% |
| Vehicles | 2-5% |
| General merchandise | 8-15% |
| Handmade/artisan goods | 10-20% |
| Services / freelance | 15-25% |
| Food delivery | 15-30% |
| Digital goods | 25-35% |
| Recruiting / talent | 15-25% |

**Marketplace context**: Liquidity is the master metric. A marketplace with 100,000 listings where 5% transact monthly is weaker than one with 10,000 listings where 40% transact. Buyers come for selection but stay for success rate — the probability that their search leads to a satisfying purchase.

### Mobile App Benchmarks

#### Retention by Category (D1 / D7 / D30)

| Category | D1 Retention | D7 Retention | D30 Retention |
|---|---|---|---|
| Social / Communication | 30-40% | 18-25% | 12-18% |
| Gaming (casual) | 25-35% | 10-15% | 4-8% |
| Gaming (midcore/hardcore) | 20-30% | 12-18% | 8-12% |
| Productivity / Utilities | 20-30% | 12-18% | 8-15% |
| Health & Fitness | 20-28% | 10-16% | 6-12% |
| Finance | 22-32% | 14-20% | 10-16% |
| E-commerce (mobile app) | 18-25% | 8-14% | 5-10% |
| News / Media | 22-30% | 10-16% | 6-10% |
| Education | 15-25% | 8-14% | 4-8% |

**Retention context**: D1 retention is the single most predictive metric for mobile app success. If D1 is below 25% for a non-gaming app, something is fundamentally wrong with the first-time user experience or the app-store-to-product expectation gap. Fix D1 before anything else.

#### Monetization Benchmarks

| Metric | Below Average | Average | Good | Best-in-Class |
|---|---|---|---|---|
| ARPDAU (ad-supported) | < $0.02 | $0.02-$0.05 | $0.05-$0.15 | > $0.15 |
| ARPDAU (IAP games) | < $0.05 | $0.05-$0.15 | $0.15-$0.50 | > $0.50 |
| ARPPU (monthly, subscription) | < $5 | $5-$12 | $12-$30 | > $30 |
| ARPPU (monthly, IAP games) | < $20 | $20-$50 | $50-$100 | > $100 |
| % paying users (freemium) | < 1% | 1-3% | 3-7% | > 7% |
| % paying users (subscription) | < 2% | 2-5% | 5-12% | > 12% |
| Trial-to-paid conversion | < 20% | 20-40% | 40-60% | > 60% |

**Monetization context**: ARPDAU (Average Revenue Per Daily Active User) is the fundamental health metric for mobile monetization. Multiply ARPDAU by projected lifetime days active to estimate LTV. For subscription apps, trial-to-paid conversion is the lever — a 10% improvement in trial conversion often matters more than a 20% improvement in trial starts.

---

## Part 9: Metric Health Scorecard

### Purpose

Before you optimize any metric, you need to know whether your measurement system itself is healthy. A broken measurement system will lead you to optimize the wrong things, celebrate false victories, and miss real problems. This scorecard diagnoses your measurement practice, not your business metrics.

### The 10 Criteria

Score each criterion from 1 (strongly disagree) to 5 (strongly agree).

#### Criterion 1: Single Primary Metric
**"We have exactly ONE primary metric that the entire company is optimizing for right now."**

- Score 1: We have 10+ "key metrics" on our dashboard with no hierarchy
- Score 3: We have 3 primary metrics that we say are "equally important"
- Score 5: Everyone in the company — from CEO to intern — can name the ONE metric and explain why it is the priority

**Why it matters**: Three "equally important" metrics means zero important metrics. When everything is a priority, nothing is. The OMTM forces the hard conversation about what actually matters right now.

#### Criterion 2: Measurement Frequency
**"We can measure our primary metric at least weekly, with data available within 24 hours of the period ending."**

- Score 1: We look at our key metric quarterly, when the board deck is due
- Score 3: We check it monthly with a few days of lag
- Score 5: It updates in real-time or daily, and we review it formally each week

**Why it matters**: A metric you measure quarterly is a reporting metric, not a management metric. You cannot run experiments, detect problems, or iterate on a 90-day feedback loop. Weekly is the minimum cadence for a metric to drive action.

#### Criterion 3: Actionability
**"When our primary metric changes, we can trace the change to specific actions we took (or did not take)."**

- Score 1: Our key metric moves and we have no idea why
- Score 3: We can sometimes connect metric changes to actions, but there is a lot of noise
- Score 5: We have a clear causal model — we know which levers move the metric and by roughly how much

**Why it matters**: A metric that moves independently of your actions is a weather report, not a management tool. If you cannot connect actions to outcomes, you are not managing — you are observing.

#### Criterion 4: Ratio Over Absolute
**"Our primary metric is a ratio or rate, not an absolute number."**

- Score 1: Our primary metric is "total revenue" or "total users"
- Score 3: We track ratios but our primary reporting is in absolute terms
- Score 5: Our primary metric is a ratio (conversion rate, retention rate, NRR, revenue per user, etc.)

**Why it matters**: Absolute numbers always go up in a growing company. "We have 50,000 users!" tells you nothing about health. "42% of users return in week 2" tells you whether the product is working. Ratios normalize for growth and reveal the underlying dynamics.

#### Criterion 5: Team Comprehension
**"Every team member can explain what moves our primary metric and how their work connects to it."**

- Score 1: Only the data team knows what the metric means
- Score 3: Leadership understands it; the broader team has heard of it
- Score 5: Every team member can draw the causal chain from their daily work to the primary metric

**Why it matters**: A metric that only the analytics team understands is a report, not a rallying point. The power of the OMTM comes from organizational alignment — when the engineer choosing between two features can reason about which one moves the number.

#### Criterion 6: Leading Indicator
**"Our primary metric is a leading indicator that predicts future outcomes, not a lagging indicator that reports past results."**

- Score 1: We focus on lagging metrics (quarterly revenue, annual churn rate)
- Score 3: Our primary metric has a mix of leading and lagging characteristics
- Score 5: Our primary metric moves before the outcome it predicts — it gives us early warning

**Why it matters**: By the time annual churn shows up in your board deck, those customers left 3-9 months ago. Leading indicators (engagement drops, NPS declines, support ticket volume) give you time to intervene. Lagging indicators give you time to mourn.

#### Criterion 7: Segmentation Capability
**"We can break our primary metric down by meaningful segments (cohort, channel, customer type, geography)."**

- Score 1: We only have the aggregate number
- Score 3: We can segment by 1-2 dimensions but it requires ad-hoc analysis
- Score 5: Our dashboards automatically show the metric by cohort, segment, and channel, and we review segments weekly

**Why it matters**: Aggregate metrics hide the truth. Your "3% monthly churn" might be 1% for enterprise customers and 8% for SMBs. Your "2% conversion rate" might be 5% from organic search and 0.3% from paid social. Segments reveal where to focus.

#### Criterion 8: Target Existence
**"We have a specific, written target for our primary metric that defines success."**

- Score 1: We do not have a target — we just want it to "go up"
- Score 3: We have an informal target that leadership mentions sometimes
- Score 5: We have a written target, it is based on benchmarks or analysis, and everyone knows what it is

**Why it matters**: Without a target, you do not know when to celebrate, when to panic, or when to move on to the next constraint. "We want more revenue" is not a strategy. "We need NRR above 105% for three consecutive months before we invest in scaling" is a strategy.

#### Criterion 9: No Gaming Incentive
**"Our primary metric cannot be easily gamed or inflated without creating real business value."**

- Score 1: We could hit our metric target through behavior that actually harms the business
- Score 3: There are some ways to game it, but they would be noticed
- Score 5: The only way to move the metric is to genuinely improve the thing it measures

**Why it matters**: Goodhart's Law — "When a measure becomes a target, it ceases to be a good measure." If your OMTM is "number of signups," the team will optimize for low-quality signups. If it is "7-day retained users from paid channels," gaming requires actually building something people use.

#### Criterion 10: Expiration Awareness
**"We have defined conditions under which we will CHANGE our primary metric to a different one."**

- Score 1: We have never discussed when we would change our primary metric
- Score 3: We loosely know we will shift focus eventually, but have not defined when
- Score 5: We have explicit graduation criteria — "when X happens, we shift our OMTM from A to B"

**Why it matters**: The OMTM must change as you progress through stages. A team that optimizes the same metric forever will over-fit to one dimension while the business bottleneck shifts elsewhere. Defining graduation criteria in advance prevents both premature shifts and stagnation.

### Scoring Interpretation

| Total Score | Diagnosis | Recommended Action |
|---|---|---|
| 40-50 | Healthy measurement system | You are in the top tier. Focus on execution — your instrumentation is sound. |
| 30-39 | Functional with gaps | You have the basics but key weaknesses. Address any criterion scored below 3. |
| 25-29 | Needs significant work | Your measurement system is not reliably guiding decisions. Pause optimization and fix the foundation. |
| < 25 | Measurement system needs rebuilding before you optimize | Stop optimizing metrics. Your measurement practice is actively misleading you. Rebuild from Criterion 1 downward. |

**If your total score is below 25, your measurement system needs work before you optimize.** Optimizing a broken metric is worse than not optimizing at all — it gives you false confidence while driving you in the wrong direction. Fix the measurement system first.

### Common Anti-Patterns

**The Dashboard of 47 Metrics Where No One Looks at Any of Them**
Every quarterly offsite produces 3 new "critical metrics" and nobody ever removes one. The result: a Looker/Tableau dashboard with 47 tiles that loads in 12 seconds and is opened by exactly zero people between board meetings. The dashboard becomes a monument to good intentions and a replacement for actual decision-making. Symptoms: when someone asks "how are we doing?", the answer starts with opening a laptop and 3 minutes of clicking, rather than an immediate number from memory.

**The Vanity Metric Celebration**
The all-hands meeting where leadership celebrates "1 million total users!" while monthly active users have been flat for 6 months and retention is declining. Total cumulative metrics always go up. They are the metric equivalent of "participation trophies." They feel good and reveal nothing.

**The Metric-of-the-Month Club**
A new OMTM every 3-4 weeks based on whatever the CEO read over the weekend or whatever a board member mentioned in passing. No metric is tracked long enough to reveal a trend, no experiment runs long enough to reach significance, and the team learns to wait out any new initiative because it will be replaced shortly.

**The Precision Fallacy**
Spending 3 weeks building a data pipeline to measure something to 4 decimal places when you do not even know if it is the right thing to measure. Precision is worthless without accuracy. Knowing your conversion rate is "roughly 2-3%" is infinitely more valuable than knowing your "content engagement sentiment-adjusted resonance score" is precisely 0.3847.

**The Averages Trap**
Reporting the average and calling it a day. "Average session length is 4.2 minutes." But the distribution is bimodal: 60% of sessions are under 30 seconds (bounces) and 40% are 8+ minutes (engaged users). The average describes a user that does not exist. Always look at distributions, not just means.

**The Correlated-Metric Cascade**
Tracking 5 metrics that are all downstream of the same driver, then celebrating when "all 5 metrics improved this month." Revenue went up, ARPU went up, LTV went up, average deal size went up, expansion revenue went up — because one large enterprise deal closed. Five metrics moved, but ONE thing happened. Correlated metrics create an illusion of broad improvement when the underlying driver is singular.

**The Measurement-as-Procrastination Pattern**
"We cannot launch the new pricing until we have the analytics instrumented." "We need to build a proper dashboard before we can evaluate the experiment." "Let me pull together the data before we make a decision." Measurement is essential, but it can also be a socially acceptable form of delay. If the question is "should we raise prices?" and you have 50 customers, call 10 of them. Do not build a pricing analytics dashboard.
