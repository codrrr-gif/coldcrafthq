# Statistical Foundations & Common Traps

---

## Table of Contents

- [Part 1: Core Statistical Concepts](#part-1-core-statistical-concepts)
  - [Distributions and Central Tendency](#distributions-and-central-tendency)
  - [The Central Limit Theorem](#the-central-limit-theorem)
  - [Variance and Standard Error](#variance-and-standard-error)
  - [Correlation vs. Causation](#correlation-vs-causation)
- [Part 2: Hypothesis Testing Deep Dive](#part-2-hypothesis-testing-deep-dive)
  - [The Logic of Null Hypothesis Testing](#the-logic-of-null-hypothesis-testing)
  - [What P-Values Actually Mean](#what-p-values-actually-mean)
  - [Statistical vs. Practical Significance](#statistical-vs-practical-significance)
  - [Power Analysis](#power-analysis)
- [Part 3: Common Statistical Traps & Variance Reduction](#part-3-common-statistical-traps--variance-reduction)
  - [10 Common Traps](#1-peeking--early-stopping)
  - [Variance Reduction Techniques](#variance-reduction-techniques)
  - [Practical Rules of Thumb](#practical-rules-of-thumb)
- [Part 4: Statistical Test Selection Matrix](#part-4-statistical-test-selection-matrix)
  - [Decision Flowchart](#decision-flowchart)
  - [Test Selection Matrix](#test-selection-matrix)
  - [Quick Reference: Assumptions and Alternatives](#quick-reference-assumptions-and-alternatives)
- [Part 5: Worked Interpretation Example](#part-5-worked-interpretation-example)
  - [Scenario: SaaS Pricing Page A/B Test](#scenario-saas-pricing-page-ab-test)
  - [Wrong Interpretations of the Same Data](#wrong-interpretations-of-the-same-data)
- [Part 6: P-Value Interpretation Flowchart](#part-6-p-value-interpretation-flowchart)
  - [What a P-Value Actually Means](#what-a-p-value-actually-means)
  - [The 5 Most Common Misinterpretations](#the-5-most-common-p-value-misinterpretations)
  - [When P-Values Are Misleading](#when-p-values-are-misleading)
  - [Alternatives to P-Values](#alternatives-to-p-values)
  - [Decision Framework by P-Value](#decision-framework-the-p-value-is-x-heres-what-to-do)
- [Part 7: Effect Size Reference Table](#part-7-effect-size-reference-table)
  - [Effect Sizes by Domain](#effect-sizes-by-domain)
  - [Calibration: When to Be Skeptical](#calibration-when-to-be-skeptical)
  - [Historical Effect Size Distributions](#historical-effect-size-distributions-from-published-experiments)
- [Part 8: Multiple Comparisons and Sequential Testing](#part-8-multiple-comparisons-and-sequential-testing)
  - [The Multiple Comparisons Problem](#the-multiple-comparisons-problem)
  - [Correction Methods](#correction-methods)
  - [Sequential Testing](#sequential-testing--always-valid-confidence-intervals)
  - [Practical Recommendation](#practical-recommendation)
- [Cross-References](#cross-references)

---

## Cross-References

### References Within This Skill

| File | Relationship | When to Use Together |
|---|---|---|
| [experimentation.md](experimentation.md) | Companion | Apply the statistical concepts from this file to experiment design, sample size planning, and results interpretation |
| [metrics-frameworks.md](metrics-frameworks.md) | Upstream | Choose the right metrics first, then use this file to test hypotheses about them |
| [measurement-principles.md](measurement-principles.md) | Upstream | Ensure your data collection is sound before applying statistical methods |
| [optimization-methodology.md](optimization-methodology.md) | Downstream | Use statistical findings to drive optimization decisions and prioritization |
| [data-storytelling.md](data-storytelling.md) | Downstream | Translate statistical results into narratives stakeholders can act on |

### Related Skills

| Skill | Relationship | When to Cross-Reference |
|---|---|---|
| `research-market-analysis` | Input | Market research findings often require statistical validation before acting on them |
| `funnel-architecture` | Application | Funnel metrics (drop-off rates, conversion rates) are proportion data — use the chi-squared and proportion test guidance here |
| `business-strategy` | Context | Statistical significance means nothing without business context; strategy defines what "practical significance" looks like |
| `email-marketing` | Application | Open rates, click rates, and reply rates are all proportion metrics tested with methods described in Parts 4 and 5 |
| `brand-voice` | Downstream | When communicating statistical findings externally, brand voice governs tone and framing |

---

## Part 1: Core Statistical Concepts

### Distributions and Central Tendency
- **Mean**: Arithmetic average. Sensitive to outliers. Use for normally distributed data.
- **Median**: Middle value. Robust to outliers. Use for skewed distributions (revenue, session duration).
- **Mode**: Most frequent value. Useful for categorical data and identifying common behaviors.
- **Standard deviation**: Spread of data around the mean. 68% within 1 SD, 95% within 2 SD, 99.7% within 3 SD (for normal distributions).

### The Central Limit Theorem
The mean of sufficiently large random samples will be approximately normally distributed, REGARDLESS of the underlying distribution. This is why t-tests work even when your data isn't normal — you're testing the distribution of means, not individual observations. Minimum sample size rule of thumb: n > 30, but more is needed for highly skewed data.

### Variance and Standard Error
- **Variance**: How spread out individual data points are
- **Standard error**: How precise your estimate of the mean is (SD / √n)
- Larger samples → smaller standard error → tighter confidence intervals → more statistical power
- **Practical implication**: To halve the width of your confidence interval, you need 4x the sample size

### Correlation vs. Causation
Correlation measures the strength and direction of a linear relationship between two variables. Causation means one variable actually influences the other.

**Why correlation ≠ causation**:
1. **Confounding variables**: A third factor drives both (ice cream sales and drownings both rise in summer — heat is the confounder)
2. **Reverse causation**: The effect causes the "cause" (companies with high revenue hire more engineers — does hiring engineers cause revenue, or does revenue fund hiring?)
3. **Spurious correlation**: Pure coincidence in finite datasets (Tyler Vigen's examples: divorce rate correlates with margarine consumption)

**The gold standard for causation**: Randomized controlled experiments (A/B tests). Everything else is correlational, no matter how sophisticated the statistics.

**Kohavi's Office 365 example**: Users who experienced crashes and then continued using the product showed HIGHER engagement than those who never crashed. Naive interpretation: crashes improve engagement! Reality: heavy users are more likely to experience crashes AND more likely to be engaged. Selection bias.

---

## Part 2: Hypothesis Testing Deep Dive

### The Logic of Null Hypothesis Testing
1. Assume there's no effect (null hypothesis)
2. Calculate the probability of seeing data this extreme under the null
3. If that probability (p-value) is very low, reject the null
4. "Very low" means below your pre-set alpha (typically 0.05)

### What P-Values Actually Mean
- P = 0.03 means: "If there were truly no effect, we'd see results this extreme 3% of the time"
- P ≠ "3% chance the null is true"
- P ≠ "97% chance the treatment works"
- P ≠ "the effect size is large"
- A tiny, meaningless effect with a huge sample can produce p = 0.001

### Statistical vs. Practical Significance
**Statistical significance**: The effect is likely real (not due to chance)
**Practical significance**: The effect is large enough to matter

Always report BOTH. A statistically significant 0.01% improvement in conversion is real but meaningless. A 5% improvement that's not statistically significant might matter — it means you need more data, not that there's no effect.

### Power Analysis
**Power** = probability of detecting a real effect = 1 - β

| To increase power: | Do this: |
|---|---|
| Larger effect size | Can't control this |
| Larger sample size | Run longer, or on higher-traffic pages |
| Less variance in metric | Use more sensitive metrics, variance reduction techniques |
| Higher alpha | Accept more false positives (rarely advisable) |

**Pre-experiment power analysis**: Before running an experiment, calculate how many samples you need to detect a meaningful effect with 80% power. Don't start experiments you can't power adequately.

---

## Part 3: Common Statistical Traps & Variance Reduction

### 1. Peeking / Early Stopping
**The trap**: Checking results daily and stopping when you see significance
**Why it's wrong**: Each peek is an independent statistical test. With 20 peeks, your actual false positive rate is ~30%, not 5%.
**The fix**: Pre-commit to duration. Use sequential testing methods if you must peek. Always let the experiment run at least one full business cycle.

### 2. Multiple Comparisons
**The trap**: Testing 20 metrics and celebrating the one that shows p < 0.05
**Why it's wrong**: With 20 tests at α = 0.05, you expect 1 false positive by chance
**The fix**: Pre-designate primary metrics. Apply Bonferroni or Benjamini-Hochberg corrections. Use hierarchical testing (test primary first, then secondary only if primary is significant).

### 3. Simpson's Paradox
**The trap**: A trend that appears in several subgroups reverses when the groups are combined
**Classic example**: Treatment A has higher survival rate in both mild and severe cases, but Treatment B has higher survival rate overall (because B is used more in mild cases).
**The fix**: Always segment data. Check whether the composition of subgroups differs between control and treatment.

### 4. Survivorship Bias
**The trap**: Analyzing only the survivors and concluding that survivors' traits cause success
**Classic example**: WWII planes — engineers wanted to armor the parts of returning planes that had bullet holes. Abraham Wald pointed out they should armor the parts WITHOUT holes — those were the planes that didn't return.
**In analytics**: Only analyzing users who completed onboarding ignores the critical drop-off information.

### 5. Regression to the Mean
**The trap**: Interpreting a natural fluctuation as a real change
**Example**: Your worst-performing month is followed by a better month. You credit the improvement to the "intervention" you launched, but it was just regression to the mean.
**The fix**: Use control groups. Compare to baseline trends. Don't over-interpret single data points.

### 6. Base Rate Neglect
**The trap**: Ignoring the prior probability when interpreting a result
**Example**: A test for a disease is 99% accurate. You test positive. What's the probability you have the disease? It depends entirely on the base rate. If only 1 in 10,000 people have it, there's only a ~1% chance you're actually sick (because the 1% false positive rate × 9,999 healthy people >> the 1 true positive).
**In analytics**: A "high-performing" ad creative with 5 clicks and 100% CTR. Base rate: that's just noise.

### 7. Ecological Fallacy
**The trap**: Drawing conclusions about individuals from aggregate data
**Example**: Countries with higher chocolate consumption win more Nobel Prizes. Doesn't mean eating chocolate makes individuals smarter.
**In analytics**: "Users from organic search have higher LTV" doesn't mean converting a paid user to organic behavior will increase their LTV.

### 8. Goodhart's Law / Campbell's Law / Cobra Effect
**The trap**: When a measure becomes a target, it ceases to be a good measure
**Cobra Effect**: British India offered a bounty for dead cobras. People started breeding cobras. When the program was cancelled, breeders released their now-worthless cobras. Population increased.
**In analytics**: Optimizing for "time on site" leads to confusing navigation and infinite scroll, not better content. Optimizing for "pageviews" leads to slideshow articles and pagination tricks.
**The fix**: Use composite metrics. Monitor guardrails. Ask "if we moved this metric but NOTHING ELSE changed, would we be happy?"

### 9. Cherry-Picking Segments
**The trap**: Post-hoc subgroup analysis that finds a "significant" effect in one slice
**Example**: "The experiment didn't win overall, but it won for female users aged 25-34 on mobile using Chrome!" With enough slices, you'll always find one that's significant.
**The fix**: Pre-register your segments. Treat post-hoc segment analysis as hypothesis-generating, not hypothesis-confirming. Require follow-up experiments on the specific segment.

### 10. Confusing Precision with Accuracy
**The trap**: Reporting "conversion rate is 2.347%" when the confidence interval is ±0.5%
**The fix**: Report uncertainty. Round appropriately. Use confidence intervals, not point estimates.

### Variance Reduction Techniques

#### For More Sensitive Experiments
1. **Triggered analysis**: Only analyze users who actually SAW the change (not all users in the experiment). Reduces dilution from unaffected users.
2. **CUPED (Controlled-experiment Using Pre-Experiment Data)**: Use pre-experiment behavior to reduce variance. If a user's pre-experiment conversion rate predicts their during-experiment behavior, you can "subtract out" that predictable component.
3. **Stratified sampling**: Ensure balanced representation of important segments.
4. **Metric transformation**: Log-transform revenue metrics to reduce skew. Binarize counts (did the user do X: yes/no). Winsorize or cap outliers.

#### Outlier Handling
- Extremely high-value transactions or extremely active users can dominate means
- **Capping/Winsorizing**: Replace values above the 99th percentile with the 99th percentile value
- **Trimming**: Remove extreme values entirely (lose data)
- **Log transformation**: Compress the scale
- **Use medians instead of means**: More robust to outliers but less statistically powerful

### Practical Rules of Thumb

1. **n > 30** per group minimum for t-tests; n > 100 per group for proportion tests; more for small expected effects
2. **One week minimum** for any experiment (capture day-of-week effects)
3. **Don't test more than ~5 variants** simultaneously without very high traffic
4. **If the result surprises you, verify before celebrating** — Twyman's Law: "Any figure that looks interesting or different is usually wrong"
5. **Effect sizes in digital experiments are typically small** — 1-5% lifts are common; >10% is exceptional
6. **Statistical significance without practical significance is noise**
7. **Lack of statistical significance is NOT evidence of no effect** — it may mean insufficient power
8. **Always visualize the data** before running statistical tests — plots reveal issues that summary statistics hide

---

## Part 4: Statistical Test Selection Matrix

### Decision Flowchart

Use this text-based flowchart to navigate to the right statistical test. Start at the top and follow the arrows.

```
START: What is your outcome variable?
│
├─► CONTINUOUS (revenue, time, score, weight)
│   │
│   ├─► How many groups are you comparing?
│   │   │
│   │   ├─► 1 group (vs. a known value)
│   │   │   ├─► Data normal? → One-sample t-test
│   │   │   └─► Data non-normal? → Wilcoxon signed-rank test
│   │   │
│   │   ├─► 2 groups
│   │   │   ├─► Independent groups?
│   │   │   │   ├─► Data normal, equal variance? → Independent t-test
│   │   │   │   ├─► Data normal, unequal variance? → Welch's t-test
│   │   │   │   └─► Data non-normal? → Mann-Whitney U test
│   │   │   └─► Paired/matched groups?
│   │   │       ├─► Data normal? → Paired t-test
│   │   │       └─► Data non-normal? → Wilcoxon signed-rank test
│   │   │
│   │   └─► 3+ groups
│   │       ├─► Independent groups?
│   │       │   ├─► Data normal, equal variance? → One-way ANOVA
│   │       │   │   └─► Follow up with: Tukey HSD or Bonferroni post-hoc
│   │       │   └─► Data non-normal? → Kruskal-Wallis test
│   │       │       └─► Follow up with: Dunn's test with correction
│   │       └─► Repeated measures?
│   │           ├─► Data normal? → Repeated-measures ANOVA
│   │           └─► Data non-normal? → Friedman test
│   │
│   └─► Relationship with another continuous variable?
│       ├─► Both normal, linear relationship? → Pearson correlation / Linear regression
│       ├─► Non-normal or nonlinear? → Spearman rank correlation
│       └─► Multiple predictors? → Multiple regression
│
├─► CATEGORICAL / PROPORTIONS (converted yes/no, clicked yes/no, plan tier)
│   │
│   ├─► 2 groups, 2 outcomes
│   │   ├─► Expected cell counts all ≥ 5? → Chi-squared test / Z-test for proportions
│   │   └─► Any expected cell count < 5? → Fisher's exact test
│   │
│   ├─► 2+ groups, 2+ outcomes
│   │   ├─► Expected cell counts all ≥ 5? → Chi-squared test of independence
│   │   └─► Small expected counts? → Fisher's exact test (2x2) or Fisher-Freeman-Halton (larger)
│   │
│   ├─► Paired/before-after proportions
│   │   └─► McNemar's test
│   │
│   └─► Multiple predictors, binary outcome
│       └─► Logistic regression
│
├─► COUNT DATA (number of events, purchases per user)
│   │
│   ├─► Counts follow Poisson distribution? → Poisson regression
│   └─► Overdispersed counts (variance >> mean)? → Negative binomial regression
│
└─► TIME-TO-EVENT (time to churn, time to first purchase)
    │
    ├─► Compare survival curves between groups? → Kaplan-Meier + Log-rank test
    ├─► Adjust for covariates? → Cox proportional hazards regression
    └─► Non-proportional hazards? → Accelerated failure time models
```

### Test Selection Matrix

| Data Type | Question | Recommended Test | When to Use | When NOT to Use |
|---|---|---|---|---|
| Continuous vs. Continuous | Is there a relationship? | **Pearson correlation** | Both variables approximately normal, linear relationship expected | Skewed data, nonlinear relationships, ordinal data |
| Continuous vs. Continuous | Is there a relationship? | **Spearman rank correlation** | Non-normal data, ordinal data, monotonic but nonlinear relationships | You need to quantify the exact linear slope |
| Continuous, 2 independent groups | Is there a difference? | **Independent t-test** | Normal data, equal variance, comparing means (e.g., avg revenue: control vs. treatment) | Highly skewed data (use Mann-Whitney), very small samples without normality |
| Continuous, 2 independent groups | Is there a difference? | **Welch's t-test** | Normal data but unequal variance between groups (safe default for any 2-group comparison) | Highly skewed data with small samples |
| Continuous, 2 independent groups | Is there a difference? | **Mann-Whitney U** | Non-normal data, ordinal data, comparing medians/distributions | You specifically need to compare means (not distributions) |
| Continuous, 3+ independent groups | Is there a difference? | **One-way ANOVA** | Normal data, equal variance, comparing means across multiple groups (e.g., 3 pricing tiers) | Non-normal data, unequal variance, small samples |
| Continuous, 3+ independent groups | Is there a difference? | **Kruskal-Wallis** | Non-normal data, ordinal data, comparing distributions across 3+ groups | You need to test specific pairwise comparisons (use post-hoc tests after) |
| Proportions, 2 groups | Is there a difference? | **Chi-squared test** | Expected cell counts all >= 5, large samples (standard A/B test on conversion rates) | Small samples, any expected cell count < 5 |
| Proportions, 2 groups | Is there a difference? | **Fisher's exact test** | Small samples, any expected cell count < 5 | Large samples (computationally expensive, and chi-squared works fine) |
| Proportions, before/after | Did the proportion change? | **McNemar's test** | Paired binary data — same subjects measured before and after (e.g., feature adoption pre/post redesign) | Independent groups (use chi-squared instead) |
| Time-to-event, 2+ groups | Do survival curves differ? | **Kaplan-Meier + Log-rank** | Comparing time to churn, time to first purchase across groups; handles censoring | You need to adjust for covariates (use Cox regression) |
| Time-to-event, multiple covariates | What predicts survival? | **Cox proportional hazards** | Multiple predictors of time-to-event; semi-parametric (flexible) | Hazards are not proportional over time (check Schoenfeld residuals) |
| Binary outcome, multiple predictors | What predicts the outcome? | **Logistic regression** | Modeling probability of conversion/churn/click as function of multiple variables | Outcome has 3+ categories (use multinomial logistic), outcome is count data (use Poisson) |

### Quick Reference: Assumptions and Alternatives

| Test | Key Assumptions | What to Check | If Assumptions Violated |
|---|---|---|---|
| t-test | Normality (of means, not data), independence | Shapiro-Wilk test, Q-Q plot; n > 30 usually sufficient via CLT | Mann-Whitney U, or bootstrap the confidence interval |
| ANOVA | Normality, homogeneity of variance, independence | Levene's test for equal variance | Welch's ANOVA (unequal variance), Kruskal-Wallis (non-normal) |
| Chi-squared | Expected cell counts >= 5, independence | Check expected counts in contingency table | Fisher's exact test |
| Pearson correlation | Bivariate normality, linearity | Scatter plot, Shapiro-Wilk on residuals | Spearman, or transform variables |
| Linear regression | Linearity, normality of residuals, homoscedasticity, independence | Residual plots, Durbin-Watson for independence | Transform variables, use robust regression, or use non-parametric methods |
| Logistic regression | Independence, no multicollinearity, large samples | VIF for multicollinearity, Hosmer-Lemeshow for fit | Remove correlated predictors, regularize (L1/L2) |

---

## Part 5: Worked Interpretation Example

### Scenario: SaaS Pricing Page A/B Test

A SaaS company ran an A/B test on their pricing page. They changed the CTA button copy and the layout of the feature comparison table.

- **Group A (control)**: 2,847 visitors, 142 conversions (4.99%)
- **Group B (variant)**: 2,912 visitors, 168 conversions (5.77%)

The product manager asks: "Did the variant win? Should we ship it?"

Here is the full, rigorous interpretation.

#### Step 1: Calculate the Observed Lift

```
Observed lift = (p_B - p_A) / p_A
             = (0.0577 - 0.0499) / 0.0499
             = 0.0078 / 0.0499
             = 15.6% relative lift

Absolute difference = 5.77% - 4.99% = 0.78 percentage points
```

The variant outperformed the control by 0.78 percentage points, or a 15.6% relative improvement. This looks promising, but the numbers are small enough that noise could explain it.

#### Step 2: Calculate the P-Value

We use a two-proportion z-test. Under the null hypothesis (no difference), we pool the conversion rates:

```
Pooled proportion (p_pool) = (142 + 168) / (2847 + 2912)
                           = 310 / 5759
                           = 0.05383

Standard error = sqrt(p_pool * (1 - p_pool) * (1/n_A + 1/n_B))
               = sqrt(0.05383 * 0.94617 * (1/2847 + 1/2912))
               = sqrt(0.05383 * 0.94617 * 0.0006943)
               = sqrt(0.00003535)
               = 0.005946

z = (p_B - p_A) / SE
  = (0.0577 - 0.0499) / 0.005946
  = 0.0078 / 0.005946
  = 1.312

Two-tailed p-value: p = 2 * (1 - Φ(1.312)) ≈ 2 * 0.0948 ≈ 0.190
One-tailed p-value: p ≈ 0.095
```

**Result: p = 0.19 (two-tailed).** This is NOT statistically significant at the conventional α = 0.05 level. We cannot reject the null hypothesis.

#### Step 3: Calculate the Confidence Interval for the Difference

```
SE_unpooled = sqrt(p_A*(1-p_A)/n_A + p_B*(1-p_B)/n_B)
            = sqrt(0.0499*0.9501/2847 + 0.0577*0.9423/2912)
            = sqrt(0.00001664 + 0.00001866)
            = sqrt(0.00003530)
            = 0.005941

95% CI for (p_B - p_A) = 0.0078 ± 1.96 * 0.005941
                        = 0.0078 ± 0.01164
                        = [-0.0038, +0.0195]
                        = [-0.38pp, +1.95pp]
```

**Interpretation**: The true difference in conversion rates is somewhere between -0.38 percentage points (the variant is WORSE) and +1.95 percentage points (the variant is better). Because the interval includes zero, we cannot conclude there is a real difference.

#### Step 4: Check for Practical Significance

Even if the effect were real, is 0.78pp worth it?

```
Current monthly visitors to pricing page: ~12,000 (extrapolating from ~2,847 in the test period)
Current monthly conversions: 12,000 * 4.99% = 599
With +0.78pp: 12,000 * 5.77% = 692

Additional conversions per month: 93
Average contract value: $1,200/year (assume)
Annual revenue impact: 93 * 12 months * $100/month = $111,600/year
  (or equivalently: 93 conversions/month * $1,200/year = $111,600/year)
```

A $111,600/year impact would be meaningful for most SaaS companies. So IF the effect is real, it is practically significant. The problem is we do not have enough evidence to confirm the effect is real.

#### Step 5: Calculate Expected Revenue Impact (with uncertainty)

Using the confidence interval:

```
Low end (-0.38pp): 12,000 * (-0.0038) = -46 conversions/month → -$55,200/year
Best estimate (+0.78pp): +93 conversions/month → +$111,600/year
High end (+1.95pp): 12,000 * 0.0195 = +234 conversions/month → +$280,800/year
```

The expected range is -$55K to +$281K/year. That is too wide to make a confident decision.

#### Step 6: Check for Sample Ratio Mismatch (SRM)

```
Expected: 50/50 split → 2,879.5 per group
Observed: 2,847 (A) vs. 2,912 (B)

Chi-squared = (2847 - 2879.5)^2/2879.5 + (2912 - 2879.5)^2/2879.5
            = (32.5)^2/2879.5 + (32.5)^2/2879.5
            = 1056.25/2879.5 + 1056.25/2879.5
            = 0.3668 + 0.3668
            = 0.7336

P-value for SRM test: p ≈ 0.39
```

**No SRM concern.** A difference of 2,847 vs. 2,912 is well within normal random variation (p = 0.39). If the SRM p-value were below 0.01, that would indicate a bug in the randomization and the entire experiment would be invalid.

#### Step 7: Identify the Traps

Before making a recommendation, interrogate the process:

1. **Did they peek?** If the team checked results daily and decided to pull the analysis now because it "looked good," the effective p-value is much higher than 0.19. Peeking inflates false positives. Ask: was this the pre-committed analysis date?

2. **Is the sample large enough?** A power analysis for detecting a 0.78pp lift (from ~5% baseline) at 80% power would require roughly 12,000-15,000 users per group. We only had ~2,900 per group. This experiment was dramatically underpowered for this effect size. It was only powered to detect ~2pp+ differences.

3. **What about segment effects?** Resist the temptation to slice by device, geography, or user type looking for a winning segment. With p = 0.19 overall, finding a "winning segment" is almost certainly noise. If you must segment, pre-register those segments.

4. **Day-of-week and novelty effects?** How long did the test run? If less than 7 days, weekday/weekend variation could bias results. If the variant is "new-looking," early visitors might engage more due to novelty, which fades.

5. **Was conversion the right metric?** Did they track downstream metrics — trial-to-paid conversion, 30-day retention, revenue per visitor? A pricing page change could attract different-quality signups.

#### Step 8: Final Recommendation

> **Do not ship the variant based on this data.**
>
> The observed lift of 15.6% relative (0.78pp absolute) is not statistically significant (p = 0.19, 95% CI: [-0.38pp, +1.95pp]). The confidence interval includes zero and extends into negative territory.
>
> **However, do not conclude the variant is ineffective.** The experiment was underpowered. The data is *consistent with* a real positive effect up to ~2pp, which would be highly valuable.
>
> **Recommended action**: Continue the experiment to accumulate ~12,000+ visitors per group (approximately 4x longer), which would give 80% power to detect a 0.78pp difference. If the budget or timeline cannot support this, consider this result "inconclusive" and prioritize higher-impact experiments.
>
> **Confidence level**: Low. We can neither ship with confidence nor kill with confidence.

---

### Wrong Interpretations of the Same Data

Here are three common mistakes practitioners make with exactly this data set.

#### Mistake 1: "The variant won — it's a 15.6% lift!"

> "Group B converted at 5.77% versus 4.99% for control. That's a 15.6% improvement! Let's ship it."

**What's wrong**: This ignores statistical significance entirely. With p = 0.19, there is roughly a 1-in-5 chance of seeing a difference this large even if the variant has zero effect. The 15.6% number is the *observed* lift, not the *true* lift. Reporting it without the confidence interval (which includes negative values) is cherry-picking the point estimate and discarding the uncertainty. If you make decisions like this, about 1 in 5 of your "wins" will be false positives, and your aggregate "improvements" will not materialize in the long run.

#### Mistake 2: "The variant didn't work — the test failed"

> "p = 0.19, not significant. The variant doesn't work. Let's move on to the next test."

**What's wrong**: Absence of evidence is not evidence of absence. The test was underpowered — with only ~2,900 users per group, we could only reliably detect effects larger than ~2pp. A real 0.78pp effect (worth $112K/year) would be invisible to this experiment. Calling it "failed" throws away potentially valuable information. The correct conclusion is "inconclusive," not "no effect." This mistake kills good ideas prematurely.

#### Mistake 3: "Let's just keep running it until it's significant"

> "We're close — p = 0.19. Let's keep the test running for another week and check again."

**What's wrong**: This is the peeking problem (Trap #1). If you check after week 1 (not significant) and then keep running until you see p < 0.05, you have inflated your false positive rate far beyond 5%. Each "peek and continue" adds another chance for random fluctuation to cross the threshold. The p-value from a fixed-horizon test is only valid at the pre-committed stopping point. If you want to monitor continuously, you must use sequential testing methods (see Part 8), which use wider confidence intervals at each peek to compensate. The fix here is to commit to a sample size *before* the test starts and only analyze once at the end.

---

## Part 6: P-Value Interpretation Flowchart

### What a P-Value Actually Means

**In plain language**: A p-value tells you how surprised you should be by your data if the treatment truly had no effect. A small p-value means the data would be very unlikely under "no effect," which is evidence (not proof) that something real is going on.

**Precisely**: The p-value is the probability of observing a test statistic at least as extreme as the one computed from the data, assuming the null hypothesis is true.

```
P(observed data or more extreme | null hypothesis is true) = p-value
```

Critical distinction: The p-value is a statement about the DATA given the HYPOTHESIS, not a statement about the HYPOTHESIS given the DATA. Confusing these two is the most common mistake in applied statistics.

### "p < 0.05" Does NOT Mean "95% Chance the Treatment Works"

This confusion is pervasive, even among experienced practitioners. Here is why it is wrong:

- **p < 0.05** means: "If the null were true, data this extreme would occur less than 5% of the time"
- **p < 0.05 does NOT mean**: "There is a 95% probability that the alternative hypothesis is true"

The probability that a hypothesis is true depends on the *prior probability* — how likely the effect was before you ran the experiment. A drug that targets a well-understood mechanism with strong preclinical data might have a 60% prior probability of working. A random button color change might have a 5% prior. The same p-value means very different things in these two contexts.

### The 5 Most Common P-Value Misinterpretations

| # | The Misinterpretation | The Correction |
|---|---|---|
| 1 | "p = 0.03 means there's a 3% chance the null hypothesis is true" | No. The p-value tells you the probability of the data given the null, not the probability of the null given the data. To get P(null is true \| data), you need Bayes' theorem and a prior. |
| 2 | "p = 0.03 means there's a 97% chance the treatment works" | No. This is the same error flipped. The complement of the p-value is not the probability of the effect being real. A treatment with a low prior probability of working can easily produce p = 0.03 and still be a false positive. |
| 3 | "p = 0.001 is a stronger effect than p = 0.04" | No. P-values reflect a combination of effect size AND sample size. A tiny, trivial effect with n = 1,000,000 can produce p = 0.001. A large, meaningful effect with n = 50 can produce p = 0.04. Always report effect size alongside p-values. |
| 4 | "p = 0.06 means the result is not significant, so there's no effect" | No. A p-value just above 0.05 is not meaningfully different from one just below. The difference between p = 0.04 and p = 0.06 is itself not statistically significant. A non-significant result means the data are inconclusive, not that the effect is zero. |
| 5 | "We got p = 0.05 in the first study and p = 0.05 in the replication, so the combined evidence is p = 0.0025" | No. You cannot multiply p-values. There are proper meta-analytic methods (Fisher's method, Stouffer's method), but naive multiplication is invalid. However, getting p ~0.05 in two independent replications IS stronger evidence than a single p = 0.05 — it's just not p = 0.0025. |

### When P-Values Are Misleading

**1. Huge sample sizes ("everything is significant")**
With n = 10,000,000 (common in tech), a 0.01% conversion rate difference will be highly statistically significant (p < 0.001) but utterly meaningless in practice. At massive scale, p-values lose their usefulness for decision-making. Focus on effect sizes and confidence intervals instead.

**2. Multiple comparisons ("garden of forking paths")**
If you test 20 metrics, one will show p < 0.05 by pure chance. If you try 10 different subgroup splits, run the test after each day for 14 days, and look at 5 metrics, your effective number of comparisons is enormous and the nominal p-value is meaningless. See Part 8.

**3. Optional stopping ("peeking")**
If you check results every day and stop the first time p < 0.05, the actual false positive rate can be 20-30%, not 5%. The p-value is only valid at the pre-committed sample size.

**4. Researcher degrees of freedom / P-hacking**
Choosing which outliers to exclude, which covariates to control for, which time period to analyze, which metric definition to use — each choice affects the p-value. If these choices are made AFTER seeing the data, the reported p-value is misleadingly small. Pre-registration is the antidote.

**5. Non-representative samples**
A p-value tells you about sampling variability, not about bias. If your sample is biased (e.g., you only tested on mobile users but want to generalize to all users), a small p-value does not fix the bias problem.

### Alternatives to P-Values

| Approach | What It Tells You | When to Use | Advantage Over P-Values |
|---|---|---|---|
| **Confidence intervals** | The plausible range for the true effect size | Always, alongside or instead of p-values | Shows magnitude and direction, not just "significant or not" |
| **Effect sizes** (Cohen's d, relative lift, absolute difference) | How big the effect is, independent of sample size | Always | Separates "is it real?" from "does it matter?" |
| **Bayesian posterior probability** | P(hypothesis \| data), which is what people actually want to know | When you have a reasonable prior; when you need to make cost-weighted decisions | Directly answers "how likely is it that the treatment works?" and allows for nuanced beliefs (70% likely, not just yes/no) |
| **Bayes factors** | Ratio of evidence for H1 vs. H0 | When comparing specific hypotheses; when you want to quantify evidence FOR the null | Can provide evidence that there is NO effect, which p-values cannot do |
| **Expected loss / decision theory** | "If I ship this, what's the expected cost of being wrong?" | High-stakes decisions; when false positives and false negatives have different costs | Directly optimizes for business outcomes, not arbitrary thresholds |
| **Replication** | Did the effect hold up in a new sample? | After an initial significant result; for high-impact decisions | More convincing than any single statistical test |

### Decision Framework: "The P-Value Is X. Here's What to Do."

This framework assumes a pre-registered hypothesis, a single primary metric, no peeking, and adequate power. Adjust if any of those assumptions are violated.

| P-Value | Interpretation | Typical Action | Caveats |
|---|---|---|---|
| **p < 0.001** | Very strong evidence against the null. Highly unlikely to be a false positive (assuming no p-hacking). | Ship the change with confidence. Monitor post-launch guardrails. | Still check effect size — a statistically certain 0.01% improvement is still not worth engineering effort. At very large sample sizes, trivial effects reach this threshold easily. |
| **p < 0.01** | Strong evidence against the null. | Ship if the effect size is practically meaningful. Worth prioritizing. | Consider the prior probability of the effect. A surprising result at p = 0.008 still warrants a closer look at the methodology. |
| **p < 0.05** | Moderate evidence against the null. Conventional threshold for "significance." | Ship if effect size justifies it AND the downside of a false positive is low. Consider replicating for high-stakes decisions. | This is an arbitrary threshold. p = 0.049 and p = 0.051 are not meaningfully different. About 1 in 20 of your "significant" results at this level are false positives (if the null is true). |
| **p = 0.05 to 0.10** | Weak evidence. Suggestive but inconclusive. | Do not ship based on this alone. Consider extending the experiment for more power, or running a follow-up. Use as input for prioritization, not for decision. | Many real effects produce p-values in this range when the experiment is underpowered. This does not mean "no effect." |
| **p = 0.10 to 0.20** | Very weak evidence. The data cannot distinguish signal from noise. | The experiment is inconclusive. Assess whether the potential effect size (from the CI) is worth investigating further. | If the power analysis shows the experiment was adequately powered and p is still 0.15+, it is reasonable to deprioritize this idea. If the experiment was underpowered, the result is uninformative. |
| **p > 0.20** | No meaningful evidence against the null. | If adequately powered, this is a "flat" result — move on. If underpowered, the experiment was uninformative. | "No evidence of effect" is not "evidence of no effect" unless you had sufficient power (80%+) to detect the minimum effect size of interest. |

---

## Part 7: Effect Size Reference Table

### Effect Sizes by Domain

Knowing that something is "statistically significant" is only half the story. You need to know whether the effect is *large enough to matter*. These benchmarks are drawn from published experiments and industry experience. Use them to calibrate expectations and sanity-check results.

#### Ecommerce Conversion Rate Changes

| Size | Relative Lift | Example |
|---|---|---|
| **Small** | < 5% relative | Changing button color from blue to green. Moving a trust badge. Minor copy tweaks. |
| **Medium** | 5% - 15% relative | Meaningful CTA copy change. Simplified checkout flow. Adding social proof. |
| **Large** | > 15% relative | Fundamentally restructured page. Removed a major friction point (e.g., eliminated account creation requirement). Changed pricing model. |

Typical median effect: Most tests show < 5% relative lift. The median A/B test has near-zero effect.

#### Email Open Rate Changes

| Size | Absolute Change | Example |
|---|---|---|
| **Small** | < 3 percentage points | Subject line word swap. Minor personalization (first name). |
| **Medium** | 3 - 8 percentage points | Fundamentally different subject line angle. Send time optimization. Segmented vs. batch send. |
| **Large** | > 8 percentage points | New sender name/address. Triggered vs. batch email. Radical format change (plain text vs. HTML). |

#### SaaS Monthly Churn Rate Improvements

| Size | Absolute Change (per month) | Example |
|---|---|---|
| **Small** | < 0.5 percentage points | Minor onboarding tweak. Additional email nurture sequence. |
| **Medium** | 0.5 - 1.5 percentage points | Significant product improvement. Proactive customer success outreach. Better self-service support. |
| **Large** | > 1.5 percentage points | Fundamentally improved product-market fit. Pricing restructure. Major UX overhaul. |

Note: Churn is compounding. A 0.5pp/month reduction (e.g., from 5.0% to 4.5%) over 12 months significantly changes LTV. Even "small" churn improvements are often practically significant.

#### Pricing Page Conversion Rate Changes

| Size | Absolute Change | Example |
|---|---|---|
| **Small** | < 1 percentage point | Layout adjustment. Minor copy change. |
| **Medium** | 1 - 3 percentage points | Restructured pricing tiers. Added/removed a plan. Better feature comparison. Social proof and case studies. |
| **Large** | > 3 percentage points | Fundamentally different pricing strategy (e.g., freemium to free trial). Removed pricing page entirely (PLG motion). Dramatic simplification. |

#### General "Cohen's d" Reference (for continuous outcomes)

| Size | Cohen's d | What It Means |
|---|---|---|
| **Small** | 0.2 | Barely noticeable to the naked eye. Requires large samples to detect. |
| **Medium** | 0.5 | Noticeable if you look. Practically meaningful in most contexts. |
| **Large** | 0.8+ | Obvious. Visible in raw data without statistics. |

Most digital experiments produce small effects (d < 0.2). Medium effects (d = 0.5) are rare and usually indicate a substantial intervention.

### Calibration: When to Be Skeptical

**If someone claims a 50% lift from a button color change, be skeptical.** Here is a calibration framework:

| Claimed Lift | Plausibility | What to Check |
|---|---|---|
| 1-5% relative | Highly plausible | Standard result for minor optimizations |
| 5-15% relative | Plausible | Should be a substantive change, not just cosmetic |
| 15-30% relative | Unusual | Verify: Was the test adequately powered? Was there peeking? Is the baseline metric correct? Check for SRM. |
| 30-50% relative | Rare | Almost always indicates a measurement error, a bug in the test, or a very unusual situation (e.g., fixing a broken checkout flow) |
| > 50% relative | Extremely rare | Assume error until proven otherwise. Triple-check: the tracking, the randomization, the metric definition, and the sample ratio. The few legitimate 50%+ lifts come from fixing outright broken experiences. |

**The "1/10/100" heuristic**: For every 10 tests you run, expect roughly 7 flat results, 2 small-to-medium effects, and 1 larger effect. If your win rate is much higher than that, your measurement or decision process is probably biased.

### Historical Effect Size Distributions from Published Experiments

Large-scale analyses of A/B testing platforms reveal consistent patterns:

- **Median effect of all A/B tests: approximately 0%** — most experiments show no meaningful difference. This is expected and healthy; it means the control is already reasonably good.
- **Distribution is roughly symmetric around zero** — negative results are about as common as positive results among statistically significant tests.
- **The 90th percentile of absolute effect sizes is typically 5-10% relative** in conversion rate experiments.
- **Publication bias inflates reported effects** — published case studies and conference talks disproportionately feature large effects. The true distribution of effects is far more modest. A meta-analysis by Azevedo et al. (2020) of ~26,000 experiments at Microsoft found that most effects were small.
- **Organizational learning matters** — teams that have been optimizing for years see diminishing marginal returns. Early experiments on an unoptimized page yield larger effects than mature optimization programs.

**Key takeaway**: If your organization is routinely reporting 20%+ lifts from simple A/B tests, the most likely explanation is not that your team is exceptionally good — it is that your measurement methodology is biased (peeking, cherry-picking metrics, post-hoc segmentation, or SRM issues). Audit the process before trusting the numbers.

---

## Part 8: Multiple Comparisons and Sequential Testing

### The Multiple Comparisons Problem

Every time you conduct a statistical test at α = 0.05, there is a 5% chance of a false positive (rejecting the null when it is true). When you run multiple tests, those chances accumulate:

```
P(at least one false positive) = 1 - (1 - α)^k

where k = number of independent tests

k = 1:   P(false positive) = 5.0%
k = 5:   P(false positive) = 22.6%
k = 10:  P(false positive) = 40.1%
k = 20:  P(false positive) = 64.2%
k = 50:  P(false positive) = 92.3%
k = 100: P(false positive) = 99.4%
```

**With 20 tests at α = 0.05, you will almost certainly get at least one "significant" result by pure chance.** This is not a theoretical concern — it is the primary driver of non-reproducible findings in A/B testing programs.

Multiple comparisons arise from:
- Testing many metrics (conversion, revenue, engagement, retention, ...)
- Testing many subgroups (mobile/desktop, new/returning, by country, ...)
- Checking results at many time points (daily peeks)
- Testing many variants (A/B/C/D/E)
- Combining all of the above (5 metrics x 4 segments x 10 time points = 200 implicit tests)

### Correction Methods

#### Bonferroni Correction

The simplest approach. Divide your significance threshold by the number of tests:

```
Adjusted α = α / k

For 20 tests: α_adjusted = 0.05 / 20 = 0.0025
```

Equivalently, multiply each p-value by k and compare to the original α.

**When to use**: Small number of pre-planned comparisons (3-5 metrics). When false positives are very costly.

**When NOT to use**: Large number of tests (becomes too conservative). With 100 tests, Bonferroni requires p < 0.0005, which makes it nearly impossible to detect real effects. This overcorrection increases false negatives dramatically.

**Practical guideline**: Bonferroni is appropriate for up to ~5-10 comparisons. Beyond that, use Benjamini-Hochberg.

#### Benjamini-Hochberg (False Discovery Rate Control)

Instead of controlling the probability of *any* false positive (family-wise error rate), BH controls the *proportion* of false positives among all rejected nulls (false discovery rate, FDR).

**Procedure**:
1. Sort all k p-values from smallest to largest: p(1) ≤ p(2) ≤ ... ≤ p(k)
2. For each p(i), calculate the BH threshold: (i / k) * α
3. Find the largest i such that p(i) ≤ (i / k) * α
4. Reject all hypotheses for p(1) through p(i)

**Example with 10 metrics (α = 0.05)**:

| Rank (i) | Metric | P-value | BH Threshold (i/10 * 0.05) | Reject? |
|---|---|---|---|---|
| 1 | Conversion rate | 0.003 | 0.005 | Yes |
| 2 | Revenue per visitor | 0.012 | 0.010 | No* |
| 3 | Add-to-cart rate | 0.025 | 0.015 | No |
| 4 | Bounce rate | 0.031 | 0.020 | No |
| 5 | Pages per session | 0.044 | 0.025 | No |
| 6-10 | (other metrics) | 0.08-0.72 | 0.030-0.050 | No |

*Note: Even though p(2) = 0.012 < 0.05, it exceeds its BH threshold of 0.010, so it is not significant after correction.

**When to use**: You have many metrics (5-50+) and want a balance between false positive control and statistical power. This is the standard recommendation for A/B test platforms with multiple metrics.

**FDR level**: With BH at FDR = 0.05, approximately 5% of your significant results will be false positives. This is less strict than Bonferroni (where essentially 0% of results should be false positives) but much more powerful.

#### Holm-Bonferroni (Step-Down Procedure)

A strictly more powerful version of Bonferroni:
1. Sort p-values smallest to largest
2. Compare the smallest p-value to α / k
3. If significant, compare the second smallest to α / (k-1)
4. Continue until a comparison fails — stop rejecting

**When to use**: When you want family-wise error rate control (like Bonferroni) but with more power. There is essentially no reason to use Bonferroni over Holm-Bonferroni.

#### Hierarchical Testing (Gatekeeping)

Pre-specify a primary metric and secondary metrics. Only test secondary metrics if the primary metric is significant at α = 0.05 (no correction needed). This preserves the full α = 0.05 for your primary metric while still allowing secondary exploration.

**When to use**: Most A/B tests. You should almost always have a single primary metric. This is the simplest and most practical approach for teams that do not want to think about corrections.

### Sequential Testing / Always-Valid Confidence Intervals

Traditional hypothesis tests are only valid at a single, pre-determined sample size. But in practice, teams want to monitor experiments continuously and stop early if the result is clear. Sequential testing methods make this possible without inflating false positive rates.

#### The Peeking Problem Quantified

If you check a standard (fixed-horizon) test at multiple time points and stop the first time p < 0.05:

| Number of Peeks | Actual False Positive Rate | Inflation Factor |
|---|---|---|
| 1 (no peeking) | 5.0% | 1.0x |
| 2 | 8.3% | 1.7x |
| 5 | 14.2% | 2.8x |
| 10 | 19.3% | 3.9x |
| 20 | 24.8% | 5.0x |
| Continuous monitoring | ~30% | 6.0x |

At 20 peeks, your "5%" test is actually a 25% test. Nearly 1 in 4 "wins" is a false positive.

#### Always-Valid Confidence Intervals (Confidence Sequences)

These are confidence intervals that remain valid at every sample size simultaneously. They are wider than fixed-horizon CIs (the price of flexibility) but allow for continuous monitoring without alpha inflation.

**How they work**: Instead of spending all your alpha "budget" at one time point, they spread it across all possible stopping times. Early in the experiment, the intervals are much wider than traditional CIs. As data accumulates, they shrink toward the traditional CI width.

**Practical implementations**: Most modern experimentation platforms (Optimizely, Eppo, Statsig) now offer always-valid confidence intervals or similar sequential methods by default.

### Group Sequential Designs (Planned Interim Analyses)

If you know in advance that you want to check results at specific milestones (e.g., at 25%, 50%, 75%, and 100% of the target sample size), you can pre-plan these "looks" and adjust the alpha at each look.

**O'Brien-Fleming boundaries**: The most common approach. Uses very strict thresholds early (when data is sparse) and near-standard thresholds at the final analysis.

| Analysis | % of Sample | O'Brien-Fleming α | Required z |
|---|---|---|---|
| 1st interim | 25% | 0.0001 | 3.73 |
| 2nd interim | 50% | 0.0054 | 2.55 |
| 3rd interim | 75% | 0.0184 | 2.09 |
| Final | 100% | 0.0412 | 1.74 |

**Overall Type I error**: Still 5% across all four analyses.

**Advantage**: The final-look threshold (0.0412) is barely lower than 0.05, so you lose almost no power if the experiment runs to completion. But you gain the ability to stop early if the effect is very large.

**When to use**: Planned, high-stakes experiments where you want the option to stop early for efficacy or futility. Requires pre-commitment to the interim analysis schedule.

### Practical Recommendation

For most teams, the right approach depends on your experimentation maturity:

**If you are just starting out:**
- Use fixed-horizon tests. Pre-commit to a sample size using a power calculator. Do not look at results until the experiment reaches that sample size. Use hierarchical testing (one primary metric, test secondaries only if the primary wins). This is simple, robust, and hard to get wrong.

**If you have a mature experimentation program:**
- Use always-valid confidence intervals (most modern platforms support this). Monitor experiments continuously but only stop when the confidence interval excludes zero (or excludes your minimum detectable effect). Apply Benjamini-Hochberg correction across secondary metrics.

**If you are running a high-stakes experiment (pricing change, major redesign):**
- Use a group sequential design with pre-planned interim analyses. Pre-register your primary metric, your sample size, and your interim analysis schedule. Consider using a Bayesian approach with expected loss to make the final ship/no-ship decision.

**Universal advice, regardless of approach:**
- Pre-register your primary metric and target sample size
- Do not peek at results with fixed-horizon tests (or use sequential methods if you must)
- Treat any post-hoc segment analysis as hypothesis-generating, not confirming
- Apply multiple comparison corrections when you evaluate more than one metric
- Report effect sizes and confidence intervals, not just p-values
- If it seems too good to be true, check for SRM and instrumentation bugs before celebrating
