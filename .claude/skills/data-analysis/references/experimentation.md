# A/B Testing & Online Controlled Experiments

---

## Table of Contents

- [Part 1: Core Concepts (Kohavi)](#core-concepts-kohavi)
  - [The Overall Evaluation Criterion (OEC)](#the-overall-evaluation-criterion-oec)
  - [The Three Organizational Tenets](#the-three-organizational-tenets)
  - [Experiment Vocabulary](#experiment-vocabulary)
- [Part 2: Statistical Foundations for Experimentation](#statistical-foundations-for-experimentation)
  - [Hypothesis Testing](#hypothesis-testing)
  - [Confidence Intervals](#confidence-intervals)
  - [Sample Size and Duration](#sample-size-and-duration)
- [Part 3: Trustworthiness — What Can Go Wrong](#trustworthiness-what-can-go-wrong)
  - [Sample Ratio Mismatch (SRM)](#sample-ratio-mismatch-srm)
  - [Peeking at P-Values](#peeking-at-p-values)
  - [Multiple Hypothesis Testing](#multiple-hypothesis-testing)
  - [Novelty and Primacy Effects](#novelty-and-primacy-effects)
  - [Simpson's Paradox](#simpsons-paradox)
  - [Survivorship Bias](#survivorship-bias)
- [Part 4: Metric Design Principles](#metric-design-principles)
  - [Metric Taxonomy (Kohavi)](#metric-taxonomy-kohavi)
  - [Guardrail Metrics](#guardrail-metrics)
  - [Goodhart's Law and Campbell's Law](#goodharts-law-and-campbells-law)
- [Part 5: Experimentation Maturity, Long-Term Effects, and Complementary Methods](#experimentation-maturity-model)
  - [Maturity Model (Crawl / Walk / Run / Fly)](#experimentation-maturity-model)
  - [Long-Term Effects and Ecosystem Impact](#long-term-effects-and-ecosystem-impact)
  - [Complementary Methods](#complementary-methods-when-ab-testing-isnt-possible)
  - [The Ideas Funnel](#the-ideas-funnel)
- [Part 6: Worked A/B Test Design](#part-6-worked-ab-test-design)
- [Part 7: Pre-Flight Checklist](#part-7-pre-flight-checklist--before-you-run-an-experiment)
- [Part 8: SRM Diagnostic Template](#part-8-srm-diagnostic-template)
- [Part 9: Sample Size Reference Tables](#part-9-sample-size-reference-tables)
- [Part 10: Experimentation Benchmarks](#part-10-experimentation-benchmarks)

---

## Cross-References Table

| Topic | Related File (this skill) | Related File (other skills) | Relationship |
|---|---|---|---|
| Statistical tests, distributions, CLT | `statistical-foundations.md` | — | Prerequisite math for experiment analysis |
| Metric taxonomies, north star metrics | `metrics-frameworks.md` | — | OEC and guardrail metric design draws directly from metric frameworks |
| Measurement validity, instrumentation | `measurement-principles.md` | — | Trustworthiness checks depend on measurement quality |
| Optimization loops, iteration velocity | `optimization-methodology.md` | — | Experimentation is the validation step inside optimization loops |
| Communicating experiment results | `data-storytelling.md` | — | How to present wins, losses, and inconclusive results to stakeholders |
| Cognitive biases in result interpretation | — | `deep-thinking/references/cognitive-biases.md` | Confirmation bias, anchoring, and narrative fallacy affect how teams read results |
| Decision frameworks for ship/kill/iterate | — | `deep-thinking/references/decision-frameworks.md` | Expected value, reversibility, and optionality frameworks apply to experiment decisions |
| Forecasting and probability calibration | — | `deep-thinking/references/forecasting-and-probability.md` | Base rates, calibration, and Bayesian updating for pre-test predictions |
| Systems thinking and feedback loops | — | `deep-thinking/references/systems-thinking.md` | Ecosystem effects, network effects, and second-order consequences of shipping changes |
| Mental models for strategic reasoning | — | `deep-thinking/references/mental-models.md`, `business-strategy/references/mental-models.md` | Models like "map is not the territory" and "circle of competence" apply to experiment scoping |
| Funnel conversion optimization | — | `funnel-architecture/references/funnel-types.md`, `funnel-architecture/references/funnel-building-blocks.md` | Funnel stages are the most common surfaces for A/B tests |
| Email campaign testing | — | `email-marketing/references/analytics-optimization.md` | Subject line, send time, and sequence A/B tests |
| Copy and headline testing | — | `elite-copywriting/references/frameworks.md`, `elite-copywriting/references/psychology.md` | Copy tests are the highest win-rate experiment category |
| Positioning and offer tests | — | `business-strategy/references/positioning-and-differentiation.md`, `business-strategy/references/offer-architecture.md` | Pricing and positioning experiments require careful OEC design |
| Competitor benchmarking for test ideas | — | `research-market-analysis/references/competitor-audit.md` | Competitor analysis generates hypotheses for tests |
| Customer research for hypothesis generation | — | `research-market-analysis/references/avatar-profiling.md`, `research-market-analysis/references/voc-mining.md` | VoC and avatar data inform what to test and why |

---

## Core Concepts (Kohavi)

### The Overall Evaluation Criterion (OEC)
The OEC is the single quantitative measure of the experiment's objective — the metric you are trying to optimize. It is the MOST IMPORTANT concept in experimentation.

**Why a single metric**: When experiments move multiple metrics in different directions, you need a pre-defined way to make the call. The OEC forces this clarity BEFORE the experiment runs, preventing post-hoc rationalization.

**Properties of a good OEC**:
- Measurable in the short term (experiment duration)
- Causally driven by changes you make
- Sensitive enough to detect meaningful changes
- Not easily gamed (resistant to Goodhart's Law)
- Aligned with long-term business value

**Example**: For a search engine, the OEC might weight: sessions per user (engagement), distinct queries per session (breadth), click-through rate (relevance), and revenue per session (monetization). A composite OEC trades off these dimensions explicitly.

**OEC vs. North Star Metric**: The OEC is experiment-specific and precisely defined. The North Star is a company-level directional metric. They should align but are not the same thing.

### The Three Organizational Tenets

**Tenet 1: The organization wants to make data-driven decisions and has formalized an OEC.**
Without a shared OEC, teams optimize for their own metrics, creating local optimization at the expense of the whole. (Systems thinking: sub-optimization trap.)

**Tenet 2: The organization is willing to invest in infrastructure to run controlled experiments and ensure their results are trustworthy.**
Trustworthiness is non-negotiable. A platform that produces unreliable results is worse than no platform — it creates false confidence.

**Tenet 3: The organization recognizes that it is poor at assessing the value of ideas.**
This is the hardest tenet to accept. At Microsoft, Google, and other mature experimentation orgs, roughly one-third of experiments show positive results, one-third show flat results, and one-third show negative results. The "success rate" of ideas is ~33%. Even HiPPOs (Highest Paid Person's Opinion) are wrong two-thirds of the time. This is WHY you experiment.

### Experiment Vocabulary
- **Control**: The existing experience (what users currently see)
- **Treatment (Variant)**: The modified experience being tested
- **Randomization unit**: The entity being randomized (usually user, sometimes page, session, or cookie)
- **Statistical significance**: The probability that the observed difference is not due to chance (typically p < 0.05)
- **Practical significance**: Whether the observed effect is large enough to matter for the business
- **Power**: The probability of detecting a real effect when one exists (typically 80%)
- **Minimum Detectable Effect (MDE)**: The smallest effect size the experiment is designed to detect

## Statistical Foundations for Experimentation

### Hypothesis Testing
- **Null hypothesis (H0)**: There is no difference between control and treatment
- **Alternative hypothesis (H1)**: There IS a difference
- **Type I error (false positive)**: Declaring a winner when there is no real difference (alpha, typically 5%)
- **Type II error (false negative)**: Failing to detect a real difference (beta, typically 20%)
- **p-value**: The probability of observing results as extreme as (or more extreme than) what was measured, IF the null hypothesis were true. It is NOT the probability that the treatment is better.

### Confidence Intervals
More informative than p-values alone. A 95% CI means: if we repeated this experiment many times, 95% of the intervals would contain the true effect. Report the CI alongside the p-value — the width tells you about precision, the location tells you about direction and magnitude.

### Sample Size and Duration
- Larger effects need fewer samples to detect
- More variance in the metric requires more samples
- Lower significance thresholds (e.g., p < 0.01 vs. p < 0.05) require more samples
- **Minimum duration**: At least one full week to capture day-of-week effects. Two weeks is safer.
- **Don't stop early** just because you see significance (peeking problem)

## Trustworthiness: What Can Go Wrong

### Sample Ratio Mismatch (SRM)
The most important diagnostic check. If you assign 50/50 but observe 50.3/49.7, something is broken. Even small mismatches (detectable via chi-squared test) can invalidate results completely.

**Common SRM causes**:
- Bot filtering that differs between variants
- Redirects that lose users asymmetrically
- Triggering conditions that fire differently
- Browser caching effects

**Rule**: Always check SRM before looking at results. If SRM exists, the experiment is untrustworthy regardless of what metrics show.

### Peeking at P-Values
Looking at results daily and stopping when you see p < 0.05 dramatically inflates false positive rates. With daily peeking over 30 days, the actual false positive rate can exceed 30% (vs. the intended 5%).

**Solutions**: Sequential testing methods, alpha spending functions, or simply pre-commit to the experiment duration and don't peek.

### Multiple Hypothesis Testing
Testing 20 metrics simultaneously means ~1 will show p < 0.05 by chance alone. Apply corrections:
- **Bonferroni**: Divide alpha by number of tests (conservative)
- **Benjamini-Hochberg**: Controls false discovery rate (less conservative)
- Or designate primary vs. secondary metrics upfront

### Novelty and Primacy Effects
- **Novelty**: Users interact more with something new simply because it's new. Effect fades.
- **Primacy**: Users prefer the familiar. Effect also fades.
- **Detection**: Look at the treatment effect over time. If it trends toward zero (novelty) or away from zero (primacy), the initial read is misleading.
- Run experiments long enough for these effects to stabilize.

### Simpson's Paradox
An effect that appears in several different groups can reverse when the groups are combined. Always segment results and check for composition shifts between control and treatment.

### Survivorship Bias
If your experiment causes some users to leave (or not trigger), the remaining population in treatment may be systematically different from control. Analyze on intent-to-treat basis.

## Metric Design Principles

### Metric Taxonomy (Kohavi)
1. **Goal metrics (OEC)**: The north star for the experiment
2. **Driver metrics**: Metrics you believe causally drive the goal metric (e.g., page load time drives engagement)
3. **Guardrail metrics**: Metrics that must NOT degrade (e.g., revenue, page load time, error rates, client crashes)
4. **Debug/diagnostic metrics**: Help explain WHY an effect occurred

### Guardrail Metrics
Every experiment should have guardrails — metrics that trigger an alert if they move in the wrong direction, even if the OEC improves.

**Organizational guardrails** (apply to ALL experiments):
- Page load time / latency
- Client crash rate
- JavaScript error rate
- Revenue per user (short-term)

**Experiment-specific guardrails**: Depend on what the change might break.

### Goodhart's Law and Campbell's Law
**Goodhart**: "When a measure becomes a target, it ceases to be a good measure."
**Campbell**: "The more any quantitative social indicator is used for social decision-making, the more subject it will be to corruption pressures."

**Practical implication**: If you incentivize teams on a metric, they will find ways to inflate it that don't create real value. Sessions-per-user can be gamed by introducing forced redirects. Revenue-per-user can be gamed by dark patterns.

**Defense**: Use COMPOSITE OECs that balance multiple concerns, add guardrails, and regularly audit whether metric movement reflects genuine user value.

## Experimentation Maturity Model

### Crawl Stage
- Running first experiments manually
- Basic instrumentation
- One or two experiments at a time
- Focus: Build the muscle, learn the process

### Walk Stage
- Dedicated experimentation platform (build or buy)
- Automated analysis and scorecards
- Running 10+ concurrent experiments
- Focus: Standardize and scale

### Run Stage
- Hundreds of concurrent experiments
- Sophisticated metric taxonomy (goal/driver/guardrail/debug)
- Institutional memory (searchable experiment history)
- Focus: Optimize the experimentation process itself

### Fly Stage
- Thousands of experiments
- Experimentation is the default for any change
- Advanced techniques: interleaving, multi-armed bandits, causal inference
- Culture where "we don't know" is the expected answer, and the experiment resolves it

## Long-Term Effects and Ecosystem Impact

### Why Short-Term Results Can Mislead
- **Delayed experience**: Users don't encounter the change immediately
- **User learning**: Behavior adapts over time (both habituation and skill building)
- **Ecosystem effects**: Changes to one product affect related products, partners, competitors
- **Network effects**: Treatment effect may propagate through social connections
- **Supply constraints**: Short-term gains may not be sustainable at scale

### Holdback Experiments
Keep a small percentage of users (1-5%) on the old experience for weeks or months after a change ships. Compare long-term outcomes between the holdback group and the treatment group to measure true long-term impact.

## Complementary Methods (When A/B Testing Isn't Possible)

| Method | When to Use | Strength | Weakness |
|---|---|---|---|
| **Interrupted Time Series** | No control group possible | Works with historical data | Confounders over time |
| **Regression Discontinuity** | Assignment based on a threshold | Strong causal inference | Only works at the threshold |
| **Difference-in-Differences** | Natural experiment (some groups affected, others not) | Controls for group-level confounders | Parallel trends assumption |
| **Instrumental Variables** | Need to isolate causal effect from selection bias | Can handle endogeneity | Finding valid instruments is hard |
| **Propensity Score Matching** | Observational data with selection bias | Mimics randomization | Only controls for observed confounders |
| **Geo-based experiments** | Cannot randomize individuals (e.g., ads, pricing) | Realistic market conditions | Low power (few geographic units) |

## The Ideas Funnel
Not all experiments need to be full A/B tests. A healthy experimentation program has a funnel:

1. **Many ideas** → brainstorming, user research, competitive analysis
2. **Filtered by analysis** → data mining, user flows, heuristic evaluation
3. **Tested cheaply** → fake door tests, painted door, Wizard of Oz
4. **Full A/B test** → only the most promising ideas get the full treatment
5. **Shipped with holdback** → long-term monitoring

Rule of thumb: For every 1 idea that ships, 10 were tested, and 100 were considered.

---

## Part 6: Worked A/B Test Design

### Scenario

An ecommerce company sells specialty kitchen equipment. Key metrics:
- **Monthly visitors**: 50,000 unique visitors/month (~1,667/day)
- **Current conversion rate**: 2.3% (purchase completion)
- **Average order value (AOV)**: $67
- **Monthly revenue**: 50,000 x 0.023 x $67 = $77,050

The product team has redesigned the product detail page (PDP). The new layout features larger product images, a sticky add-to-cart bar, consolidated reviews above the fold, and simplified variant selectors. The design team believes this will increase conversions.

The question: Should we ship the new PDP? We will run a controlled experiment to find out.

---

### Step 1: Hypothesis Formulation

A good hypothesis is specific, measurable, and falsifiable. It states the change, the expected effect, the metric, and the expected magnitude.

**Bad hypothesis**: "The new product page will improve conversions."
This is vague. Improve by how much? Over what timeframe? For whom?

**Good hypothesis**: "Replacing the current product detail page layout with the redesigned layout (larger images, sticky add-to-cart, consolidated reviews) will increase the purchase conversion rate from 2.3% to at least 2.53% (a relative lift of at least 10%) among all visitors who view a product detail page, measured over a 4-week test period."

**Why 10% relative lift?** This is our minimum threshold of practical significance. A 10% relative lift on a 2.3% base rate means an absolute increase of 0.23 percentage points (from 2.3% to 2.53%). In revenue terms:
- Current monthly revenue: $77,050
- Projected monthly revenue at 2.53%: 50,000 x 0.0253 x $67 = $84,755
- Incremental monthly revenue: $7,705
- Incremental annual revenue: $92,460

If the lift is smaller than 10% relative, the engineering and design cost of the change may not justify the return. This is the practical significance threshold — the smallest effect we care about.

---

### Step 2: Minimum Detectable Effect (MDE) Calculation

The MDE is the smallest true effect we want our experiment to reliably detect. We set it at 10% relative lift based on the business case above.

- **Baseline conversion rate (p_control)**: 0.023
- **Expected treatment rate (p_treatment)**: 0.0253
- **Absolute difference (delta)**: 0.0253 - 0.023 = 0.0023
- **Relative lift**: 0.0023 / 0.023 = 10%

We need to design the experiment so it has enough statistical power to detect this difference if it truly exists.

---

### Step 3: Sample Size Calculation

We use the standard formula for a two-proportion z-test:

**Formula**:
n = (Z_alpha/2 + Z_beta)^2 x (p1(1-p1) + p2(1-p2)) / (p2 - p1)^2

Where:
- Z_alpha/2 = 1.96 (for 95% confidence, two-tailed)
- Z_beta = 0.84 (for 80% power)
- p1 = 0.023 (control conversion rate)
- p2 = 0.0253 (treatment conversion rate)
- (p2 - p1) = 0.0023

**Plugging in the numbers**:

Numerator:
- (1.96 + 0.84)^2 = (2.80)^2 = 7.84
- p1(1-p1) = 0.023 x 0.977 = 0.02247
- p2(1-p2) = 0.0253 x 0.9747 = 0.02466
- Sum of variances = 0.02247 + 0.02466 = 0.04713
- Numerator = 7.84 x 0.04713 = 0.3695

Denominator:
- (0.0023)^2 = 0.00000529

**n per group** = 0.3695 / 0.00000529 = 69,849

We need approximately **69,849 visitors per group**, or **139,698 total visitors** across both groups.

**Required test duration**:
- Daily traffic: ~1,667 visitors/day
- But not all visitors hit the PDP. Assume 60% of visitors view at least one product page = ~1,000 PDP visitors/day
- Total days needed: 139,698 / 1,000 = ~140 days

**This is a problem.** 140 days is far too long. At nearly 5 months, seasonal effects, site changes, and business shifts would contaminate results.

**Options to reduce duration**:
1. **Increase MDE**: Accept a larger minimum detectable effect (15% relative instead of 10%)
2. **Use one-tailed test**: If we only care about improvement (not degradation), Z_alpha drops from 1.96 to 1.645
3. **Use CUPED variance reduction**: Typically reduces required sample by 30-50%
4. **Focus the population**: Only include visitors with purchase intent signals

**Revised calculation with 15% relative MDE (one-tailed, 80% power)**:
- p2 = 0.023 x 1.15 = 0.02645
- delta = 0.00345
- Z_alpha = 1.645 (one-tailed)
- Z_beta = 0.84
- (1.645 + 0.84)^2 = (2.485)^2 = 6.175
- p1(1-p1) = 0.02247
- p2(1-p2) = 0.02645 x 0.97355 = 0.02575
- Sum = 0.04822
- Numerator = 6.175 x 0.04822 = 0.2978
- Denominator = (0.00345)^2 = 0.00001190
- n per group = 0.2978 / 0.00001190 = 25,025

Total sample needed: ~50,050 visitors to the PDP.
At 1,000 PDP visitors/day: **50 days, approximately 7 weeks**.

This is feasible. We will design for a 15% relative MDE, one-tailed test, 7-week maximum duration.

**Decision**: We accept that we cannot detect effects smaller than 15% relative with this traffic level. If the true effect is 8% relative, we will likely miss it — but an 8% lift on a 2.3% base is also below our practical significance threshold anyway.

---

### Step 4: Randomization Strategy

**User-level randomization** (not session-level).

Why user-level matters: A single user may visit the product page multiple times across sessions. If we randomize at the session level, the same user could see control on Monday and treatment on Thursday. This creates:
- Inconsistent experience (erodes trust, causes confusion)
- Contamination between groups (the same user's behavior is in both groups)
- Inflated variance (user-level effects add noise)

**Implementation**:
- Hash the user ID (or persistent cookie ID) with the experiment name: `hash(user_id + "pdp_redesign_v1") mod 100`
- Values 0-49 go to control, 50-99 go to treatment
- This is deterministic — the same user always gets the same experience
- The experiment name in the hash ensures this experiment's assignment is independent of other experiments

**Edge cases to handle**:
- New users without a persistent ID: Assign a cookie-based ID on first visit, then maintain it
- Logged-out vs. logged-in: Ensure the ID is consistent across authentication states
- Mobile app vs. web: Use a unified identifier if possible

---

### Step 5: Trustworthiness Pre-Checks

Before launching, run these checks during a 3-5 day "A/A test" (both groups see the current experience):

**5a. Sample Ratio Mismatch (SRM) Check**
Run the experiment with both groups seeing the same (control) experience. After 3 days, check whether the split is truly 50/50. If you have 3,000 users and observe 1,530 vs. 1,470, run a chi-squared test:
- Expected: 1,500 / 1,500
- Chi-squared = (1530-1500)^2/1500 + (1470-1500)^2/1500 = 0.60 + 0.60 = 1.20
- p-value at 1 df: ~0.27
- This is fine (p > 0.05 means no evidence of SRM).

**5b. Metric Parity Check**
During the A/A phase, conversion rates between groups should be statistically indistinguishable. If they diverge, something in the instrumentation is broken.

**5c. Novelty Effect Mitigation Plan**
The new PDP is visually different. Returning users may interact with it differently simply because it is new. Our mitigation:
- Segment analysis by new vs. returning visitors
- Track the treatment effect week-over-week; if it declines steadily, novelty is a factor
- If novelty is suspected, extend the test until the effect stabilizes (or plan a follow-up holdback)

**5d. Learning Effect Awareness**
Some product pages require users to learn a new interaction pattern (e.g., the sticky add-to-cart bar). Early results may understate the true long-term effect. We will monitor week-over-week trends for an upward slope in treatment performance.

---

### Step 6: Running the Test

**Daily monitoring (what to check)**:
- **SRM**: Check the traffic split daily. Any deviation from 50/50 beyond statistical expectation is a red flag.
- **Guardrail metrics**: Page load time (the new layout must not be slower), JavaScript error rate, add-to-cart error rate, checkout completion rate among those who add to cart.
- **Data quality**: Are events firing correctly in both variants? Are there null values or logging gaps?

**What NOT to do**:
- DO NOT check the primary conversion rate metric and make decisions. This is peeking. We pre-committed to 7 weeks.
- DO NOT share preliminary results with stakeholders who will pressure you to stop early.
- DO NOT make any other changes to the product page during the test.

**When to stop early (the only valid reasons)**:
- A guardrail metric has degraded severely (e.g., page load time doubled, error rate spiked)
- SRM is detected and cannot be resolved
- A critical bug is found in the treatment experience
- External event makes the test meaningless (site outage, major promotion that overwhelms natural behavior)

**Weekly cadence**:
- Week 1-2: Monitor instrumentation, SRM, guardrails only
- Week 3-4: Continue monitoring; begin preparing analysis plan and stakeholder presentation
- Week 5-7: Continue monitoring; do NOT peek at the primary metric
- End of Week 7: Run the full analysis

---

### Step 7: Result Interpretation

The test has concluded after 7 weeks. Here are the results:

| Metric | Control | Treatment | Difference | 95% CI | p-value |
|---|---|---|---|---|---|
| Visitors | 24,812 | 24,907 | — | — | — |
| Conversions | 579 | 641 | — | — | — |
| Conversion rate | 2.333% | 2.573% | +0.240 pp | [+0.042, +0.438] | 0.018 |
| Relative lift | — | — | +10.3% | [+1.8%, +18.8%] | — |
| AOV | $66.80 | $67.20 | +$0.40 | [-$2.10, +$2.90] | 0.754 |
| Revenue/visitor | $1.559 | $1.729 | +$0.170 | [+$0.021, +$0.319] | 0.026 |
| Page load time | 1.82s | 1.89s | +0.07s | [+0.02, +0.12] | 0.008 |
| JS error rate | 0.12% | 0.13% | +0.01 pp | [-0.03, +0.05] | 0.621 |

**SRM Check**: 24,812 vs. 24,907 on a 50/50 split. Chi-squared = (24812-24859.5)^2/24859.5 + (24907-24859.5)^2/24859.5 = 0.091 + 0.091 = 0.182. p-value = 0.67. No SRM. Good.

**Primary metric (conversion rate)**:
- Observed lift: +10.3% relative (+0.24 percentage points absolute)
- p-value: 0.018 (statistically significant at alpha = 0.05 for a one-tailed test)
- 95% CI: [+1.8%, +18.8%] relative lift
- The CI excludes zero, which confirms significance
- The CI includes values below our 15% MDE threshold, meaning the true effect could be as small as ~2% relative

**Practical significance assessment**:
The point estimate of +10.3% relative lift is below our original 15% MDE design threshold but above the 10% practical significance threshold we defined in our hypothesis. This is a borderline case. The effect is real (statistically significant) but may be smaller than we hoped.

**Revenue impact estimate**:
- Revenue per visitor improved by $0.170 (p = 0.026)
- At 50,000 visitors/month: incremental revenue = $8,500/month = $102,000/year
- But the 95% CI ranges from $1,050/year to $191,400/year — wide uncertainty

**Guardrail check**:
- Page load time increased by 70ms (p = 0.008). This is statistically significant. The larger images in the redesign are causing slower loads. This needs attention.
- JS error rate: No change. Good.
- AOV: No change. Expected — the layout change should not affect what people buy, only whether they buy.

---

### Step 8: Decision Framework

We have three options: **Ship**, **Iterate**, or **Kill**.

**Scoring the decision**:

| Criterion | Assessment | Signal |
|---|---|---|
| Statistical significance | p = 0.018, significant | Ship |
| Practical significance | +10.3% relative, above 10% threshold | Ship |
| Confidence interval | Wide: [+1.8%, +18.8%] | Caution |
| Guardrail: page load time | +70ms, significant | Iterate |
| Guardrail: errors | No change | Ship |
| Revenue impact | Positive, significant | Ship |
| Novelty effect risk | Need to check week-over-week trend | Check |

**Week-over-week conversion rate trend (treatment - control)**:
- Week 1-2: +0.35 pp (higher — possible novelty)
- Week 3-4: +0.22 pp
- Week 5-6: +0.21 pp
- Week 7: +0.20 pp

The effect stabilized after week 2. The initial bump was likely mild novelty. The stable effect of ~+0.21 pp (about +9% relative) is slightly below the point estimate but still meaningful.

**Decision: ITERATE, then ship.**

Rationale:
1. The conversion lift is real and practically significant.
2. The page load regression is a problem that must be fixed before shipping (image optimization, lazy loading, CDN caching).
3. After fixing load time, run a shorter confirmation test (2-3 weeks) to verify the conversion lift holds without the latency regression.
4. If confirmed, ship with a 5% holdback group for long-term monitoring.

**What would "Kill" look like?** If the conversion lift had been <5% relative, or if the CI had included zero, or if a critical guardrail (like checkout errors) had degraded, we would kill the test and go back to the drawing board.

**What would "Ship immediately" look like?** If there were no guardrail regressions and the CI lower bound was above our practical significance threshold (e.g., CI of [+12%, +22%]).

---

## Part 7: Pre-Flight Checklist — Before You Run an Experiment

**Rule: If you cannot pass items 1 through 5, DO NOT launch the test.**

### Category A: Design (Items 1-5)

| # | Check Item | Good | Bad | Severity |
|---|---|---|---|---|
| 1 | **Hypothesis is written down** | Specific, measurable, includes expected effect size and metric | "We think the new design is better" | CRITICAL — will invalidate results |
| 2 | **OEC is defined and agreed upon** | Single primary metric, documented before launch, stakeholders aligned | Multiple primary metrics with no pre-agreed hierarchy; or OEC chosen after results are in | CRITICAL — will invalidate results |
| 3 | **Sample size calculated** | Formula-based calculation with explicit alpha, beta, MDE, baseline rate; duration derived from traffic | "We'll run it for two weeks and see" | CRITICAL — will invalidate results |
| 4 | **Practical significance threshold set** | "We need at least X% relative lift for this to be worth shipping" — documented pre-launch | No threshold defined; any positive result will be called a win | CRITICAL — will invalidate results |
| 5 | **Guardrail metrics listed** | At least 3 guardrails (latency, errors, revenue) with thresholds for what constitutes "degradation" | No guardrails defined; only looking at the OEC | CRITICAL — will invalidate results |
| 6 | **Randomization unit chosen and justified** | User-level with persistent ID; rationale documented for why this unit (not session, not page) | Session-level randomization for a multi-session conversion funnel | Important — will reduce reliability |
| 7 | **Population and trigger defined** | "All users who view a PDP" — clearly scoped, instrumented at the right point | "All site visitors" when only PDP visitors are affected, diluting the signal | Important — will reduce reliability |

### Category B: Implementation (Items 8-10)

| # | Check Item | Good | Bad | Severity |
|---|---|---|---|---|
| 8 | **A/A test passed** | Ran 3-5 days of A/A; no SRM detected; metric parity confirmed between groups | Skipped A/A; launched directly into A/B | Important — will reduce reliability |
| 9 | **Logging verified in both variants** | QA confirmed that all events fire correctly in control AND treatment; checked on multiple browsers/devices | Only tested treatment; assumed control logging unchanged | Important — will reduce reliability |
| 10 | **No conflicting experiments** | Checked the experiment registry; no other tests targeting the same page/flow that could interact | Did not check; another team is also testing PDP changes simultaneously | Important — will reduce reliability |

### Category C: Monitoring (Items 11-13)

| # | Check Item | Good | Bad | Severity |
|---|---|---|---|---|
| 11 | **Daily SRM monitoring plan** | Automated SRM check runs daily; alerts if p < 0.01 on ratio test | No SRM check planned; will only check at end | Important — will reduce reliability |
| 12 | **Guardrail alert thresholds set** | Automated alerts if page load degrades by >100ms or error rate exceeds baseline + 2 sigma | No monitoring; will review guardrails at end of test | Nice-to-have — adds rigor |
| 13 | **Peeking policy documented** | "No one checks primary metric until day 50. Guardrails and SRM only." Written and shared with team | No policy; PM checks results dashboard every morning and Slacks the team | Important — will reduce reliability |

### Category D: Analysis Plan (Items 14-15)

| # | Check Item | Good | Bad | Severity |
|---|---|---|---|---|
| 14 | **Pre-registered analysis plan** | Document states: primary metric, secondary metrics, segments to analyze, corrections for multiple testing, decision criteria | No analysis plan; will "explore the data" after the test and find the story | Important — will reduce reliability |
| 15 | **Decision criteria documented** | "Ship if p < 0.05 AND lower CI bound > 5% relative lift AND no guardrail regression. Iterate if significant but guardrail issue. Kill if CI includes zero or negative." | No criteria; will have a meeting and "discuss the results" | Nice-to-have — adds rigor |

### Scoring Summary

- **Items 1-5 (CRITICAL)**: All five must pass. Missing ANY of these means the experiment cannot produce trustworthy, actionable results. Fix these before launching.
- **Items 6-10, 11, 13, 14 (Important)**: Each missed item reduces confidence in results. Missing two or more "Important" items means you should seriously reconsider launching.
- **Items 12, 15 (Nice-to-have)**: Best practice. Missing these is acceptable for early-stage experimentation programs but should be standard at Walk stage and above.

---

## Part 8: SRM Diagnostic Template

### What Is Sample Ratio Mismatch (SRM)?

SRM occurs when the observed ratio of users in your experiment groups differs significantly from the expected ratio. If you designed a 50/50 split but observe 51.2/48.8, something in your system is sending, retaining, or counting users differently between variants.

**Why SRM invalidates results**: SRM means the randomization is broken. The groups are no longer comparable. Any observed difference in metrics could be caused by the selection bias (which users ended up in which group) rather than the treatment effect. You cannot distinguish the two.

**Severity**: SRM is a binary verdict. If SRM is detected, the experiment is invalid. There is no way to "adjust" for it or "control" for it after the fact. You must find and fix the root cause, then re-run.

---

### How to Calculate Expected vs. Actual Ratios

**Step 1**: Determine the expected split. For a standard 50/50 test:
- Expected proportion in control: 0.50
- Expected proportion in treatment: 0.50

**Step 2**: Count actual users in each group at the END of the test (or at any checkpoint):
- Observed control: N_c
- Observed treatment: N_t
- Total: N = N_c + N_t

**Step 3**: Compare observed proportions to expected.
- Observed proportion in control: N_c / N
- Observed proportion in treatment: N_t / N

---

### Chi-Squared Test for SRM — Worked Example

**Scenario**: A 50/50 test ran for 4 weeks. We observe:
- Control: 18,423 users
- Treatment: 17,891 users
- Total: 36,314 users

**Expected counts** (under 50/50 split):
- E_c = 36,314 x 0.50 = 18,157
- E_t = 36,314 x 0.50 = 18,157

**Chi-squared statistic**:
X^2 = (O_c - E_c)^2 / E_c + (O_t - E_t)^2 / E_t
X^2 = (18423 - 18157)^2 / 18157 + (17891 - 18157)^2 / 18157
X^2 = (266)^2 / 18157 + (-266)^2 / 18157
X^2 = 70756 / 18157 + 70756 / 18157
X^2 = 3.896 + 3.896
X^2 = 7.792

**Degrees of freedom**: k - 1 = 2 - 1 = 1

**p-value**: For X^2 = 7.792 at 1 df, p = 0.0053

**Interpretation**: p = 0.0053 < 0.01. There is strong evidence of SRM. The traffic split is NOT 50/50 as intended. This experiment is compromised.

The difference is 532 users (266 excess in control, 266 deficit in treatment). While 532 out of 36,314 is only 1.5% of total traffic, this systematic bias can produce misleading metric comparisons.

**Threshold**: Use p < 0.01 (not p < 0.05) as the SRM detection threshold. At p < 0.05, you expect false alarms 5% of the time. At p < 0.01, false alarms are rare enough that any detection is worth investigating.

---

### Common Causes of SRM

**Cause 1: Bot traffic filtering that differs between variants**
- **Mechanism**: Your bot filter uses behavioral signals. Treatment changes behavior (e.g., different click patterns, different page load timing). Bots in treatment get filtered at a different rate than bots in control.
- **Detection**: Compare raw (pre-filter) counts vs. post-filter counts. If raw counts are balanced but post-filter counts are not, the filter is the problem.
- **Remediation**: Apply bot filtering BEFORE experiment assignment, not after. Or use a bot filter that does not depend on in-experiment behavioral signals.

**Cause 2: Redirect-based implementation**
- **Mechanism**: Treatment is served via a client-side redirect (user loads control URL, then redirects to treatment URL). Some users bounce during the redirect. These users are counted in control assignment but never reach treatment.
- **Detection**: Compare assignment logs (who was ASSIGNED) to exposure logs (who ACTUALLY SAW the experience). If the gap is larger in treatment, redirects are the cause.
- **Remediation**: Use server-side assignment that serves the correct variant on first load. No redirects.

**Cause 3: Caching**
- **Mechanism**: CDN or browser caching serves a stale version to some users. Users assigned to treatment receive cached control content (or vice versa). They are counted in one group but experience the other.
- **Detection**: Check cache-hit rates by variant. Look for users whose assigned variant does not match their actual experience.
- **Remediation**: Set appropriate cache-busting headers. Use experiment-aware CDN configuration. Add client-side validation that the rendered variant matches the assignment.

**Cause 4: Trigger condition asymmetry**
- **Mechanism**: The experiment only fires when a certain condition is met (e.g., user loads a specific page). If the treatment changes navigation flow, fewer treatment users may reach the trigger point.
- **Detection**: Check trigger rates by assigned group. If fewer treatment users trigger, the treatment is affecting the trigger itself.
- **Remediation**: Move the trigger point earlier in the flow (before the treatment could affect it). Or use intent-to-treat analysis.

**Cause 5: Delayed or asynchronous assignment**
- **Mechanism**: Experiment assignment happens via an async JavaScript call. If the page loads slowly in treatment, users who leave before the JS fires are never assigned. Control (faster) captures more users.
- **Detection**: Compare time-to-assignment between variants.
- **Remediation**: Assign server-side, synchronously, before any content renders.

**Cause 6: Cross-device or cross-session identity issues**
- **Mechanism**: A user visits on mobile (gets assigned to control) and later on desktop (gets assigned to treatment because the IDs don't match). They appear in both groups.
- **Detection**: Look for duplicate conversion events or users appearing in both groups.
- **Remediation**: Use a unified identity system. If not possible, restrict analysis to single-device sessions.

---

### SRM Found — Now What? Decision Tree

```
SRM detected (p < 0.01)
|
+-- Can you identify the root cause?
|   |
|   +-- YES
|   |   |
|   |   +-- Can you fix the cause and re-run?
|   |   |   |
|   |   |   +-- YES --> Fix the root cause. Discard ALL existing data.
|   |   |   |           Re-run the experiment from scratch.
|   |   |   |           Do NOT reuse any data from the compromised run.
|   |   |   |
|   |   |   +-- NO (cause is inherent to the treatment)
|   |   |       |
|   |   |       +-- The treatment fundamentally changes who reaches
|   |   |           the measurement point. Consider:
|   |   |           - Intent-to-treat analysis (analyze ALL assigned users)
|   |   |           - Redesign the trigger condition
|   |   |           - Use a different experiment design (e.g., geo-based)
|   |   |
|   +-- NO (cannot identify the cause)
|       |
|       +-- Do NOT trust any metrics from this experiment.
|           Investigate instrumentation, logging, and infrastructure.
|           Do NOT ship the treatment based on these results.
|           Consider running a new A/A test to verify the platform.
```

**Cardinal rule**: Never try to salvage data from an SRM-compromised experiment by "adjusting" for the imbalance. The bias is unknown in magnitude and direction. Adjustments are guesswork.

---

## Part 9: Sample Size Reference Tables

### Table 1: Required Sample Size Per Group

Baseline conversion rate x minimum detectable effect (relative), at 80% power, 95% confidence (two-tailed).

| Baseline Rate | 5% Relative MDE | 10% Relative MDE | 15% Relative MDE | 20% Relative MDE | 30% Relative MDE |
|---|---|---|---|---|---|
| 1% | 3,207,760 | 802,980 | 357,320 | 201,180 | 89,640 |
| 2% | 1,568,640 | 393,200 | 175,040 | 98,580 | 43,940 |
| 5% | 585,440 | 146,880 | 65,400 | 36,840 | 16,440 |
| 10% | 262,400 | 65,860 | 29,340 | 16,540 | 7,380 |
| 20% | 102,400 | 25,720 | 11,460 | 6,460 | 2,880 |

**How to read this table**: Find your baseline conversion rate on the left. Find the smallest relative lift you want to detect across the top. The cell value is the number of visitors needed IN EACH GROUP (multiply by 2 for total).

**Example**: Baseline 2%, want to detect 15% relative lift (i.e., from 2.0% to 2.3%). You need ~175,040 per group = ~350,080 total.

---

### Table 2: Required Test Duration (Days)

Given daily traffic allocated to the experiment, baseline rate, and MDE (10% relative lift, 80% power, 95% confidence, two-tailed). Total sample = 2x the per-group value from Table 1.

| Daily Traffic | Baseline 1% | Baseline 2% | Baseline 5% | Baseline 10% | Baseline 20% |
|---|---|---|---|---|---|
| 1,000/day | 1,606 days | 786 days | 294 days | 132 days | 51 days |
| 5,000/day | 321 days | 157 days | 59 days | 26 days | 10 days |
| 10,000/day | 161 days | 79 days | 29 days | 13 days | 5 days |
| 50,000/day | 32 days | 16 days | 6 days | 3 days | 1 day* |
| 100,000/day | 16 days | 8 days | 3 days | 1 day* | 1 day* |

*Minimum test duration should be 7 days regardless of sample size sufficiency, to capture day-of-week effects. Values marked with * indicate sufficient sample in <7 days, but the test should still run at least 7 days.

---

### Table 3: "Can I Even Run This Test?" — Minimum Daily Traffic Required

To complete a test in a reasonable timeframe (maximum 28 days), at 80% power, 95% confidence, two-tailed.

| Baseline Rate | 5% Relative MDE | 10% Relative MDE | 15% Relative MDE | 20% Relative MDE | 30% Relative MDE |
|---|---|---|---|---|---|
| 1% | 229,126/day | 57,356/day | 25,523/day | 14,370/day | 6,403/day |
| 2% | 112,046/day | 28,086/day | 12,503/day | 7,041/day | 3,139/day |
| 5% | 41,817/day | 10,491/day | 4,671/day | 2,631/day | 1,174/day |
| 10% | 18,743/day | 4,704/day | 2,096/day | 1,181/day | 527/day |
| 20% | 7,314/day | 1,837/day | 819/day | 461/day | 206/day |

**How to read**: If you need more daily traffic than you have, you cannot run this test in 28 days at this MDE. Your options are listed below.

---

### When You Don't Have Enough Traffic

If the tables above show you need more traffic or time than you have, here are your alternatives, ranked from best to most compromised:

**1. Increase the MDE (detect only larger effects)**
Accept that you can only detect big wins. A 30% relative MDE means you will miss moderate improvements but catch home runs. This is appropriate when the change is low-cost to implement, so even a small chance of a big win justifies the test.

**2. Use CUPED or other variance reduction techniques**
CUPED (Controlled-experiment Using Pre-Experiment Data) uses each user's pre-experiment behavior as a covariate. This typically reduces variance by 30-50%, which is equivalent to increasing your sample size by 40-100%. Requires historical user-level data.

**3. Use a more sensitive metric**
Instead of purchase conversion rate, use add-to-cart rate, which has a higher baseline and is earlier in the funnel. Detect the effect there, then reason about the likely downstream impact on purchases. Caveat: this is a proxy, not the OEC itself.

**4. Combine with qualitative signals**
Run the test for as long as feasible, then combine the (underpowered) quantitative results with qualitative data: user testing, session recordings, survey feedback. This is not rigorous A/B testing, but it is better than no data.

**5. Use a different methodology entirely**
Consider: pre/post analysis with interrupted time series, within-subjects design (show both variants to the same users in sequence), or a fake-door test (measure interest without building the full experience).

**6. Accept the risk and ship without a test**
If the change is easily reversible, low-risk, and the opportunity cost of waiting is high, ship it and monitor. Set up a holdback group for long-term comparison. This is the "move fast" option and is legitimate for low-stakes changes.

**Rule of thumb**: If you need more than 8 weeks to reach sufficient sample, the test is probably not worth running as a classical A/B test. Explore alternatives.

---

## Part 10: Experimentation Benchmarks

### Win Rates by Test Type

These benchmarks are drawn from aggregated data across experimentation platforms (Optimizely, VWO, and published reports from Microsoft, Google, Booking.com, and others). "Win" means a statistically significant positive result on the primary metric.

| Test Type | Approximate Win Rate | Notes |
|---|---|---|
| Copy/messaging changes (headlines, CTAs, value props) | 25-35% | Highest win rate category. Low cost to implement. High velocity. |
| Layout/UX changes (page structure, navigation, component order) | 15-25% | Medium win rate. Results vary widely by magnitude of change. |
| Visual design changes (colors, imagery, typography) | 10-20% | Often fail to reach statistical significance (effects are small). |
| Pricing and offer structure | 10-20% | Lower win rate but higher impact when they win. Hard to test (requires careful OEC). |
| Algorithm/ranking changes | 20-30% | Highly dependent on domain. Search and recommendation tests are mature. |
| New features | 10-20% | Most new features do not move key metrics. The 1/3 rule applies. |
| Performance optimizations (speed, latency) | 30-40% | High win rate because the relationship between speed and conversion is well-established. |
| Removal/simplification tests | 25-35% | Removing friction often wins. Underused test category. |

**Meta-insight**: The overall win rate across ALL experiment types at mature organizations is approximately 30-35%. This means 65-70% of shipped ideas would not have improved the metric. This is the strongest argument for experimentation — it prevents you from shipping the 65-70% of changes that don't help (or actively hurt).

---

### Average Observed Lifts by Category

When a test DOES win, how large is the lift typically?

| Category | Typical Relative Lift (winners only) | Range (10th to 90th percentile) |
|---|---|---|
| Headlines / hero text | 5-20% | 2% to 40% |
| CTA button (text, color, placement) | 3-10% | 1% to 25% |
| Product page layout | 5-15% | 2% to 30% |
| Pricing page redesign | 10-30% | 3% to 50% |
| Checkout flow optimization | 5-15% | 2% to 25% |
| Search/recommendation algorithm | 1-5% | 0.5% to 10% |
| Page load speed improvement | 1-3% per 100ms saved | Varies by baseline speed |
| Form simplification | 10-25% | 5% to 50% |
| Social proof / trust signals | 3-12% | 1% to 20% |
| Personalization | 5-15% | 2% to 30% |

**Calibration note**: If your test shows a 200% lift, something is almost certainly wrong with the measurement. True lifts above 50% are exceptionally rare for incremental changes on established products. Outsized results should trigger an audit, not a celebration.

---

### False Positive Rates at Common Peeking Frequencies

If you check your experiment results at regular intervals and stop when p < 0.05, your ACTUAL false positive rate is much higher than 5%.

| Peeking Frequency | Test Duration | Actual False Positive Rate | Inflation Factor |
|---|---|---|---|
| Never (analyze once at end) | Any | 5.0% | 1.0x (correct) |
| Weekly | 4 weeks | 8-11% | 1.6-2.2x |
| Weekly | 8 weeks | 11-15% | 2.2-3.0x |
| Daily | 2 weeks | 15-20% | 3.0-4.0x |
| Daily | 4 weeks | 20-30% | 4.0-6.0x |
| Daily | 8 weeks | 25-35% | 5.0-7.0x |
| Multiple times per day | 4 weeks | 30-40%+ | 6.0-8.0x+ |

**Implication**: If you peek daily over a 4-week test and stop the first time you see p < 0.05, there is roughly a 1-in-4 chance your "winner" is actually no different from control. This is why peeking policies and sequential testing methods exist.

**Mitigation approaches**:
- **Pre-commit to duration**: The simplest approach. Set the end date and do not look at the primary metric until then.
- **Sequential testing (alpha spending)**: O'Brien-Fleming or Pocock boundaries let you check at pre-defined intervals while controlling the overall false positive rate. Costs 20-30% more sample.
- **Always-valid confidence intervals**: Bayesian or anytime-valid methods that maintain correct coverage no matter when you check. Growing in popularity.

---

### Typical Test Duration by Industry

| Industry | Median Test Duration | Reason |
|---|---|---|
| Large ecommerce (>1M monthly visitors) | 2-3 weeks | High traffic enables fast sample accrual |
| Mid-size ecommerce (100K-1M monthly visitors) | 3-5 weeks | Moderate traffic; need to balance speed and power |
| Small ecommerce (<100K monthly visitors) | 4-8 weeks | Low traffic; often underpowered |
| SaaS (B2B, free trial model) | 4-8 weeks | Low conversion events; long sales cycles |
| SaaS (B2C, self-serve) | 2-4 weeks | Higher volume, shorter decision cycles |
| Media / content sites | 1-2 weeks | Very high traffic; engagement metrics are sensitive |
| Marketplace (two-sided) | 4-6 weeks | Need to measure effects on both supply and demand sides |
| Financial services | 4-8 weeks | Regulatory requirements; lower traffic on key conversion pages |
| Mobile apps | 3-6 weeks | App store update cycles; need to account for update adoption lag |

---

### What Good Looks Like: Experimentation Program Benchmarks

**Crawl stage** (first 6 months):
- Tests per month: 1-3
- Win rate: Often inflated (20-50%) because you are testing the most obvious opportunities
- Cumulative validated lift: Establishing baselines
- Team capability: 1-2 people can set up and analyze tests

**Walk stage** (6-18 months):
- Tests per month: 5-15
- Win rate: 25-35% (settling to realistic levels)
- Cumulative validated lift: 5-15% improvement in primary metric per year
- Team capability: Dedicated experimentation analyst; standardized analysis templates

**Run stage** (18-36 months):
- Tests per month: 15-50
- Win rate: 20-30% (diminishing returns on obvious wins; testing more nuanced hypotheses)
- Cumulative validated lift: 10-25% improvement in primary metric per year
- Team capability: Experimentation platform; self-service for product teams; searchable experiment history

**Fly stage** (36+ months):
- Tests per month: 50-200+
- Win rate: 15-25% (testing increasingly marginal hypotheses)
- Cumulative validated lift: 15-30% improvement in primary metric per year (compounding smaller wins)
- Team capability: Full experimentation platform team; ML-assisted analysis; automated guardrail monitoring; interleaving and multi-armed bandits for specific use cases

**Compounding math**: If you run 10 tests/month with a 25% win rate and average winners produce 3% relative lift:
- 10 tests x 12 months = 120 tests/year
- 120 x 25% = 30 winners
- Cumulative lift = (1.03)^30 - 1 = 143% - 1 = 143% ... but this overstates it because not all wins are independent. Realistic compounding with overlap and interaction effects: expect 15-30% annual cumulative lift for a healthy program.

**Red flags in an experimentation program**:
- Win rate >50%: You are only testing sure things. Test bolder hypotheses.
- Win rate <10%: Your idea generation or prioritization is poor. Improve upstream research.
- Average test duration >6 weeks: You may have insufficient traffic or are testing effects that are too small.
- No inconclusive results: You are not testing uncertain-enough hypotheses. If you always know the answer before the test, you are not learning.
- No negative results: Either you are not running risky tests, or you are not reporting losses honestly.
- Zero tests killed mid-flight: You are not monitoring guardrails.
