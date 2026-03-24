# Data Storytelling & Communication

---

## Table of Contents

- [Why Data Storytelling Matters](#why-data-storytelling-matters)
- [Cross-References Table](#cross-references-table)
- [Part 1: Structuring Data Communication](#structuring-data-communication)
- [Part 2: Visualization Principles](#visualization-principles)
- [Part 3: Presenting to Different Audiences](#presenting-to-different-audiences)
- [Part 4: Common Data Communication Mistakes](#common-data-communication-mistakes)
- [Part 5: Building Data Narratives](#building-data-narratives)
- [Part 6: Dashboards and Reporting](#dashboards-and-reporting)
- [Part 7: Before/After Visualization Examples](#part-7-beforeafter-visualization-examples)
- [Part 8: Presentation Quality Scorecard](#part-8-presentation-quality-scorecard)
- [Part 9: Dashboard Audit Checklist](#part-9-dashboard-audit-checklist)
- [Part 10: Worked Data Narrative](#part-10-worked-data-narrative)
- [Part 11: Chart Selection Decision Tree](#part-11-chart-selection-decision-tree)

---

## Cross-References Table

### Within Data Analysis Skill

| Reference File | Relationship to Data Storytelling | When to Cross-Reference |
|---|---|---|
| `metrics-frameworks.md` | Defines the KPIs and metrics you'll be communicating | When choosing which metrics to feature in a narrative or dashboard |
| `experimentation.md` | Provides the experiment results you need to present | When communicating A/B test results, statistical significance, and recommendations |
| `statistical-foundations.md` | Underpins the statistical claims in your data stories | When showing confidence intervals, p-values, or uncertainty in visualizations |
| `optimization-methodology.md` | Frameworks for the improvement stories data often tells | When presenting optimization results or recommending next experiments |
| `measurement-principles.md` | Ensures the data you're presenting is measured correctly | When validating data quality before building a narrative around it |

### Related Skills

| Skill | Reference File | Connection |
|---|---|---|
| **Business Strategy** | `mental-models.md` | Use mental models to frame data insights for strategic audiences |
| **Business Strategy** | `competitive-strategy.md` | Competitive benchmarks provide context for your metrics |
| **Deep Thinking** | `decision-frameworks.md` | Data storytelling ultimately serves decision-making; these frameworks structure the "so what?" |
| **Deep Thinking** | `cognitive-biases.md` | Know which biases affect how audiences interpret data (anchoring, confirmation bias, base rate neglect) |
| **Deep Thinking** | `forecasting-and-probability.md` | Communicating forecasts and probabilities is a specialized storytelling challenge |
| **Deep Thinking** | `systems-thinking.md` | Helps trace causal chains in data narratives (the "and then what?" chain) |
| **Elite Copywriting** | `frameworks.md` | Persuasion frameworks (PAS, AIDA) apply to structuring data presentations |
| **Elite Copywriting** | `psychology.md` | Psychology of persuasion applies directly to how you frame data for action |
| **Research & Market Analysis** | `market-analysis.md` | Market data provides external benchmarks for internal metrics |
| **Funnel Architecture** | `funnel-types.md` | Funnel visualizations are a core data storytelling pattern |
| **Brand Voice** | `messaging-architecture.md` | Consistent messaging principles apply to how you frame recurring reports |

---

## Why Data Storytelling Matters

Data that isn't communicated effectively doesn't change decisions. The gap between "having the data" and "acting on the data" is almost always a communication gap, not an analysis gap.

**The three elements of data storytelling**:
1. **Data** — the evidence (accurate, relevant, trustworthy)
2. **Narrative** — the interpretation (what does it mean? what should we do?)
3. **Visuals** — the presentation (making patterns visible and intuitive)

All three must work together. Data without narrative is a spreadsheet. Narrative without data is an opinion. Visuals without either is decoration.

## Structuring Data Communication

### The Pyramid Principle (Minto)
**Lead with the conclusion, not the analysis.**

Bad: "We looked at 12 months of data, segmented by channel, and found that mobile traffic increased 34% while desktop declined 8%, and when we crossed that with conversion data..."

Good: "Mobile now drives 60% of our revenue, up from 40% last year. We should shift 30% of our desktop optimization budget to mobile CRO. Here's the evidence."

### The SCR Framework (Situation-Complication-Resolution)
1. **Situation**: What's the context? What does the audience already know?
2. **Complication**: What changed? What's the problem or opportunity the data reveals?
3. **Resolution**: What should we do? What does the data recommend?

### The Five Questions Every Data Presentation Must Answer
1. **So what?** — Why should the audience care?
2. **Compared to what?** — Is this good or bad? Relative to what benchmark?
3. **Says who?** — How reliable is this data? What are the limitations?
4. **What's the recommendation?** — Don't just inform, propose an action
5. **What happens if we do nothing?** — Make the cost of inaction concrete

## Visualization Principles

### Choosing the Right Chart

| Data Relationship | Best Chart Type |
|---|---|
| **Comparison** across categories | Bar chart (horizontal if labels are long) |
| **Trend** over time | Line chart |
| **Part-to-whole** | Stacked bar, treemap (avoid pie charts for >3 segments) |
| **Distribution** | Histogram, box plot, violin plot |
| **Correlation** between variables | Scatter plot |
| **Composition** over time | Stacked area chart |
| **Funnel/flow** | Funnel chart, Sankey diagram |
| **Geographic** | Choropleth map |

### Visualization Best Practices
1. **Remove chartjunk**: No 3D effects, no unnecessary gridlines, no decorative elements that don't encode data
2. **Label directly**: Put labels on the data, not in a separate legend
3. **Maximize data-ink ratio**: Every pixel should communicate data
4. **Use color intentionally**: Highlight the key insight, grey out the context
5. **Start y-axis at zero** for bar charts (but not necessarily for line charts)
6. **Show uncertainty**: Error bars, confidence bands, or ranges — don't imply false precision
7. **Make comparisons easy**: Put compared items close together, use the same scale

### The "What Changed" Principle
The most effective data visualizations highlight WHAT CHANGED:
- Annotation arrows pointing to the inflection point
- Before/after comparisons with the delta highlighted
- Trend lines with the break clearly marked
- Color change at the moment of intervention

## Presenting to Different Audiences

### To Executives
- **Lead with the business impact** (revenue, cost, risk, opportunity)
- **One key number per slide** — if they remember nothing else, what should they remember?
- **Show the recommendation upfront** — they'll ask "what should we do?" within 30 seconds
- **Keep it to 3-5 slides** — they'll ask for detail if they want it
- **Anticipate the "why"** — be prepared to drill down, but don't lead with the drill-down

### To Product/Engineering Teams
- **Lead with the user behavior** (what users did, not what the metrics say)
- **Show the method** — they want to know it's rigorous
- **Include edge cases and caveats** — they think in terms of failure modes
- **Connect to their roadmap** — "this data suggests Feature X should be prioritized"
- **Provide the raw data access** — they may want to explore themselves

### To Marketing/Sales Teams
- **Lead with the customer story** — segments, personas, journeys
- **Show channel performance** — what's working, what's not, what to try
- **Make it actionable by campaign** — "next month, increase spend on X, test Y"
- **Compare to targets/forecasts** — they think in terms of hitting goals
- **Include competitive context** — benchmarks, market position

## Common Data Communication Mistakes

### 1. The Data Dump
Showing every metric and letting the audience "draw their own conclusions." They won't. They'll either tune out or cherry-pick the number that supports their existing belief.

### 2. The Insight Without Action
"Churn increased 3% last month." So what? What should we do about it? Every data insight should end with a recommendation or a next step.

### 3. The Misleading Visualization
- Truncated y-axis that makes small changes look dramatic
- Dual y-axes that create false correlations
- Cherry-picked time ranges that hide context
- Pie charts with too many slices
- Maps where area distorts perception of value

### 4. The Context-Free Number
"We had 10,000 signups last month." Is that good? Bad? Growing? Declining? Compared to what? A number without context is not information.

### 5. The Precision Trap
Reporting "NPS is 47.3" when the margin of error is ±5. False precision implies a level of certainty that doesn't exist and makes small fluctuations seem meaningful.

## Building Data Narratives

### The Comparison Anchor
Every number needs a comparator:
- **Time**: vs. last month, last quarter, last year
- **Target**: vs. goal, forecast, benchmark
- **Segment**: vs. other segments, cohorts, markets
- **Competition**: vs. industry average, competitors

### The "And Then What?" Chain
Don't stop at the first-order insight. Trace the causal chain:
- "Trial-to-paid conversion dropped 5%"
- → "Because onboarding completion fell 10%"
- → "Because the new step 3 has a 40% drop-off"
- → "Because it requires a credit card before showing value"
- → **Recommendation**: Move credit card collection to after the first "aha moment"

### The Confidence Scale
When presenting findings, be explicit about confidence:
- **High confidence**: Multiple data sources converge, large sample, consistent over time
- **Medium confidence**: One solid data source, reasonable sample, some time coverage
- **Low confidence**: Single data point, small sample, or new phenomenon
- **Hypothesis only**: No direct data yet, based on analogies or theory

## Dashboards and Reporting

### Dashboard Design Principles
1. **One dashboard, one audience, one purpose** — don't try to serve everyone
2. **Hierarchy of information**: The most important metric is the largest, most prominent element
3. **Real-time vs. periodic**: Don't make everything real-time. Most metrics are better digested daily or weekly.
4. **Contextual defaults**: Show the most useful time range by default, with drill-down available
5. **Alert-worthy thresholds**: Use color (red/yellow/green) only for metrics that have meaningful thresholds

### The Good Metric Test (Lean Analytics)
A good metric is:
- **Comparative**: Compared to another time period, segment, or benchmark
- **Understandable**: People remember it and discuss it
- **A ratio or rate**: Not an absolute number
- **Behavior-changing**: If the metric moves, you change what you do

### Reporting Cadence
| Frequency | Content | Audience |
|---|---|---|
| **Real-time** | System health, error rates, conversion (if high-traffic) | Engineering, ops |
| **Daily** | Key funnel metrics, campaign performance, anomaly flags | Product, marketing |
| **Weekly** | Cohort trends, experiment results, feature adoption | Product, leadership |
| **Monthly** | Business metrics, unit economics, strategic KPIs | Executive, board |
| **Quarterly** | Market position, strategic goals, forecast vs. actual | Executive, investors |

---

## Part 7: Before/After Visualization Examples

The fastest way to internalize good data communication is to see the same data presented badly and then presented well. Below are four common scenarios with detailed breakdowns.

---

### Example 1: Monthly Revenue Trend

**THE BAD VERSION**

A 3D bar chart showing 12 months (Jan-Dec) with each bar a different color from the rainbow spectrum (red, orange, yellow, green, cyan, blue, indigo, violet, magenta, lime, teal, pink). The y-axis has no label and no dollar sign — just numbers like "200" and "400" with no indication of scale (hundreds? thousands? millions?). The x-axis shows abbreviated months but they overlap because the 3D perspective compresses them. The title reads "Revenue Data." There is a legend mapping each color to its month, taking up a quarter of the chart area.

**What's wrong (5 specific problems):**

1. **3D distortion destroys accurate reading.** The perspective effect makes bars in the back appear shorter than bars in the front even when they represent the same value. Readers cannot accurately compare bar heights, which is the entire point of a bar chart.
2. **Rainbow color scheme encodes no information.** Each month gets a different color, but color is being used to encode a variable (month) that is already encoded by position on the x-axis. This is pure redundancy that adds visual noise. Worse, the color differences imply categorical distinctions between months that may not exist.
3. **Missing axis labels and units.** Without a "$" or "Revenue ($K)" label on the y-axis, the reader has no idea what the numbers represent. Is 400 four hundred dollars or four hundred thousand? This forces the audience to ask a clarifying question instead of absorbing the insight.
4. **Non-descriptive title.** "Revenue Data" tells the reader nothing they don't already know from looking at the chart. It fails to communicate what the data means, what changed, or why they should care.
5. **Unnecessary legend consuming space.** A legend mapping 12 colors to 12 months is visual clutter. The months are already labeled on the x-axis. This legend consumes 25% of the chart area while adding zero information.

**THE GOOD VERSION**

A clean line chart with a single dark blue line tracing monthly revenue from January through December. The y-axis is labeled "Monthly Revenue ($K)" and runs from $0 to $500K with light horizontal gridlines at $100K intervals. Each month is clearly labeled on the x-axis with no overlap. A vertical dashed annotation line sits at June with the label "Pricing change launched June 1." The line visibly inflects upward after June. The title reads: **"Revenue grew 34% after pricing change in June — from $280K/mo average to $375K/mo."** A subtle grey band shows the pre-change average ($280K) extending across the full chart as a baseline reference.

**What's right (5 specific improvements):**

1. **Line chart is the correct chart type for time series.** A line chart naturally communicates trend and trajectory. The connected line makes it effortless to see the direction of change, which is the primary insight here. Bar charts fragment time into discrete buckets and hide the continuity.
2. **Annotated inflection point tells the story.** The dashed vertical line at June with the "Pricing change" label immediately connects cause and effect. The reader does not need to guess why revenue changed — the chart answers that question visually.
3. **Clear axis labels and units eliminate ambiguity.** "$K" on the y-axis instantly communicates scale. The reader knows they are looking at thousands of dollars without asking. Light gridlines provide reference points without cluttering.
4. **Insight-driven title communicates the takeaway.** "Revenue grew 34% after pricing change in June" is a complete sentence that tells the reader exactly what happened and why it matters. If they read nothing else, they got the message.
5. **Baseline reference provides context.** The grey band showing the pre-change average ($280K) gives the post-change numbers a comparison anchor. The reader can see the magnitude of the shift immediately rather than mentally computing it.

---

### Example 2: Conversion Rate by Channel

**THE BAD VERSION**

A pie chart divided into 8 slices representing different marketing channels (Organic Search, Paid Search, Social Organic, Social Paid, Email, Direct, Referral, Affiliate). The slices use similar shades of blue and green, making it nearly impossible to distinguish Organic Search from Referral or Social Organic from Email. No values or percentages are shown on the chart itself. A separate legend lists the 8 channels with small color swatches that are difficult to match to the slices. The title is "Channel Breakdown."

**What's wrong:**

- Pie charts are poor for comparing values that are close in magnitude. The human eye is bad at comparing arc angles and slice areas.
- Eight slices is too many. With 8 segments, several are small enough that they compress into slivers that are unreadable.
- Similar colors make differentiation impossible. When Organic Search (dark teal) and Referral (medium teal) are adjacent, the reader cannot tell which is which.
- No values on the chart forces the reader to estimate from the legend and the angle, an imprecise and frustrating exercise.
- "Channel Breakdown" as a title says nothing about conversion or performance — it could describe traffic, revenue, or anything.

**THE GOOD VERSION**

A horizontal bar chart with channels sorted from highest to lowest conversion rate. Each bar is a consistent medium blue. To the right of each bar, two numbers are displayed: the conversion rate as a percentage (e.g., "4.2%") and the absolute number of conversions (e.g., "1,247 conversions"). The title reads: **"Email converts at 3x the rate of paid social — and at 1/5 the cost per conversion."** A vertical dashed reference line marks the overall blended conversion rate (2.8%) so the reader can instantly see which channels are above and below average.

**What's right:**

- Horizontal bars allow easy comparison of lengths, especially when there are many categories. The sorted order makes ranking immediately obvious.
- Dual labeling (percentage and absolute) prevents the "high rate, low volume" trap. A channel might convert at 8% but only have 30 total conversions — showing both numbers lets the reader assess significance.
- Sorted order encodes ranking without requiring the reader to visually compare bar lengths across distance. The best performer is at the top, the worst at the bottom.
- The reference line (blended average) provides the context anchor. Channels above the line are outperforming; channels below are underperforming. This binary above/below reading is instant.
- The insight-driven title highlights the actionable comparison (Email vs. Paid Social) rather than simply describing the chart type.

---

### Example 3: A/B Test Results

**THE BAD VERSION**

A single line in a report or Slack message: *"Variant B won with p=0.03."*

**What's wrong:**

- No effect size. Knowing that Variant B "won" tells you nothing about the magnitude. Did conversion go from 2.0% to 2.1% (trivially small) or from 2.0% to 3.5% (transformative)? Statistical significance and practical significance are different things.
- No confidence interval. A p-value of 0.03 could correspond to a very wide confidence interval (high uncertainty about the true effect size) or a narrow one. Without the interval, you cannot assess how reliable the point estimate is.
- No business impact translation. Even if you know the effect size, you need to translate it to dollars, customers, or some business unit. "0.5 percentage point lift" means nothing until you say "that's $42K/month in additional revenue."
- No sample size or duration context. Was this test run on 200 users over 2 days or 20,000 users over 4 weeks? The former is far more likely to be a false positive.
- No decision recommendation. The stakeholder has to figure out what to do next. Should they ship Variant B to 100% of users? Run the test longer? Test a more extreme variant?

**THE GOOD VERSION**

A structured results summary with a visualization:

**Headline**: "Variant B increases checkout completion by 1.8 percentage points — estimated $52K/month in additional revenue. Recommend shipping to 100%."

**Visual**: A horizontal chart showing two bars (Variant A and Variant B) with confidence intervals displayed as whisker lines extending from each bar. The bars show the point estimates (A: 12.4%, B: 14.2%) and the confidence intervals (A: 11.8%-13.0%, B: 13.4%-15.0%). The intervals do not overlap, visually confirming the statistical significance. A subtle annotation reads "95% CI, n=18,400 per variant, 21-day test."

**Context table**:

| Metric | Variant A (Control) | Variant B (Test) | Difference | 95% CI of Difference |
|---|---|---|---|---|
| Checkout completion rate | 12.4% | 14.2% | +1.8 pp | [+1.0 pp, +2.6 pp] |
| Revenue per visitor | $4.12 | $4.78 | +$0.66 | [+$0.31, +$1.01] |
| Est. monthly revenue impact | — | — | +$52K/mo | [+$24K, +$80K] |

**Decision recommendation**: "Ship Variant B to 100% of traffic. Even at the low end of the confidence interval (+$24K/mo), the change is profitable. No negative impact observed on average order value, return rate, or support ticket volume. Secondary metrics monitored: page load time (no change), error rate (no change)."

**What's right:**

- Confidence intervals make uncertainty visible. The reader can see the range of plausible outcomes, not just the point estimate.
- Effect size is stated in practical units (percentage points, dollars) so stakeholders can evaluate business significance independently of statistical significance.
- Revenue impact translates the abstract lift into dollars, which is the language executives speak.
- The recommendation is explicit and justified, including the reasoning ("even at the low end, it's profitable").
- Secondary metrics are monitored and reported, showing rigor and building trust that nothing was broken by the change.

---

### Example 4: Cohort Retention

**THE BAD VERSION**

A plain table of numbers with no formatting:

```
        Week 0  Week 1  Week 2  Week 3  Week 4  Week 5  Week 6
Jan     1000    420     310     280     250     230     210
Feb     1100    380     290     240     210     190     -
Mar     950     350     260     220     190     -       -
Apr     1200    510     390     340     -       -       -
May     1050    440     330     -       -       -       -
Jun     980     410     -       -       -       -       -
```

**What's wrong:**

- Raw numbers make it impossible to compare cohorts of different sizes. January's 420 Week 1 retention looks higher than March's 350 — but January started with 1000 users and March with 950. In percentage terms, January retained 42% and March retained 36.8%. The raw numbers obscure this.
- No formatting means the reader's eye has no guidance. All numbers look equally important. There is no visual hierarchy, no indication of which cells are good or bad.
- No trend indicators. Is retention improving or degrading over time? The reader must manually compute percentages and compare across rows to answer this question.
- Missing data (the dashes) creates jagged visual holes that make the table harder to scan.
- No summary row or column aggregating the key takeaway.

**THE GOOD VERSION**

A color-coded heatmap table where each cell shows the retention percentage and is shaded on a gradient from deep red (low retention, <20%) through yellow (moderate, ~35%) to deep green (high retention, >45%). Percentages are displayed in each cell. The cohort size (starting N) is shown in a separate left-most column so retention rates are the focus.

```
Cohort    N       Week 0   Week 1    Week 2    Week 3    Week 4    Week 5    Week 6
Jan      1,000   100%     42.0%     31.0%     28.0%     25.0%     23.0%     21.0%
Feb      1,100   100%     34.5%     26.4%     21.8%     19.1%     17.3%     --
Mar        950   100%     36.8%     27.4%     23.2%     20.0%     --        --
Apr      1,200   100%     42.5%  ^  32.5%  ^  28.3%  ^  --        --        --
May      1,050   100%     41.9%  ^  31.4%  ^  --        --        --        --
Jun        980   100%     41.8%  ^  --        --        --        --        --

Trend:           --       Improving ^ since April (onboarding revamp launched March 28)
```

**What's right:**

- Percentages normalize for cohort size, making cross-cohort comparison meaningful and immediate.
- Color coding creates an instant visual pattern. The reader can see at a glance that the lower-left triangle is greener than the upper-right, indicating improving retention for newer cohorts.
- Trend arrows (^) call out the improvement and a footnote explains the cause (onboarding revamp), connecting the data to a business action.
- Cohort size (N) is preserved but separated, so the reader can assess statistical significance without cluttering the retention view.
- A summary trend line at the bottom tells the reader the key takeaway without requiring them to compute it themselves.

---

## Part 8: Presentation Quality Scorecard

Use this 12-item audit to evaluate any data presentation before it goes to its audience. Score each item from 1 to 5, then total the score for an overall quality assessment.

---

### Category 1: Story Structure

**Item 1: Has a clear narrative arc**

| Score | Description |
|---|---|
| 1 | No narrative. Just charts and tables with no connecting thread. |
| 2 | Some attempt at organization, but the reader cannot state the main point after viewing. |
| 3 | Has a beginning, middle, and end, but the central message is buried in the middle somewhere. |
| 4 | Clear narrative that builds to a conclusion. Most readers would agree on the main takeaway. |
| 5 | Compelling story structure (SCR or Pyramid) where each element builds on the last. The takeaway is unmistakable and memorable. |

**Item 2: Leads with insight, not methodology**

| Score | Description |
|---|---|
| 1 | Opens with "We pulled the data from..." or "Here's what I looked at." The audience is asleep by slide 3. |
| 2 | Methodology is front-loaded but the insight eventually appears. |
| 3 | Insight is presented early but equal weight is given to how the analysis was done. |
| 4 | Leads with the key insight. Method is available in appendix or on request. |
| 5 | The very first sentence/slide is the actionable insight. Methodology is invisible unless questioned — and then it's rigorous. |

**Item 3: Answers "so what?" explicitly**

| Score | Description |
|---|---|
| 1 | Presents numbers with no interpretation. The audience has to figure out the implications themselves. |
| 2 | Vague implications ("this might mean we should look into..."). |
| 3 | Clear interpretation but no specific recommendation or next step. |
| 4 | Interpretation plus a concrete recommendation backed by the data. |
| 5 | Interpretation, recommendation, expected impact of the recommendation, and cost of inaction — all made explicit. |

---

### Category 2: Visual Design

**Item 4: Uses the right chart type for the data**

| Score | Description |
|---|---|
| 1 | Fundamentally wrong chart type (pie chart for time series, bar chart for correlation). |
| 2 | Passable chart type but a better option clearly exists (grouped bar instead of line for trend data). |
| 3 | Correct chart type but with unnecessary variations (3D, exploded slices, excessive colors). |
| 4 | Correct chart type, cleanly executed, appropriate for the data and the question. |
| 5 | Optimal chart type that makes the specific insight visually obvious. Chart type was clearly chosen to serve the narrative, not default software output. |

**Item 5: Minimal chartjunk and high data-ink ratio**

| Score | Description |
|---|---|
| 1 | Gratuitous 3D effects, background images, decorative elements, heavy gridlines, and unnecessary borders. More ink is spent on non-data than data. |
| 2 | Some chartjunk present (unnecessary gridlines, thick borders, decorative legend box). |
| 3 | Reasonably clean but with a few elements that could be removed (extra gridlines, redundant legend). |
| 4 | Clean design. Everything visible encodes data or provides essential context. |
| 5 | Tufte-level data-ink ratio. Every pixel earns its place. The chart is as simple as possible but not simpler. |

**Item 6: Clear labels and consistent formatting**

| Score | Description |
|---|---|
| 1 | Missing axis labels, no units, inconsistent number formats, overlapping text. |
| 2 | Labels present but incomplete (e.g., y-axis label missing, or units not specified). |
| 3 | All labels present but formatting is inconsistent across charts (different date formats, mixed units). |
| 4 | All labels clear, units specified, consistent formatting throughout. |
| 5 | Labels are clear, directly placed on data where possible (no legend needed), formatting is impeccably consistent, and annotation is used to highlight key data points. |

---

### Category 3: Statistical Integrity

**Item 7: Uncertainties and limitations are shown**

| Score | Description |
|---|---|
| 1 | No mention of uncertainty. Point estimates presented as facts. Limitations hidden or unacknowledged. |
| 2 | Limitations mentioned in passing but not quantified. No error bars or confidence intervals. |
| 3 | Confidence intervals or error bars shown on key charts. Some limitations noted. |
| 4 | Uncertainty is visible on all relevant charts. Limitations clearly stated. Sample sizes disclosed. |
| 5 | Uncertainty is a first-class element of the presentation. Confidence levels explicit. Limitations proactively addressed. The audience knows exactly how much to trust each finding. |

**Item 8: Appropriate precision, no cherry-picking**

| Score | Description |
|---|---|
| 1 | False precision (NPS of 47.3 with n=50). Cherry-picked time ranges or segments that make the data say what the presenter wants. |
| 2 | Precision is sometimes inappropriate. Time ranges or segments are selectively chosen without justification. |
| 3 | Precision is mostly appropriate. Time ranges are reasonable but not explicitly justified. |
| 4 | Precision matches the data quality. Time ranges and segments are justified. Counter-evidence is acknowledged. |
| 5 | Precision is carefully calibrated to the sample and method. Time ranges are transparently chosen. The presenter actively shows data that complicates the narrative, building trust. |

**Item 9: Comparisons are fair and contextualized**

| Score | Description |
|---|---|
| 1 | Numbers presented without any comparison. Or comparisons that are misleading (different time periods, different definitions, apples-to-oranges). |
| 2 | Some comparisons but they lack context (vs. last month, but last month was anomalous). |
| 3 | Fair comparisons with basic context (vs. same period last year). |
| 4 | Multiple relevant comparisons (vs. target, vs. last year, vs. industry benchmark). Context is provided for anomalies. |
| 5 | Comparisons are multi-dimensional, fair, and contextually rich. Seasonal effects, anomalies, and external factors are accounted for. The audience has full context to evaluate the numbers. |

---

### Category 4: Audience Fit

**Item 10: Complexity matched to audience**

| Score | Description |
|---|---|
| 1 | Presents regression coefficients to the marketing team, or oversimplifies to "revenue is up" for the data science team. Complete mismatch. |
| 2 | Partially adapted but still too technical or too simple for the audience. |
| 3 | Reasonable match but the presenter would benefit from knowing more about the audience's data literacy. |
| 4 | Well-matched to the audience. Technical depth is appropriate. Drill-down available for those who want it. |
| 5 | Perfectly calibrated. The audience feels respected — not talked down to, not overwhelmed. The level of detail is exactly what they need to make their decisions. |

**Item 11: Jargon level appropriate**

| Score | Description |
|---|---|
| 1 | Heavy use of statistical or technical jargon with no definitions. Or condescending over-explanation of basics to an expert audience. |
| 2 | Some jargon that isn't defined. Or occasional unnecessary simplification. |
| 3 | Mostly accessible but a few terms may confuse non-technical audience members. |
| 4 | Jargon is minimal and defined when used. Technical terms are translated to business terms. |
| 5 | Language is perfectly matched to the audience. Technical concepts are translated seamlessly. The presentation could be understood by a smart newcomer to the company without losing value for experts. |

**Item 12: Action items are clear and specific**

| Score | Description |
|---|---|
| 1 | No action items. The presentation ends with "any questions?" and the audience wonders why they were in the room. |
| 2 | Vague recommendations ("we should look into this more"). |
| 3 | Clear recommendations but no owner, timeline, or expected impact. |
| 4 | Specific recommendations with owners and timelines. Expected impact estimated. |
| 5 | Prioritized action items with owners, timelines, expected impact, resource requirements, and success criteria. The next meeting to review progress is already proposed. |

---

### Score Interpretation

| Total Score | Rating | Meaning |
|---|---|---|
| 12-29 | **Needs Major Revision** | The presentation has fundamental problems in structure, design, statistical integrity, or audience fit. It risks confusing the audience, eroding trust, or leading to wrong decisions. Do not present until significant rework is complete. |
| 30-44 | **Decent** | The presentation communicates its point and is unlikely to mislead, but it leaves value on the table. The narrative could be sharper, the visuals cleaner, or the recommendations more specific. Worth iterating on if stakes are high. |
| 45-60 | **Excellent** | The presentation is clear, compelling, statistically sound, and perfectly matched to its audience. It will drive decisions and build the presenter's credibility. This is the standard to aim for in high-stakes presentations (board meetings, major strategy shifts, funding requests). |

**How to use this scorecard:**
- Self-audit before presenting. Score yourself honestly and fix anything below a 3.
- Peer review. Have a colleague score your presentation independently and compare notes.
- Post-mortem. After presenting, score the presentation based on audience reactions and questions. Did they understand the main point? Did they ask about things that should have been in the presentation? Did they take the recommended action?

---

## Part 9: Dashboard Audit Checklist

Use this checklist to evaluate any existing dashboard. The goal is to ensure every dashboard earns its existence by informing decisions, not just displaying data.

---

### 15-Criteria Evaluation

Score each criterion as Pass, Partial, or Fail.

**Criteria 1: Has a clear primary metric.**
The dashboard has one metric that is visually dominant — the largest number, the top-left position, the boldest font. If a viewer glances at the dashboard for 3 seconds, they should know the single most important number. Dashboards without a clear primary metric are trying to say everything and end up saying nothing.

**Criteria 2: Loads in under 5 seconds.**
A dashboard that takes 30 seconds to load will not be checked regularly. If it is not checked regularly, it does not influence decisions. Performance is not a technical nicety; it is a prerequisite for utility. If the dashboard is slow, reduce the data range, pre-aggregate, cache, or simplify.

**Criteria 3: Uses consistent time ranges across all charts.**
If the revenue chart shows "last 12 months" but the churn chart shows "last 90 days" and the funnel chart shows "this month," comparisons across charts are meaningless. All charts on a single dashboard view should share the same time range by default, with the ability to override globally.

**Criteria 4: Has comparison context (vs. last period, vs. target).**
Every metric should be shown alongside at least one comparator: prior period, target, forecast, or benchmark. A number in isolation is not information. "Revenue: $240K" is a fact. "Revenue: $240K (target: $260K, -8%)" is information. "Revenue: $240K (target: $260K, -8%, same shortfall as last month)" is context.

**Criteria 5: No more than 7-10 metrics visible at once.**
Research on working memory (Miller's Law) suggests humans can hold approximately 7 items in working memory at once. A dashboard with 25 charts overwhelms the viewer and buries the signal in noise. If you need more than 10 metrics, create drill-down views rather than cramming everything onto one screen.

**Criteria 6: Color is used meaningfully and sparingly.**
Red/yellow/green is appropriate for metrics with clear thresholds (SLA compliance, budget utilization). It is not appropriate for metrics without thresholds (total users, page views). If everything is colored, nothing stands out. Reserve color for metrics that demand attention when they change.

**Criteria 7: Metric definitions are accessible.**
Every metric on the dashboard should have a tooltip, footnote, or linked glossary that explains: what the metric measures, how it is calculated, what data source it uses, and what a "good" value looks like. If team members disagree about what a metric means, the dashboard is creating confusion, not clarity.

**Criteria 8: The dashboard has a defined owner.**
Someone is responsible for ensuring the dashboard is accurate, up-to-date, and relevant. If no one owns it, it will gradually decay: data sources will break, metrics will become irrelevant, and formatting will drift. An ownerless dashboard is a dashboard on its way to being ignored.

**Criteria 9: Filters and segments are available but not required.**
The default view should tell a complete story without any user interaction. Filters (by segment, region, product line) should be available for deeper exploration but should not be required to understand the primary message. If the dashboard is meaningless until you apply three filters, the defaults are wrong.

**Criteria 10: Trends are shown, not just snapshots.**
A single number (today's conversion rate: 3.2%) is far less useful than a trend (conversion rate over the last 30 days, currently 3.2%, down from 3.8% two weeks ago). Trends reveal trajectory and anomalies. Snapshots hide them. Default to showing at least 30 days of trend for any metric.

**Criteria 11: Annotations mark significant events.**
When the company launched a new feature, changed pricing, ran a major campaign, or experienced an outage, those events should be marked on the relevant time series. Without annotations, stakeholders waste time asking "what happened on March 12?" and the answer is always "let me check."

**Criteria 12: No vanity metrics.**
Vanity metrics make you feel good but do not inform decisions. Total registered users (always goes up), total page views (without context), cumulative revenue (never decreases). If a metric cannot go down — or if nobody would change their behavior regardless of its value — it does not belong on a dashboard. Replace with rates, ratios, and per-unit metrics.

**Criteria 13: Mobile-accessible or has a summary alert.**
Executives and on-call engineers need to check dashboards from their phones. If the dashboard is not responsive, provide a daily/weekly summary email or Slack alert with the key metrics. The information must reach the decision-maker where they are, not where the dashboard is.

**Criteria 14: Data freshness is visible.**
The dashboard should show when the data was last updated (e.g., "Last refreshed: 2 hours ago"). Stale data presented as current is worse than no data at all. If the data pipeline breaks, the dashboard should make the staleness obvious rather than showing yesterday's numbers with today's date.

**Criteria 15: Drill-down paths are logical.**
From the top-level view, users should be able to click into more detail in a logical hierarchy: company-level to team-level to campaign-level, or overall funnel to specific step to specific segment. The drill-down path should follow the questions the viewer naturally asks: "Why is this number off?" leads to the next level of detail.

---

### Dashboard Smell Tests

These three questions cut through dashboard complexity. If you can answer them honestly, you will quickly separate valuable dashboards from decorative ones.

**Smell Test 1: "Does anyone actually change a decision based on this dashboard?"**

Ask the primary users of the dashboard: "In the last 30 days, did this dashboard cause you to do something differently than you otherwise would have?" If the answer is no — if the dashboard is checked out of habit but never triggers action — then the dashboard is not adding value. It is consuming engineering resources to maintain, analyst time to build, and viewer attention to check, all for zero decision impact.

**What to do if it fails**: Talk to the intended audience. Find out what decisions they actually make on a weekly basis. Rebuild the dashboard around those decisions, or eliminate it entirely. A team with no dashboard is better off than a team with a dashboard that creates an illusion of data-driven decision-making.

**Smell Test 2: "Can you explain what each metric means and why it's here?"**

Point to any metric on the dashboard and ask the owner (or a regular viewer) to explain: what it measures, how it is calculated, and why it earned a spot on this dashboard. If they cannot answer all three — if they say "I think it's..." or "it's always been there" — the metric should be questioned.

**What to do if it fails**: Audit every metric. For each one, document the definition, the data source, the calculation, and the business question it answers. Remove any metric that cannot be clearly justified. Simplify ruthlessly. A dashboard with 5 well-understood metrics is infinitely more valuable than one with 20 metrics nobody can define.

**Smell Test 3: "When was the last time this dashboard surprised you?"**

A dashboard that never surprises you is confirming what you already know. Confirmation is mildly useful (it builds confidence), but the real value of dashboards is in surfacing the unexpected: the anomaly, the trend break, the segment that is behaving differently. If the dashboard has not surprised anyone in 3 months, it is either monitoring things that never change (remove them) or failing to surface changes that are happening (redesign it).

**What to do if it fails**: Add anomaly detection or threshold alerts. Add new metrics that track leading indicators rather than lagging ones. Consider adding a "what's changed this week" summary at the top that algorithmically identifies the most notable movements.

---

### Dashboard Redesign Priority Matrix

When auditing an existing dashboard and deciding what to keep, move, or remove, use this framework:

**Axis 1: Decision Impact** — Does this metric directly inform a recurring decision?
- **High**: Someone looks at this metric weekly and adjusts their actions based on its value (e.g., campaign spend allocation based on ROAS).
- **Low**: The metric is informational but no one changes behavior based on it (e.g., total registered users).

**Axis 2: Frequency of Meaningful Change** — Does this metric actually move in ways that matter?
- **High**: The metric changes frequently enough that monitoring it is valuable (e.g., daily conversion rate).
- **Low**: The metric barely moves month-to-month (e.g., brand NPS updated quarterly).

| | High Decision Impact | Low Decision Impact |
|---|---|---|
| **High Frequency of Change** | **KEEP on primary dashboard.** This is a core operating metric. It changes, and when it changes, people act. Give it prominent placement. | **MOVE to drill-down or alert.** It changes frequently but nobody acts on it regularly. Set up an alert for when it crosses a threshold, and move the chart to a secondary view. |
| **Low Frequency of Change** | **MOVE to periodic review.** It matters for decisions but rarely changes. Include it in monthly/quarterly reviews rather than a daily dashboard. Checking it daily is wasted attention. | **REMOVE.** It rarely changes and nobody acts on it. It is occupying space that could be used for something valuable. Archive it. If someone misses it, they will ask — and that question is information about what actually matters. |

**The redesign process:**
1. List every metric currently on the dashboard.
2. Classify each one into a quadrant.
3. Redesign the dashboard to feature only the "Keep" metrics prominently.
4. Build drill-down views for the "Move to drill-down" metrics.
5. Schedule the "Move to periodic review" metrics into the appropriate reporting cadence.
6. Remove the "Remove" metrics. Wait 30 days. If nobody asks about them, they were correctly removed.

---

## Part 10: Worked Data Narrative

### Scenario

You are presenting Q1 results to the executive team. The data shows:

| Metric | Actual | Plan | Variance |
|---|---|---|---|
| Revenue | $2.4M | $2.6M | -8% |
| New Customers | 847 | 900 | -6% |
| Churn | 2.1% | 1.8% | +0.3 pp (worse) |
| NPS | 72 | 68 (last quarter) | +4 (improved) |
| CAC | $312 | $280 | +11% (worse) |

Below are three versions of how this data could be presented, ranging from terrible to excellent.

---

### Version 1: BAD — The Data Dump

> **Slide Title: Q1 Results**
>
> | Metric | Actual | Plan | Variance |
> |---|---|---|---|
> | Revenue | $2.4M | $2.6M | -8% |
> | New Customers | 847 | 900 | -6% |
> | Churn | 2.1% | 1.8% | +0.3 pp |
> | NPS | 72 | 68 | +4 |
> | CAC | $312 | $280 | +11% |
>
> "Here are Q1 results. Revenue came in at $2.4M against a plan of $2.6M. New customers were 847 vs. 900 planned. Churn was 2.1% vs. 1.8% target. NPS improved to 72 from 68. CAC came in at $312 vs. the $280 target. Any questions?"

**Why this fails:**

**Problem 1: No narrative structure.** The presenter reads each metric in table order from top to bottom. This is not a presentation; it is a table with a voice-over. The audience could have read this table in an email in 30 seconds. There is no reason for this meeting to exist.

**Problem 2: No interpretation.** Each number is stated as a fact with no analysis of why. Revenue was $2.4M. Why? What happened? Was it market conditions, execution failure, pipeline timing, or a deliberate strategic choice? The audience has to do all of the analytical work themselves, and they will each come to different conclusions — or no conclusion.

**Problem 3: No prioritization.** All five metrics are given equal weight and equal space. But they are not equally important. The revenue miss and the CAC increase are probably the most concerning to an executive team. NPS improvement is a bright spot that could be leveraged. By presenting everything flatly, the presenter signals that they either don't know what matters or don't want to commit to a point of view.

**Problem 4: No connection between metrics.** The metrics are presented as independent numbers, but they are deeply interconnected. Higher CAC and lower new customers might both stem from the same cause (a channel that stopped working, or a competitor that entered the market). Churn increasing while NPS increases is a contradictory signal that demands explanation. None of these connections are drawn.

**Problem 5: No forward-looking element.** The presentation is entirely backward-looking. Q1 is over. The audience wants to know: what are we doing about it? What does this mean for Q2? Are we adjusting the plan? Is this a blip or a trend? The presenter ends with "any questions?" which puts the burden of identifying the right questions on the audience — exactly the wrong place.

**Problem 6: No emotional engagement.** There is no tension, no stakes, no resolution. The audience feels nothing. They may nod politely and move on to the next agenda item without any change in their thinking or behavior. This is the worst possible outcome of a data presentation: the data was accurate, but it changed nothing.

---

### Version 2: MEDIOCRE — Organized but Flat

> **Slide 1: Q1 Revenue**
> Revenue: $2.4M (plan: $2.6M, -8%)
> "We missed our revenue target by 8%, or $200K. This was primarily driven by lower-than-expected new customer acquisition."
>
> **Slide 2: Q1 New Customers**
> New Customers: 847 (plan: 900, -6%)
> "We acquired 53 fewer customers than planned. Paid channels underperformed in February and March."
>
> **Slide 3: Q1 Churn**
> Churn: 2.1% (plan: 1.8%)
> "Churn came in above target at 2.1%. We saw elevated churn in the SMB segment, particularly among customers in their first 90 days."
>
> **Slide 4: Q1 Bright Spot — NPS**
> NPS: 72 (up from 68 last quarter)
> "NPS improved 4 points, driven by positive response to the new onboarding flow launched in January."
>
> **Slide 5: Q1 CAC**
> CAC: $312 (plan: $280, +11%)
> "Customer acquisition cost increased 11% due to rising CPCs in paid search and lower organic conversion rates."

**Why this is mediocre:**

**What it does right:**
- It is organized by metric, not just listed in a table.
- Each metric has at least a sentence of context explaining the "why."
- It identifies a bright spot (NPS) and labels it as such, giving the audience something positive.
- It provides some causal reasoning (paid channels underperformed, SMB churn elevated, CPCs rising).

**What it still gets wrong:**

**Problem 1: It leads with the metric, not the insight.** Every slide is structured as "Metric: Number. Here's why." This is bottom-up reporting — starting with the data and building toward meaning. Executives want top-down: start with the conclusion and support it with data. The slide order should follow the strategic narrative, not the metrics spreadsheet.

**Problem 2: Metrics are siloed.** Each metric gets its own slide with no cross-referencing. But the story is in the connections: CAC went up AND customer acquisition fell, meaning we paid more for fewer customers — that is a compounding problem, not two independent issues. Churn went up while NPS went up — that is a paradox that hints at a segment-specific problem. These connections are where the real insights live, and this presentation misses them all.

**Problem 3: Backward-looking with no forward-looking resolution.** Each slide explains what happened in Q1. None of them address what this means for Q2 or what actions are being taken. The executive team will leave this meeting understanding Q1 slightly better but having no clearer idea of what to do next.

**Problem 4: No recommendation.** The presenter is a reporter, not an advisor. They describe reality but do not propose a response. Executives have limited time and expect their team leads to come with both the diagnosis and the prescription.

**Problem 5: Equal weighting persists.** Each metric gets one slide. The revenue miss (the most consequential item) gets the same treatment as the NPS improvement. Structural equality in a presentation implies equal importance, which is almost never true.

---

### Version 3: EXCELLENT — SCR Framework with Insight-Led Narrative

> **Slide 1: The Headline**
>
> **"Q1 revenue missed by 8%, but the fix is clear: two acquisition channels broke in February and we've already started repairing them. Retention quality is actually improving — NPS is at an all-time high."**
>
> _This is the single slide the CEO will remember. It acknowledges the miss, explains the cause in one clause, communicates that action is underway, and flags the good news. If they have to leave after 30 seconds, they got the message._

> **Slide 2: Situation — What the plan assumed**
>
> "Our Q1 plan assumed steady-state performance across existing acquisition channels and a 1.8% monthly churn rate based on H2 trends. The plan was built in November, before two market shifts that materialized in February."
>
> _Why this matters: It establishes the baseline. The plan was reasonable given what was known at the time. This prevents the conversation from devolving into "was the plan bad?" The audience is now primed for "what changed?"_

> **Slide 3: Complication — Two dynamics hurt acquisition**
>
> **Dynamic 1: Paid search CPCs increased 22% in our category** starting in February, driven by a new competitor (CompetitorX) aggressively bidding on our core keywords. Our paid search budget delivered 30% fewer clicks at the same spend level. This single factor accounts for approximately 35 of our 53-customer shortfall.
>
> **Dynamic 2: Organic conversion rate dropped 15%** after Google's February core update reshuffled rankings for our top 5 landing pages. Three pages dropped from position 1-3 to position 5-8. This accounts for approximately 18 of the 53-customer shortfall.
>
> **The compound effect:** These two dynamics did not just reduce customer volume — they increased CAC by 11% because our fixed marketing spend was spread across fewer acquisitions. The CAC increase is a symptom, not an independent problem.
>
> **Visual:** A waterfall chart showing: Plan (900) → Paid Search Impact (-35) → Organic Impact (-18) → Actual (847). This makes the decomposition of the miss visually immediate.
>
> _Why this matters: The audience now understands the cause at a structural level. These are not execution failures — they are market shifts. The distinction matters because market shifts require strategic responses, not "try harder" directives._

> **Slide 4: The churn paradox — and why it's actually a good sign**
>
> "Churn increased to 2.1% from 1.8% target. But look at the composition:"
>
> | Segment | Q4 Churn | Q1 Churn | Change |
> |---|---|---|---|
> | Enterprise | 0.8% | 0.7% | Improved |
> | Mid-Market | 1.5% | 1.4% | Improved |
> | SMB (<$500/mo) | 3.2% | 4.1% | Worsened |
>
> "Enterprise and mid-market churn actually improved. The increase is entirely driven by SMB, specifically by customers acquired through the paid search channel that is now delivering lower-quality leads due to competitive pressure. The new onboarding flow (launched January) is working — that's why NPS is at 72, an all-time high — but it cannot overcome fundamentally poor-fit customers being acquired through increasingly competitive channels."
>
> "In other words: the acquisition problem and the churn problem are the same problem."
>
> _Why this matters: This slide does three critical things. First, it resolves the apparent paradox of rising churn + rising NPS by showing segment-level detail. Second, it connects two seemingly independent metrics (churn and acquisition) into a single causal story. Third, it reframes the churn increase from "we're losing customers" (alarming) to "one acquisition channel is bringing in poor-fit customers" (actionable and specific)._

> **Slide 5: Resolution — Three initiatives for Q2**
>
> "Based on the Q1 data, we are implementing three changes for Q2:"
>
> **Initiative 1: Diversify acquisition away from paid search.**
> We are launching a partnership channel (3 partners in pipeline, first expected to go live April 15) and increasing investment in content marketing by reallocating $40K/month from the underperforming paid search budget. Expected impact: 60-80 additional customers/month by end of Q2, at a projected CAC of $220 (vs. current paid search CAC of $380).
>
> **Initiative 2: Tighten SMB qualification criteria.**
> We are implementing a lead scoring threshold that will disqualify leads below a fit score of 65 from the sales process. Based on historical data, this would have filtered out approximately 40% of the customers who churned within 90 days, at a cost of approximately 8% of total SMB acquisition volume. Net effect: fewer but stickier customers, reducing churn and improving unit economics.
>
> **Initiative 3: Recover organic search rankings.**
> SEO team has diagnosed the February core update impact and is executing a content refresh on the 5 affected pages. Based on historical recovery timelines, we expect to regain top-3 positions within 6-8 weeks (May-June). This would recover approximately 15-20 of the monthly customers lost to the organic decline.
>
> **Combined Q2 forecast:** These three initiatives, combined with seasonal tailwinds in our market, put us on track for $2.7M in Q2 revenue — above the original quarterly plan of $2.6M. We expect to close the H1 gap by end of Q2.
>
> _Why this matters: The audience leaves with a clear plan, specific timelines, quantified expected impact, and a revised forecast. They know the problem, they know the cause, they know the fix, and they know when to expect results. There is nothing to wonder about after this slide._

> **Slide 6: Appendix — Detailed Metrics**
>
> _The detailed metric table (the Version 1 table) goes here, available for reference but not presented unless someone asks. The narrative did the work; the appendix provides the audit trail._

---

### Annotation Summary: Why Version 3 Works

**It follows the SCR framework precisely.** Situation (slide 2) establishes the baseline. Complication (slides 3-4) identifies what changed and why. Resolution (slide 5) proposes specific actions. This mirrors how the executive brain processes information: context, problem, solution.

**It leads with the headline.** Slide 1 is the entire presentation compressed into two sentences. An executive who reads only this slide still gets the core message. Every subsequent slide exists to support this headline, not to build toward it.

**It connects metrics instead of siloing them.** The CAC increase, the customer shortfall, and the churn increase are revealed to be three symptoms of the same two causes. This is dramatically more useful than three independent explanations because it means two fixes address three problems.

**It reframes negatives through segmentation.** Instead of "churn is up" (alarming, vague), it shows "enterprise and mid-market churn are down; SMB churn from one specific channel is up" (specific, actionable). Segmentation turns a scary aggregate into a targeted problem.

**It quantifies the forward plan.** "We're working on it" is not a resolution. "Three initiatives, targeting 60-80 additional customers/month, $40K reallocation, expected to close the H1 gap by end of Q2" is a resolution. Specificity builds confidence that the team has a grip on the problem.

**It uses the right visual (waterfall chart) at the right moment.** The waterfall chart on slide 3 decomposes the 53-customer miss into its two causes with surgical precision. The executive can see the relative contribution of each factor at a glance.

**It builds trust by showing the complicating detail.** The churn paradox slide could have been hidden — the presenter could have simply said "churn was a bit high." Instead, they surfaced the complexity, resolved it, and connected it to the broader story. This builds credibility: the audience trusts that the presenter has looked deeply at the data, not just skimmed the top line.

**It ends with a decision, not a question.** Version 1 ends with "any questions?" Version 3 ends with a specific plan and a forecast. The audience's role shifts from "figure out what to do" to "approve and resource the proposed plan."

---

## Part 11: Chart Selection Decision Tree

The table in Part 2 (Visualization Principles) provides a quick lookup. This decision tree expands that table into a proper selection tool, starting from the question you're trying to answer and ending with specific guidance on when to use each chart type, when NOT to use it, and what mistakes to avoid.

---

### Start Here: What question are you answering?

Ask yourself: "What is the core analytical question?" Then follow the appropriate branch.

---

### Branch 1: COMPARISON — "How do these items compare?"

**How many items are you comparing?**

#### Few items (2-7 categories)

**Use: Vertical Bar Chart**

- When to use: Comparing a small number of discrete categories on a single measure. E.g., revenue by product line, conversion rate by landing page.
- When NOT to use: When you have more than 7 categories (the chart gets crowded). When the category labels are long (horizontal bars are better). When you are comparing over time (use a line chart instead).
- Common mistakes:
  - Not starting the y-axis at zero. Bar charts encode value by bar length; a truncated y-axis distorts the visual comparison.
  - Using 3D bars, which make the height ambiguous.
  - Sorting bars randomly instead of by value (unless there is a natural order like age groups).

#### Many items (8+ categories)

**Use: Horizontal Bar Chart or Dot Plot (Cleveland Dot Plot)**

- When to use: Comparing many categories, especially when labels are long (country names, product names, campaign titles). The horizontal orientation gives labels room to breathe.
- When NOT to use: When the values are all very similar (differences become invisible). When you need to show composition within each bar (use stacked bar instead).
- Common mistakes:
  - Not sorting by value. An unsorted horizontal bar chart with 15 items is almost unreadable. Always sort descending (or ascending) unless a natural order exists.
  - Using a bar chart when a dot plot would suffice. If the bars all start at zero and only the endpoint matters, dots are cleaner and use less ink.

**Use: Dot Plot** (specifically when precision matters more than visual impact)

- When to use: Many items, values are close together, and you want the viewer to read precise values. Also excellent for showing before/after or plan vs. actual by plotting two dots per row.
- When NOT to use: When you need strong visual impact (bars are more dramatic). When the audience is not data-literate (bars are more intuitive).

#### Over time

**Use: Line Chart**

- When to use: Showing how one or more measures change over a continuous time period. The line connects the points and makes trend, acceleration, and inflection points visible.
- When NOT to use: When you have only 2-3 time points (a bar chart is simpler). When the time intervals are uneven and the audience might misread interpolation. When you have more than 5-6 lines (the chart becomes spaghetti).
- Common mistakes:
  - Connecting categorical data with a line. A line implies continuity — if the x-axis is "Product A, Product B, Product C," a line falsely implies intermediate values between products.
  - Using area fill under the line when it doesn't represent a meaningful quantity (area implies volume or magnitude, not just trend).
  - Plotting too many lines without differentiating them (use color, thickness, or direct labels — not a separate legend with 8 entries).

---

### Branch 2: COMPOSITION — "What is it made of?"

**Is this a snapshot or a change over time?**

#### Static composition (single point in time)

**Use: Stacked Bar Chart (single bar, 100%)**

- When to use: Showing how a total breaks down into parts at a single point in time. E.g., revenue by segment, traffic by source for this month.
- When NOT to use: When you have more than 5-6 segments (small slices become unreadable). When you need to compare the absolute size of individual segments precisely.
- Common mistakes:
  - Using a pie chart when a stacked bar would be clearer. Pie charts are only acceptable for 2-3 segments where one is clearly dominant. For anything else, a stacked bar is more readable.

**Use: Pie Chart** (with extreme restraint)

- When to use: Showing a simple 2-3 way split where one segment dominates. E.g., "Desktop vs. Mobile traffic — 65% vs. 35%." The simplicity of the visual reinforces the simplicity of the message.
- When NOT to use: When you have more than 3 segments. When segments are close in size (the eye cannot distinguish a 22% slice from a 25% slice). When you need precise comparisons. When you are showing change over time.
- Common mistakes:
  - Using it for more than 3 segments. This is the most common data visualization mistake in business presentations.
  - Exploding slices or using 3D perspective, which distorts the proportions.
  - Not labeling slices directly (forcing the reader to match colors to a legend).

**Use: Treemap**

- When to use: Showing hierarchical composition with many categories and subcategories. E.g., revenue by region, then by product within each region. Good for showing which segments are large and which are negligible.
- When NOT to use: When precise comparison between rectangles is important (the eye is not good at comparing areas). When there is no hierarchy — use a bar chart instead.

#### Composition over time

**Use: Stacked Area Chart**

- When to use: Showing how the composition of a total changes over time. E.g., revenue by product line over 12 months, where both the total and the mix are meaningful.
- When NOT to use: When the bottom layers are small and the stacking makes it impossible to read their trend (only the bottom layer and the total are accurately readable). When you need to compare specific layers precisely.
- Common mistakes:
  - Assuming the reader can accurately compare the width of a middle layer across time. They cannot — stacking distorts the visual of all layers except the bottom one. If you need to compare individual layers, use a small multiples approach (separate line charts for each layer).
  - Not considering a 100% stacked area chart if the interesting story is the changing mix rather than the changing total.

**Use: 100% Stacked Bar Chart (multiple bars over time)**

- When to use: Showing how the proportional mix changes over time when the total is not the focus. E.g., traffic source mix by quarter, marketing spend allocation by month.
- When NOT to use: When the total matters — this chart hides changes in the absolute numbers.

---

### Branch 3: DISTRIBUTION — "How is this spread out?"

**How many variables?**

#### One variable

**Use: Histogram**

- When to use: Showing the distribution of a single continuous variable. E.g., distribution of customer lifetimes, distribution of deal sizes, distribution of page load times.
- When NOT to use: When you have very few data points (<30). When the bin size choice dramatically changes the story (be transparent about bin selection). When the audience expects a bar chart and might confuse the x-axis bins for categories.
- Common mistakes:
  - Choosing a bin width that hides the real shape of the distribution (too few bins = oversmoothed, too many = noisy).
  - Not showing the mean or median with a vertical line for reference.
  - Using a histogram when the data is categorical (use a bar chart instead).

**Use: Box Plot**

- When to use: Comparing distributions across categories. E.g., response time by server, deal size by sales rep, satisfaction score by region. Compact and precise.
- When NOT to use: When the audience is not data-literate (box plots require explanation). When the distribution is multimodal (the box plot hides this).
- Common mistakes:
  - Not explaining what the box and whiskers represent. Many business audiences have never seen a box plot.
  - Using box plots when a simple comparison of means would answer the question (don't add complexity that doesn't add insight).

**Use: Violin Plot**

- When to use: When you need to show the full shape of the distribution, not just the summary statistics. Combines density plot with box plot. Good for showing bimodal distributions that a box plot would hide.
- When NOT to use: For most business audiences. Reserve for data science or research contexts where distributional shape is genuinely important.

#### Two variables

**Use: Scatter Plot**

- When to use: Exploring the relationship between two continuous variables. E.g., ad spend vs. revenue, price vs. demand, employee tenure vs. satisfaction.
- When NOT to use: When you have very few data points (<15 — the pattern is unreliable). When one variable is categorical (use a box plot or grouped bar instead). When the relationship is so obvious that a simpler chart with a summary statistic would suffice.
- Common mistakes:
  - Overplotting (too many dots overlapping, hiding the density). Use transparency, jittering, or a heatmap instead.
  - Adding a trend line to data that is not actually linear. A trend line implies a model — make sure the model is appropriate.
  - Confusing correlation with causation in the annotation or title.

#### Many variables

**Use: Heatmap**

- When to use: Showing the relationship between two categorical or ordinal variables with a color-encoded value. E.g., correlation matrix, cohort retention table, activity by day-of-week and hour-of-day.
- When NOT to use: When precise values matter more than patterns (tables are better for precise reading). When the color scale is not intuitive or not accessible to colorblind viewers.
- Common mistakes:
  - Using a red-green color scale (inaccessible to ~8% of men with red-green color blindness). Use blue-red, blue-orange, or a sequential single-hue scale.
  - Not sorting the rows and columns meaningfully. An unsorted heatmap hides patterns that sorting would reveal.
  - Not including the actual values in the cells (color alone is too imprecise for many use cases).

---

### Branch 4: RELATIONSHIP — "Are these things related?"

**How many variables?**

#### Two variables

**Use: Scatter Plot** (same as Distribution, two variables — see above)

Additional guidance for relationship analysis:
- Add a trend line only if the relationship is meaningful and you can explain the mechanism.
- Use color or size to encode a third variable (e.g., bubble chart) but do not encode more than three variables — the chart becomes unreadable.
- Annotate key outliers by name rather than letting them sit as anonymous dots.

#### Correlation among many variables

**Use: Correlation Matrix Heatmap**

- When to use: Exploring pairwise correlations across many variables at once. E.g., which features correlate with churn? Which metrics move together?
- When NOT to use: When the audience needs to understand the specific nature of each relationship (the heatmap only shows strength and direction, not shape). When the number of variables exceeds 15-20 (the matrix becomes unwieldy).
- Common mistakes:
  - Showing the full matrix when only the lower triangle is needed (the upper triangle is a mirror).
  - Not ordering variables to cluster related ones together. Arbitrary ordering hides patterns.
  - Interpreting correlation as causation in the labels or narrative.

---

### Quick Reference: Chart Type Cheat Sheet

| Your Question | First Choice | Second Choice | Never Use |
|---|---|---|---|
| "Which category is biggest?" | Horizontal bar (sorted) | Vertical bar | Pie chart with >3 slices |
| "How has this changed over time?" | Line chart | Bar chart (few time points) | Pie chart |
| "What's the breakdown?" | Stacked bar | Treemap (if hierarchical) | Pie chart (if >3 segments) |
| "How is this distributed?" | Histogram | Box plot (for comparison) | Bar chart (for continuous data) |
| "Are these related?" | Scatter plot | Correlation heatmap | Dual-axis line chart |
| "How does retention decay?" | Cohort heatmap | Line chart by cohort | Table of raw numbers |
| "What's the flow?" | Sankey diagram | Funnel chart | Pie chart |
| "Where is this happening?" | Choropleth map | Bubble map | 3D anything |

---

### The Anti-Patterns: Charts You Should Almost Never Use

**3D charts of any kind.** The perspective distortion makes accurate comparison impossible. There is no data question that a 3D chart answers better than its 2D equivalent.

**Dual y-axis charts.** Two y-axes with different scales create a false visual relationship between two unrelated series. The crossing point is arbitrary and determined by the axis range, not the data. If you need to show two metrics together, use small multiples (two charts stacked vertically with aligned x-axes).

**Gauge charts / speedometer charts.** They use a large amount of space to communicate a single number. A large bold number with a comparison (vs. target, vs. last period) is more effective and takes up less room.

**Word clouds.** They encode frequency by text size, but the human eye is poor at comparing text sizes, and long words appear larger than short words regardless of frequency. Use a horizontal bar chart of word frequency instead.

**Donut charts.** A pie chart with the center removed. The removed center makes angle comparison even harder than it already was. If you need a single big number in the center, just display the big number — you don't need a donut around it.
