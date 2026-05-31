# The Fit × Timing Join — A Build Spec

**The data architecture beneath Layer 1. A companion to the List & Segmentation Module.**

The List & Segmentation Module established that the list you want is the **intersection of Fit and Timing** (Module §2). This spec is how that intersection gets *physically built* in a data tool — what to pull, what to watch, and how to keep it honest — so that every row you send to is a true bet (Constitution, Article II: the *match* between a real tension and a credible resolution).

> **The principle that governs this whole layer:**
> **Fit is the static base. Timing is the dynamic overlay. Verification is the honesty layer. The *join* is where a row becomes a qualified, message-ready lead** — fit-confirmed × signal-confirmed × verified. A row missing any of the three is not a lead; it's a liability.

This spec owns the **architecture and the integrity rules.** The **tool mechanics** belong to the skills: `coldiq-gtm` → `clay` (`clay-enrichment-9step`, `clay-buying-signals-5`), `signal-sourcer` (signal detection), and `list-building` (`lead-sources-guide`). Where this spec says "waterfall" or "AI column," the *how* is in those skills; the *logic above them* is here.

---

## §1 — The anatomy of a qualified row

Every row in your build passes through three layers. A row is not "a lead" until all three are satisfied.

```
┌─ FIT LAYER (static) ──────────────────────────────────────┐
│  Who they structurally are. Built once, refreshed slowly.  │
│  Firmographic · technographic · role/mandate.              │
│  → Answers: do they STRUCTURALLY have the tension?         │
└────────────────────────────────────────────────────────────┘
                          ⊗  (the join)
┌─ TIMING LAYER (dynamic) ──────────────────────────────────┐
│  What just happened. Continuously watched, timestamped.    │
│  Signal events, graded H / M / L.                          │
│  → Answers: do they have the tension RIGHT NOW?            │
└────────────────────────────────────────────────────────────┘
                          ⊗  (verified by)
┌─ VERIFICATION LAYER (honesty) ────────────────────────────┐
│  Is the data real, current, deduplicated, deliverable?     │
│  The enrichment waterfall + freshness + confidence.        │
│  → Answers: can I TRUST this row enough to act on it?      │
└────────────────────────────────────────────────────────────┘
                          =
              QUALIFIED ROW → assign to Segment Thesis → copy
```

The discipline of the whole spec is in that last word of each layer: **structurally / right now / trust.** Miss the first and the message is irrelevant. Miss the second and it's mistimed. Miss the third and it's built on a lie — which, per the Module (§3) and the Constitution's prohibition on inventing facts (Article X), is worse than not sending at all.

---

## §2 — Fit: what attributes to pull

The Module's rule is absolute: **firmographics are proxies for tension, not the goal.** That gives the selection rule for fit data:

> **Pull only the attributes that are proxies for the tension you defined. Ignore the rest, however available.** A field you won't use in fit-scoring or messaging is cost without return — the data-layer version of over-segmentation (Module §6).

**The four families of fit attributes**, and what each typically proxies:

| Family | Example attributes | What it proxies (the tension link) |
|---|---|---|
| **Firmographic** | Industry/vertical, business model, stage, headcount, revenue, growth rate, funding status, geography | The *structural conditions* that make a tension likely |
| **Technographic** | Tools present / absent in the stack, tech maturity | Often the **sharpest** proxy — *presence or absence of a specific tool* directly implies a workflow gap |
| **Role / mandate** | Title, function, seniority, **what they're accountable for** | The **mandate** is the real proxy; title is just its label |
| **Structural** | Do they have a team for X yet? Org shape, headcount in a specific function | Whether the problem is owned by anyone — or falling through cracks |

**The triangulation rule.** Single attributes are weak proxies; **combinations triangulate the tension.** "Headcount" tells you little. "Has 2 AEs, no RevOps hire, no CRM admin" strongly implies *"no sales process"* — because the combination points at one tension. Choose and combine fit attributes to *converge on the felt-problem*, not to describe the company generically.

> **Test for every fit column:** does this attribute (alone or in combination) make the presence of the tension *more certain*? If it doesn't move the fit judgment, don't pull it. **Enrich until it changes a decision, then stop.**

The sharpest fit attribute is usually the one that most directly implies the tension — frequently a **technographic absence** ("uses X but not Y") or a **structural gap** ("scaling fast but no one owns Z"), not a headline firmographic.

---

## §3 — Timing: which signals to watch, per subvertical

Timing is the dynamic overlay. The Module and Constitution already set the grading discipline; this section is about **deriving the right signal set for each subvertical** and watching it correctly.

**Every subvertical watches a different signal set, because each has a different "why now."** This follows directly from the Segment Thesis (Module §5): the thesis's *why-now* line **is** the specification for which signals to watch. You do not pick signals from a generic menu — you derive them from each subvertical's tension.

**The grading discipline (from the Constitution, Article VIII):** a signal earns its place only if it is *evidence of the specific tension*, not generic activity. Grade every signal H / M / L and match the claim to the grade. Mining low-value signals (abundant, scrapeable) and loading them with high-value claims is the cardinal error — the reader feels the weight mismatch.

**Map your signals onto the outreach taxonomy** (owned by `coldiq-gtm`; `outreach-4-categories` and the signal libraries). At the data layer, the categories tell you *where to source the signal*:

| Category | What it is | Where it's detected | Typical grade |
|---|---|---|---|
| **Inbound** | They raised a hand (site visit, download, engagement) | Your own properties, de-anonymization | High |
| **Bridgebound** | Third-party evidence bridging cold→warm: firmographic triggers, symptoms, in-market behavior, relationship & hiring signals | Signal sources, intent data, job boards, news | Medium–High |
| **Postbound** | Re-engaging those previously in motion (past opps, churned, prior champions who moved) | CRM, history | Medium–High |
| **Outbound** | Pure cold — fit only, no live signal | n/a (this is the "fit without timing" quadrant) | Low timing |

→ Signal libraries to draw the actual triggers from: `coldiq-gtm` → `buying-signals-6`, `inbound-triggers-30`, `outbound-triggers-6`, and the Bridgebound families (`bridgebound-firmographic-15`, `bridgebound-symptoms-11`, `bridgebound-in-market-20`, `bridgebound-relationship-39`, `bridgebound-history-16`). Signal *detection* mechanics: `signal-sourcer`.

**Freshness is part of the signal.** A signal is a claim about *now*. A six-month-old "just raised funding" is not a live signal — it's history. Every signal must be **timestamped**, and every signal type needs a **decay window** beyond which it stops counting as timing. An expired signal silently demotes a row from the high-timing quadrant back to fit-only; treat it accordingly.

**Worked example** (the two subverticals from the Module, Shopify DTC):

| | *Solo founder, sub-$1M* | *8-figure brand, has ops team* |
|---|---|---|
| Tension (why now) | "Drowning — doing everything myself" | "Ops leaking margin at scale" |
| **Fit attributes** | Shopify; <$1M GMV; 1–3 person team; no ops hire | Shopify Plus; 8-figure GMV; dedicated ops/finance headcount |
| **Signals watched** | First marketing hire; hit a revenue threshold; new SKU/launch volume spike | New Head of Ops/Finance; 3PL/ERP migration; opening a new channel or market |
| **Grade** | Medium (inferential of overwhelm) | High (active operational change) |

Same product, same vertical — **different fit profiles, different signals, different grades.** That divergence is exactly why they are separate subverticals (Module §6: segment until the message changes). If the fit attributes and signals *didn't* diverge, you'd have over-segmented.

---

## §4 — Verification: the enrichment-waterfall logic that keeps data honest

This is the layer the rest of the system depends on. **Data honesty** is the governing principle: a signal-based opener built on a hallucinated, stale, or mismatched fact is worse than no opener — it actively destroys trust and burns the prospect. The verification layer exists to make every fact you act on *true*.

**Why a waterfall, not a single source.** No single data provider has complete coverage, and all data goes stale. A **waterfall** queries providers *in sequence* — cheapest / most-likely-to-hit first, more expensive sources only if earlier ones miss — and stops as soon as it has a verified answer. This maximizes coverage, controls cost, and lets you cross-check facts across sources. (Mechanics: `coldiq-gtm` → `clay-enrichment-9step`.)

**The qualified-row pipeline** (the actual build order):

```
1. RESOLVE IDENTITY     company → domain → person (canonical keys)
2. FIT WATERFALL        firmographic providers in sequence → fit attributes
3. TECHNOGRAPHIC        stack detection (presence/absence) → sharpest proxies
4. SIGNAL DETECTION     watch + timestamp signals; apply decay windows
5. CONTACT WATERFALL    email/phone finders in sequence → contact data
6. VERIFY               email verification; cross-check critical facts
7. CONFIDENCE + NULLS   score each fact; handle missing fields fail-safe
8. DEDUP                against existing lists + CRM (person and company level)
9. QUALIFY              fit threshold AND signal threshold AND verified → READY
```

**The five data-honesty rules** (apply at steps 4–9; non-negotiable):

1. **Verify, don't trust.** Verify every email (protects deliverability *and* honesty). Cross-check any fact that will appear in copy. A fact good enough to *mention* must be good enough to *prove*.
2. **Freshness gates timing.** Timestamp everything; enforce decay windows (§3). Stale signals are demoted to fit-only, not treated as live.
3. **Confidence thresholds.** Score each enriched fact. **If a fact is below the confidence bar, drop it** — do not let a low-confidence inference become a personalization line. A dropped fact costs nothing; a wrong fact costs the prospect.
4. **Null-handling fails safe.** A missing field must **never** produce a broken `{{merge_tag}}` or a guessed value. The fallback is *vertical-depth messaging* (Module §4) — the segment-level message that's true of everyone in the subvertical — not a fabricated specific.
5. **Deduplicate ruthlessly.** Same person across sources and campaigns; same company hit by multiple reps. Dedup protects both the prospect's experience and your domain reputation.

**The AI-column rule.** When an enrichment or scoring step uses AI to *infer* fit or *grade* a signal (e.g., a Clay AI column reading a website to judge business model, or classifying a news item as a real trigger), the **playbook** is `coldiq-gtm`, but making that AI **reliable** — grounding it in source text, controlling hallucination, and running evals on its accuracy — is `ai-prompting-workflows`. An ungrounded AI column produces *guesses dressed as data*, which violates rule 1 and poisons everything downstream. AI may *propose* a fact; the verification layer must still *confirm* it before it's actionable.

---

## §5 — Anti-overkill at the data layer

The Module's overkill discipline (§6) applies to columns, signals, and providers exactly as it applies to segments. Every enrichment has a cost — money, maintenance, and latency — and they compound across thousands of rows.

> **Enrich until it changes a decision, then stop.**

Three stop-rules, mirroring the Module:

- **Decision-relevant.** If a column changes neither the fit judgment nor the message, cut it. (The data version of "segment until the message changes.")
- **Maintainable.** Every provider and signal watcher is a thing that breaks, drifts, and needs monitoring. Fewer, well-maintained sources beat a sprawl you can't keep honest.
- **Latency-aware.** A deep waterfall on every row is slow and expensive. Gate the expensive steps behind the cheap ones (the waterfall already does this) and behind a *fit pre-filter* — don't run the full contact/verification stack on rows that fail fit.

This is the Constitution's **Executor** ("can we actually run and maintain this?") and **Contrarian** ("does this column earn its keep?") operating at the data layer.

---

## §6 — Integration with the Skill OS

This spec is the **architecture and integrity logic** of the join. The skills own the **how**.

| Build stage | What this spec governs | Skill that owns the HOW |
|---|---|---|
| Define the tension fit proxies | Which attributes imply the tension | `research-market-analysis` (the tension, VOC) |
| Fit sourcing | The static base population | `coldiq-gtm` → `list-building` (`lead-sources-guide`) |
| Signal selection & grading | Per-subvertical "why now" → signal set | `coldiq-gtm` → `buying-signals-6`, `bridgebound-*`, `inbound/outbound-triggers` |
| Signal detection | Watching + capturing signals | `coldiq-gtm` → `signal-sourcer` |
| Enrichment waterfall | Sequence, coverage, cost discipline | `coldiq-gtm` → `clay-enrichment-9step`, `clay-buying-signals-5` |
| AI inference columns | Grounding, hallucination control, evals | `ai-prompting-workflows` |
| Email verification | Honesty *and* deliverability protection | `email-marketing` (verification → domain reputation) |
| Qualified row → message | Thesis assignment, then copy | List & Segmentation Module → `elite-copywriting` / `coldiq-gtm` |

**Where this sits in the system:**
```
WHY + ORDER (all of cold outbound)     → THE COLD OUTBOUND CONSTITUTION
WHY + ORDER (Layer 1: who)             → THE LIST & SEGMENTATION MODULE
ARCHITECTURE + INTEGRITY (the join)    → THIS SPEC
Tools (fit / signal / enrichment / AI) → coldiq-gtm · ai-prompting-workflows
Deliverability of the eventual send    → email-marketing
```

A closing connection to the Sharpening Loop (Constitution, Article IX): the verification layer is also what makes sharpening *possible*. You can only learn from reply data if the data you sent on was honest — otherwise a "bad" result might just be bad data, and you'll change the wrong variable. **Clean data is the precondition for a readable signal.** The honesty layer protects not just this campaign, but your ability to improve every campaign after it.

---

## Appendix A — Fit Attribute Selection (checklist)

```
For each candidate fit attribute:
[ ] Does it proxy the tension you defined?           (if no → don't pull)
[ ] Alone OR combined, does it make the tension
    MORE certain?                                    (if no → don't pull)
[ ] Will it be used in fit-scoring OR messaging?     (if no → don't pull)

Then triangulate:
[ ] Have you combined attributes so they CONVERGE on
    one tension, not just describe the company?
[ ] Is your sharpest proxy a technographic ABSENCE or
    structural GAP, rather than a headline firmographic?

RULE: Enrich until it changes a decision, then stop.
```

## Appendix B — Per-Subvertical Signal Map (template, one per subvertical)

```
SUBVERTICAL: ______________________________________________
TENSION (why now, from Segment Thesis): _________________

FIT PROFILE (static):
  Firmographic: ___________________________________________
  Technographic (presence/absence): _______________________
  Role / mandate: _________________________________________
  Structural: _____________________________________________

SIGNALS WATCHED (dynamic) — each must be EVIDENCE of the tension:
  Signal 1: __________________  Category: In/Bridge/Post/Out  Grade: H/M/L  Decay: ___
  Signal 2: __________________  Category: ________________    Grade: _____  Decay: ___
  Signal 3: __________________  Category: ________________    Grade: _____  Decay: ___

CHECK: Do the fit profile AND signals DIVERGE from your other
       subverticals? (If not → you've over-segmented; merge.)
```

## Appendix C — The Qualified-Row Pipeline (checklist)

```
[ ] 1. IDENTITY resolved (company → domain → person; canonical keys)
[ ] 2. FIT waterfall run; fit attributes populated
[ ] 3. TECHNOGRAPHIC stack detected (presence/absence captured)
[ ] 4. SIGNALS detected, TIMESTAMPED, decay windows applied
[ ] 5. CONTACT waterfall run (email/phone)
[ ] 6. VERIFIED (email verified; copy-facing facts cross-checked)
[ ] 7. CONFIDENCE scored; NULLS handled fail-safe (no broken merge tags)
[ ] 8. DEDUPED (person + company, vs lists and CRM)
[ ] 9. QUALIFIED = fit threshold AND signal threshold AND verified
        → assign Segment Thesis → hand to copy
```

## Appendix D — The Data-Honesty Rules (pin these)

```
1. VERIFY, DON'T TRUST   — mentionable means provable. Verify every email;
                           cross-check every copy-facing fact.
2. FRESHNESS GATES TIMING — timestamp all signals; enforce decay windows;
                           stale signal → demote to fit-only.
3. CONFIDENCE THRESHOLDS  — below the bar, DROP the fact. A dropped fact is
                           free; a wrong fact burns the prospect.
4. NULLS FAIL SAFE        — missing field → fall back to vertical-depth
                           messaging, NEVER a guess or a broken {{tag}}.
5. DEDUPE RUTHLESSLY      — protects the prospect's experience AND your domain.

AI COLUMNS: may PROPOSE a fact; the verification layer must CONFIRM it.
            Ungrounded AI = guesses dressed as data. Ground it; eval it.
            (→ ai-prompting-workflows)
```

---

*End of spec. Fit says who. Timing says when. Verification says it's true. A row earns the send only when all three agree.*
