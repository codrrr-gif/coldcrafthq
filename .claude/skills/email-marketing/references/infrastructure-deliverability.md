# Infrastructure & Deliverability — Domains, DNS, Warmup & Sender Reputation

The foundation layer of the system. None of the copy, targeting, or sequencing matters if
emails land in spam. Infrastructure is the 30% of the 30/30/50 rule that determines whether
your message reaches a human inbox at all. This is where most operators cut corners and where
elite operators build an unfair advantage before they send a single cold email.

---

## Table of Contents
1. Domain Purchasing Strategy
2. Inbox Architecture
3. DNS Setup — SPF, DKIM, DMARC
4. Custom Tracking Domains
5. Warmup Protocols
6. Inbox Rotation & Pool Management
7. Send Volume Discipline
8. Sender Reputation Management
9. Deliverability Monitoring
10. Troubleshooting & Recovery Playbooks

---

## 1. Domain Purchasing Strategy

### The Domain Math

The formula: **daily email target / 50 = minimum domains needed.**

Every domain is a reputation container. Concentrate too much volume on one domain and you
create a single point of failure. Distribute across many and you build resilience.

| Daily Volume Target | Domains Needed | Inboxes (3/domain) | Effective Daily Capacity |
|---|---|---|---|
| 100/day | 2-3 | 6-9 | ~150-270 |
| 300/day | 6 | 18 | ~540 |
| 500/day | 10 | 30 | ~900 |
| 1,000/day | 20 | 60 | ~1,800 |

Top performers maintain 10+ domains for cold email. This is not overkill — it is
risk distribution. If one domain gets burned, the other nine keep running.

### Domain Naming Conventions

The domain must be obviously related to your brand. A company called Acme Corp sending
from `reallygoodproducts.com` is a spam signal. The domain needs to look like a plausible
variation of the sender's real business.

**Prefixes that work**: `get-`, `try-`, `hello-`, `connect-`, `meet-`, `use-`, `go-`, `with-`, `hi-`
**Suffixes that work**: `-hq`, `-team`, `-mail`, `-connect`

**Examples for a company called Acme**:
`getacme.com`, `tryacme.com`, `helloacme.com`, `acmehq.com`, `meetacme.com`

**What gets flagged**:
- Hyphens within the brand name: `acme-corp-sales.com`
- Numbers: `acme123.com`
- Zero brand association with the sender's actual company
- Subdomains of the primary domain (`outreach.acme.com`) — reputation flows upstream to the parent

### TLD Selection

| TLD | Deliverability | Notes |
|---|---|---|
| `.com` | Best | Highest trust with inbox providers. Always the first choice. |
| `.co` | Strong | Good alternative when `.com` is taken |
| `.io` | Acceptable | Works for tech companies; slightly lower trust than `.com` |
| `.tech` | Acceptable | Niche but functional for tech-oriented outreach |
| `.xyz`, `.top`, `.work`, `.click`, `.biz` | Avoid | Spam magnets. Heavily flagged by filters. |

**Rule**: Default to `.com`. Only consider `.co` or `.io` when all reasonable `.com` variations
are genuinely unavailable.

### Domain Age Requirements

Domain age is a trust signal. New domains sending volume immediately is a classic spam pattern.

- **Absolute minimum before any sending**: 2 weeks (with warmup active)
- **Recommended minimum**: 30 days aged before starting warmup
- **Ideal**: 90+ days. Domains aged 3+ months handle higher volumes significantly better.
- **Fully mature**: 12+ weeks for a domain to be considered mature by inbox providers

**Planning implication**: Buy domains 4-8 weeks before you plan to launch campaigns. This is
not optional preparation — it is a deliverability requirement. Buying domains on launch day
is a guaranteed inbox placement problem.

### Where to Buy

No meaningful deliverability difference between registrars. What matters is DNS setup and warmup.

- **Namecheap** — popular among cold emailers, affordable, easy DNS management
- **Cloudflare Registrar** — at-cost pricing, excellent DNS performance
- **Porkbun** — affordable, clean interface
- **GoDaddy** — works fine despite mixed reputation; widely used
- **Squarespace Domains** (formerly Google Domains) — seamless with Google Workspace

Purchasing aged/second-hand domains (1+ years old) gives a head start on domain age signals,
but verify the domain has no blacklist history before buying.

---

## 2. Inbox Architecture

### Inboxes Per Domain

- **Conservative/recommended**: 2-3 email addresses per domain
- **Maximum safe**: 5 inboxes per domain (beyond this, cross-contamination risk increases)
- **Sweet spot**: 3 inboxes per domain — optimal balance of cost-efficiency and deliverability

**Reference architecture for 10 domains**:
```
10 domains x 3 inboxes = 30 inboxes
30 inboxes x 30 cold emails/day = 900 cold emails/day capacity
```

### Provider Selection

| Provider | Official Daily Limit | Safe Cold Limit | Inbox Placement Rate | Spam Rate | Cost/User/Month |
|---|---|---|---|---|---|
| Google Workspace | 2,000/day | 30-50/day | 87.2% | 6.8% | ~$7-14 |
| Microsoft 365 | 10,000 recipients/day (30/min rate limit) | 30-50/day | 75.6% | 14.6% | ~$6-12 |
| Outlook.com (free) | 300/day | 20-30/day | Lower | Higher | Free |
| Zoho Mail | 500/day | 20-30/day | Variable | Variable | ~$1-4 |

**The verdict**: Google Workspace leads in inbox placement (87.2% vs 75.6% for Outlook) and
has a lower spam rate (6.8% vs 14.6%). However, diversifying across both Google and Microsoft
is smart risk management. If one provider cracks down, the other keeps running.

**Recommended split**: 70% Google Workspace / 30% Microsoft 365 for most operations.

### Inbox Naming Conventions

Use real human names. The inbox address and display name must look like a real person.

**Formats that work**: `firstname@`, `firstname.lastname@`, `flastname@`
**Display name**: Full name (e.g., "Sarah Miller"), not just the email address

**What to avoid**:
- Generic: `sales@`, `info@`, `outreach@`, `noreply@`, `team@`
- Impersonal: `contact123@`, `dept-sales@`
- 3-5 inboxes per SDR across 2+ domains is the standard configuration

### Forwarding & Centralized Reply Management

- Forward all outreach inboxes to a single **master inbox** for centralized reply management
- In Google Workspace Admin: Apps > Google Workspace > Gmail > Default Routing
- Enable **ARC headers** on forwarded emails to preserve authentication
- Apply filters in the master inbox to separate warmup traffic from real prospect replies

---

## 3. DNS Setup — SPF, DKIM, DMARC

DNS authentication is the non-negotiable prerequisite. Since February 2024, Gmail requires
SPF, DKIM, and DMARC for bulk senders. Since May 2025, Outlook/Microsoft enforces the same.
Authenticated senders are **2.7x more likely to reach the inbox** than unauthenticated senders.

### SPF (Sender Policy Framework)

SPF tells receiving servers which IP addresses and services are authorized to send email on
behalf of your domain.

**Syntax**:
```
v=spf1 include:_spf.google.com ~all
```

**The 10-lookup limit** — the single biggest SPF pitfall:
- Each `include:`, `a:`, `mx:`, and `redirect=` mechanism counts as one DNS lookup
- Nested includes count toward the limit
- If lookups exceed 10, SPF returns `permerror` — email is treated as unauthenticated
- `ip4:` and `ip6:` mechanisms do NOT count toward the limit

**Workarounds when you hit the limit**:
- Assign each sending service a dedicated subdomain with its own simple SPF record
- Use SPF flattening tools (AutoSPF, etc.) that resolve includes to raw IP addresses
- Remove unused `include:` entries for services no longer in use

**Example for Google Workspace + sending tool**:
```
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

**Hard fail vs. soft fail**: Use `~all` (soft fail) as a safe starting point. Move to
`-all` (hard fail) once you have confirmed all legitimate sending sources are included.

### DKIM (DomainKeys Identified Mail)

DKIM cryptographically signs each email, proving it was not tampered with in transit.

**Setup**:
1. Generate a 2048-bit key pair (minimum — 1024-bit is outdated and insufficient)
2. Publish the public key as a TXT record at `selector._domainkey.yourdomain.com`
3. The selector is visible in the `s=` value in the DKIM-Signature header

**Selector naming best practices**:
- Use distinct selectors for different email streams: `google`, `instantly`, `outreach1`
- Each sending service gets its own key pair and selector — this provides security isolation
  so a compromise in one service does not affect others

**Key rotation schedule**:
- Rotate DKIM keys every **6-12 months**
- Rotation procedure: publish new key first, wait 48-96 hours for DNS propagation, switch
  signing to the new key, keep old selector published for 7+ days so in-transit emails verify
- Total changeover window: ~4 days (96 hours) for the new key to fully activate

### DMARC (Domain-based Message Authentication, Reporting & Conformance)

DMARC ties SPF and DKIM together and tells receiving servers what to do when authentication fails.

**Syntax**:
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensics@yourdomain.com
```

**Policy progression for cold email domains**:

| Phase | Policy | Timeline | Purpose |
|---|---|---|---|
| 1. Monitor | `p=none` | Weeks 1-8 | Collect reports, identify all sending sources, fix auth issues |
| 2. Gradual quarantine | `p=quarantine; pct=25` | Weeks 8-12 | Start enforcing on 25% of failing mail |
| 3. Full quarantine | `p=quarantine; pct=100` | Weeks 12-16 | All failing mail goes to spam |
| 4. Reject (optional) | `p=reject` | Weeks 16+ | Failing mail is blocked outright |

**Critical for cold email**: Start with `p=none` to maximize deliverability while monitoring.
Move to `p=quarantine` after 60-90 days once all legitimate sources pass authentication.
**Avoid `p=reject` for cold email domains** unless you have absolute confidence in your setup —
reject is aggressive and any misconfiguration means permanently lost emails.

Use the `pct=` tag to enforce gradually: start at 25%, move to 50%, then 100%.

**Reporting**:
- `rua=` (aggregate reports): summary pass/fail rates. Review monthly minimum.
- `ruf=` (forensic reports): individual failing message details. Many providers no longer
  send these due to privacy restrictions.
- Use a DMARC monitoring service (dmarcian, EasyDMARC, Postmark) to parse aggregate XML
  reports into readable dashboards.

### MX Records

MX records tell the internet where to deliver mail for your domain. Misconfigured MX records
mean emails bounce or never arrive.

- Must point to your mail provider (e.g., Google Workspace MX records)
- For Google Workspace: `ASPMX.L.GOOGLE.COM` (priority 1), plus alt servers
- Verify with MXToolbox after every DNS change

### The DNS Setup Checklist

Before any sending begins, every cold email domain must have:
```
[x] SPF record published and passing (check with MXToolbox)
[x] DKIM record published with 2048-bit key (verify with Google Admin or sending tool)
[x] DMARC record published (start at p=none with rua reporting)
[x] MX records correctly pointing to mail provider
[x] Custom tracking domain configured (see next section)
[x] All records verified with dig or MXToolbox — no propagation issues
```

---

## 4. Custom Tracking Domains

Custom tracking domains replace shared tracking links (from Instantly, Smartlead, etc.)
with your own branded subdomain. This is not optional for serious operations.

**Why it matters**: Shared tracking domains are used by thousands of senders. If other
senders in the pool behave badly, the shared domain reputation tanks and your emails get
flagged. A custom tracking domain isolates your reputation completely.

**Setup process**:
1. Choose a subdomain: `track.yourdomain.com` or `link.yourdomain.com`
2. Add a CNAME record in DNS:
   - For Instantly: Host = `inst`, Value = `prox.itrackly.com`
   - For Smartlead: Host = `emailtracking`, Value = `open.sleadtrack.com`
3. Wait 30 minutes to 24 hours for propagation
4. Verify in your sending tool's settings
5. Enable the custom tracking domain on each sending account

**Configure a unique custom tracking domain per domain** — not one shared across all your
cold email domains. This maintains reputation isolation at the domain level.

---

## 5. Warmup Protocols

### What Warmup Actually Does

Warmup builds sender reputation by generating the engagement signals inbox providers use
to classify senders as legitimate:

1. **Positive signals generated**: Opens, replies, mark-as-important, moved-from-spam-to-inbox, starred messages
2. **Behavioral pattern establishment**: Consistent sending times, gradual volume increase, human-like cadence
3. **Authentication confirmation**: Inbox providers verify SPF/DKIM/DMARC during warmup; consistent passes build trust
4. **Volume baseline**: Establishes what "normal" looks like so sudden spikes don't trigger alarms

Inbox providers in 2025-2026 don't just look for the absence of negatives — they demand the
**presence of positives**. Sending 100 emails with zero replies is a negative signal. Sending
20 emails that get 10 replies is a massive positive signal.

### Warmup Pool Mechanics (Instantly)

Instantly has **1,000,000+ real email accounts** in its warmup network. When you enable warmup,
your accounts exchange emails with other Instantly users with warmup active.

**Three tiers**:

| Pool | Indicator | Composition | Performance |
|---|---|---|---|
| Basic | Orange flame | Mostly SMTP accounts, minimal Google/Outlook | Lowest quality; assigned when users exceed SMTP limits |
| Standard | Green flame | Balanced mix of Google, Outlook, SMTP | Default tier for all new accounts |
| Premium | Blue flame | Exclusively aged Google & Microsoft accounts | 9% more replies than Standard; $500/month or free with DFY accounts |

The algorithm generates contextually relevant conversations with positive sentiment.
Recipients open, reply, and mark-as-important — creating authentic engagement signals that
inbox providers interpret as real human interaction.

### Week-by-Week Warmup Protocol

**Phase 1: Foundation (Days 1-7)**
- Warmup only: 3-5 emails/day, ramping to 5-10 by end of week
- Zero cold emails
- Focus: SPF/DKIM/DMARC validation, initial reputation establishment
- Send some manual emails to your own accounts / team members for real engagement signals

**Phase 2: Building (Days 8-14)**
- Warmup volume: 15-25/day
- Cold email begins cautiously: 5-10/day maximum
- Monitor: warmup open rates should be 80%+, reply rates 30%+

**Phase 3: Expansion (Days 15-21)**
- Warmup volume: 25-35/day
- Cold email: 15-25/day
- Begin monitoring deliverability metrics closely with seed testing

**Phase 4: Operational (Days 22-28)**
- Warmup volume: 35-50/day
- Cold email: 25-40/day
- Total combined volume approaching operational capacity

**Phase 5: Full Capacity (Week 5+)**
- Cold email: 30-50/day per inbox (mature, fully warmed accounts)
- Keep warmup running at 10-20/day alongside live campaigns — permanently

### When Initial Warmup Is "Complete"

Warmup is **never truly done** — it is ongoing maintenance. The initial phase is complete when:
- 3-4 weeks of consistent positive engagement have passed
- Warmup open rates consistently 80%+
- Warmup reply rates consistently 30%+
- Deliverability tests show inbox placement (not spam) across both Gmail and Outlook
- You can sustain 30-50 cold emails/day per inbox without placement drops

### The Non-Negotiable Rule: Never Stop Warmup

**Keep warmup active between campaigns.** Stopping engagement causes reputation to degrade
quickly — inbox providers notice the absence of positive signals.

- Maintain 10-20 warmup emails/day even when no live campaigns are running
- If you pause both campaigns and warmup, you will need to re-warm for 1-2 weeks before resuming
- A steady stream of positive warmup engagement balances out any spam complaints from live campaigns
- Think of warmup as reputation insurance, not a one-time activation cost

---

## 6. Inbox Rotation & Pool Management

### How Rotation Works

Inbox rotation distributes campaign sends across multiple email accounts so no single sender
approaches spam-triggering volumes. Ten inboxes on a campaign sending 300/day means each inbox
handles ~30 emails.

**Distribution methods**:
- **Round-robin**: Equal distribution across all active inboxes
- **Weighted rotation**: Higher-reputation inboxes get more volume; newer inboxes get less
- **Smart rotation** (AI-based, in tools like Instantly): Dynamically adjusts based on
  real-time health scores, bounce rates, and complaint signals

### Optimal Rotation Group Sizes

| Scale | Inboxes per Campaign | Volume per Inbox |
|---|---|---|
| Minimum viable | 3-5 | 25-50/day each |
| Recommended | 10-15 | 25-40/day each |
| High volume (1,000+/day) | 20-30+ across multiple domains | 25-50/day each |

**The scaling rule**: Scale by adding inboxes, never by pushing more volume through existing ones.
An inbox doing 50/day that needs to do 80/day is not a volume problem — it is an inbox quantity problem.

### Advanced Pool Management

Segment inboxes into operational pools:

**Primed pool**: Fully warmed, high reputation, active senders — carry the campaign load
**Ramping pool**: New or recovering inboxes with restricted volume — building toward primed status
**Resting pool**: Inboxes temporarily pulled from rotation for cooldown or recovery — warmup only

### When to Add or Remove Inboxes

**Add inboxes when**:
- Current inboxes are consistently approaching 50/day
- You need to increase total daily volume
- You want to diversify provider mix (adding Outlook to a Google-heavy rotation)

**Remove/rest inboxes when**:
- Bounce rate for that inbox exceeds 3%
- Spam complaints spike on that sender
- Open rates suddenly drop below 20%
- The inbox gets flagged or rate-limited by the provider

Rotate resting inboxes back into active duty after 1-2 weeks of warmup-only activity.

---

## 7. Send Volume Discipline

### Daily Limits Per Inbox

| Provider | Official Limit | Safe Cold Limit (Warmed) | New/Ramping Limit |
|---|---|---|---|
| Google Workspace | 2,000/day | 30-50/day | 10-20/day |
| Microsoft 365 | 10,000 recipients/day | 30-50/day | 10-20/day |
| Outlook.com (free) | 300/day | 20-30/day | 5-10/day |
| Zoho Mail | 500/day | 20-30/day | 5-10/day |

**The golden rule**: **30 cold emails + 10-20 warmup emails = 40-50 total emails per inbox per day.**
Going above 50/day per inbox long-term significantly increases risk across all providers.

### Total Daily Volume Per Domain

- 3 inboxes per domain at 40 emails each: **~120 emails/day per domain**
- Maximum recommended: **150 emails/day per domain** across all inboxes
- Beyond 150/day concentrates too much risk on a single domain asset

### Ramp Schedule for New Domains

| Week | Cold Emails/Inbox/Day | Warmup/Inbox/Day | Total/Inbox/Day |
|---|---|---|---|
| Week 1 | 0 | 3-10 | 3-10 |
| Week 2 | 5-10 | 15-25 | 20-35 |
| Week 3 | 15-20 | 20-30 | 35-50 |
| Week 4 | 20-30 | 15-20 | 35-50 |
| Week 5 | 25-35 | 10-15 | 35-50 |
| Week 6+ | 30-50 | 10-15 | 40-65 |

**Resist the urge to accelerate this schedule.** Ramping too fast is the single most common
infrastructure mistake. The warmup weeks are not wasted time — they are reputation capital
being deposited for future withdrawals.

---

## 8. Sender Reputation Management

### The Reputation Model

Inbox providers (Gmail, Outlook, Yahoo) maintain reputation scores at three levels:
1. **IP reputation** — the sending server's IP address history
2. **Domain reputation** — your domain's aggregate sending behavior and engagement patterns
3. **Sender reputation** — the individual email address's history

For cold email using Google Workspace or Microsoft 365, domain reputation is the most
important variable you control. IP reputation is largely managed by the provider.

### The Metrics That Define Reputation

**Positive signals** (reputation deposits):
- High open rates on legitimate email
- Replies (especially positive/engaged replies)
- Mark-as-important and starred messages
- Recipients adding you to contacts
- Low bounce rates
- Consistent, predictable sending patterns

**Negative signals** (reputation withdrawals):
- Spam complaints (the most damaging single signal)
- High bounce rates (indicates poor list quality)
- Spam trap hits (indicates purchased or scraped lists)
- Sudden volume spikes (bot behavior pattern)
- Low engagement rates (sending to people who don't care)
- Blacklist appearances

### The Thresholds That Matter

| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| Bounce rate | < 2% | 3-5% | > 5% — stop sending |
| Spam complaint rate | < 0.05% | 0.1-0.3% | > 0.3% — Google's hard line |
| Open rate | > 50% | 30-50% | < 20% — likely hitting spam |
| Reply rate (cold) | > 3% | 1-3% | < 1% — copy or targeting problem |
| Delivery rate | > 98% | 95-98% | < 95% — blacklist check needed |

**Google's 0.3% spam complaint rate threshold**: This is a hard line. Exceeding 0.3% triggers
automated reputation penalties that are difficult to reverse. Elite operators target < 0.05%.

### Isolation Architecture

Never send cold email from your primary business domain. This is the most important
infrastructure rule and the one with the highest consequences for violation.

**Domain isolation strategy**:
```
Primary domain:     acme.com       → Transactional, internal, warm contacts only
Cold domain 1:      getacme.com    → Cold outreach campaign A
Cold domain 2:      tryacme.com    → Cold outreach campaign B
Cold domain 3:      meetacme.com   → Cold outreach campaign C
```

If `getacme.com` gets burned, `acme.com` is untouched. If you send cold email from `acme.com`
and it gets flagged, your entire business email infrastructure is compromised — invoices,
client communication, internal email, everything.

---

## 9. Deliverability Monitoring

### Primary Monitoring Tools

- **Google Postmaster Tools** — essential for Gmail-specific reputation. Track spam rate,
  IP reputation, domain reputation, and authentication success rates. Free, authoritative.
- **MXToolbox Blacklist Check** (`mxtoolbox.com/blacklists.aspx`) — scans 100+ DNS-based
  blacklists simultaneously. Run weekly minimum.
- **MXToolbox Domain Health** (`mxtoolbox.com/emailhealth`) — runs 30+ tests including
  blacklists, DNS configuration, and authentication validation.
- **EasyDMARC** — reputation scoring and DMARC report parsing.
- **Instantly's built-in deliverability dashboard** — health scores per inbox, warmup metrics,
  bounce tracking.

### Monitoring Cadence

| Check | Frequency | Tool |
|---|---|---|
| Inbox health scores | Daily (during active campaigns) | Instantly dashboard |
| Blacklist scan | Weekly minimum; daily during high-volume sends | MXToolbox |
| Google Postmaster review | Weekly | Google Postmaster Tools |
| DMARC aggregate reports | Monthly | EasyDMARC / dmarcian |
| Inbox placement seed test | Bi-weekly during active campaigns | Mail-tester, GlockApps |
| DNS record validation | After any DNS change; quarterly audit | MXToolbox, dig |

### The Deliverability Audit Protocol

Run this audit monthly for every active cold email operation:

```
1. Authentication check
   - SPF passing? (MXToolbox SPF lookup)
   - DKIM passing? (Check DKIM-Signature headers on sent emails)
   - DMARC passing? (Review aggregate reports)
   - All three aligned? (Same domain across From, Return-Path, DKIM d=)

2. Reputation check
   - Google Postmaster Tools: domain reputation score
   - Blacklist scan: all domains and sending IPs
   - Spam complaint rate: < 0.1% target, < 0.3% hard ceiling

3. Volume check
   - Per-inbox daily volume within safe limits?
   - Per-domain daily volume under 150?
   - Ramp schedule being followed for new domains?

4. Engagement check
   - Open rates stable or improving?
   - Reply rates at expected levels for ICP/offer?
   - Bounce rate below 2%?

5. Warmup check
   - Warmup still active on all inboxes?
   - Warmup engagement metrics healthy (80%+ opens, 30%+ replies)?
   - No inboxes dropped from warmup pool?
```

---

## 10. Troubleshooting & Recovery Playbooks

### Signs a Domain Is Burned

| Signal | Threshold | Severity |
|---|---|---|
| Bounce rate | > 5% | Warning |
| Bounce rate | > 10% | Critical — stop sending immediately |
| Spam complaint rate | > 0.1% | Warning |
| Spam complaint rate | > 0.3% | Critical — Google's enforcement threshold |
| Open rate | Sudden drop below 20% | Investigation needed |
| Delivery rate | < 95% | Blacklist check needed |
| Emails landing in spam | Consistently across test accounts | Domain likely burned |
| Bounce messages with 550/554 codes | Referencing specific blacklists | Confirmed blacklisting |

### Rehabilitate vs. Retire Decision Framework

**Rehabilitate when**:
- First-time listing on 1-2 minor blacklists
- Bounce rate spiked due to a bad list (fixable root cause)
- Domain has been active 6+ months with previously good reputation
- Recovery timeline: 2-8 weeks depending on severity

**Retire when**:
- Listed on Spamhaus or multiple major blacklists simultaneously
- Domain has been burned multiple times
- Recovery attempts have failed after 4-8 weeks
- Spam complaint rate above 0.3% for extended periods
- Domain is under 6 months old (cheaper to start fresh than rehabilitate)

### Domain Recovery Protocol

Execute in order. Do not skip steps.

```
Step 1: Stop all cold sending immediately
        (Warmup can continue at reduced volume if inbox isn't flagged)

Step 2: Identify root cause
        - Bad list? → Check bounce rate spike timing vs. list source
        - Volume spike? → Review sending logs for sudden increases
        - Authentication failure? → Run full DNS audit
        - Content trigger? → Review recent copy for spam-word density
        - Blacklist? → MXToolbox scan, identify which lists

Step 3: Fix the underlying issue
        - Clean the list (remove bounces, unengaged, spam traps)
        - Fix DNS records if authentication failed
        - Revise copy if content-triggered
        - Reduce volume settings if spike-caused

Step 4: Request blacklist removal
        - Spamhaus: Submit DBL delisting form with specific detail about changes made.
          Typically reviewed within hours to one day.
        - Other blacklists: Most auto-delist after 24-72 hours if the issue is fixed.
          Each has its own removal process — check documentation per list.

Step 5: Re-warm the domain
        - Start warmup protocol from scratch (3-4 weeks)
        - Do not send any cold email during this period

Step 6: Resume at 50% of previous volume
        - Ramp back to full volume over 2 additional weeks
        - Monitor metrics daily during recovery

Step 7: Aggressive monitoring for 30 days
        - Daily blacklist checks
        - Daily Google Postmaster Tools review
        - If metrics don't recover within 4 weeks, retire the domain
```

### Volume Reduction Response Matrix

When metrics decline, act immediately. Speed of response determines whether the domain
survives.

| Metric | Threshold | Immediate Action |
|---|---|---|
| Bounce rate > 3% | Warning | Pause sending. Verify list. Check blacklists. |
| Bounce rate > 5% | Critical | Stop all cold email. Investigate root cause immediately. |
| Spam complaint > 0.1% | Warning | Reduce volume by 50%. Review content and targeting. |
| Spam complaint > 0.3% | Critical | Stop campaigns. Warmup-only mode for 2+ weeks minimum. |
| Open rate drops > 30% suddenly | Warning | Check deliverability. Run inbox placement seed tests. |
| Reply rate drops to ~0% | Warning | Likely hitting spam. Test with seed accounts across providers. |

**Recovery protocol after volume reduction**:
1. Stop cold sending entirely
2. Run warmup-only for 1-2 weeks
3. Resume at 50% of previous volume
4. Ramp back up over 2 weeks if metrics stabilize
5. If metrics don't recover within 4 weeks, retire the domain and activate a replacement

### Common Failure Patterns

**Pattern: "Everything was working, then it all stopped"**
- Cause: Usually a volume ramp that was too aggressive, or a bad list batch
- Diagnosis: Check bounce rate spike timing. Review list source for that period.
- Fix: Pause, clean list, re-warm, resume at lower volume

**Pattern: "Good deliverability on Gmail, terrible on Outlook (or vice versa)"**
- Cause: Provider-specific reputation issue or authentication gap
- Diagnosis: Check DNS authentication per-provider. Run seed tests to both Gmail and Outlook.
- Fix: Ensure SPF/DKIM/DMARC pass for the affected provider. Adjust content if one provider's
  filters are more sensitive to your messaging.

**Pattern: "New domains keep getting burned within 2 weeks"**
- Cause: Insufficient warmup, list quality issues, or content problems
- Diagnosis: Review warmup duration (was it really 3-4 weeks?), list verification rates,
  and copy for spam triggers
- Fix: Extend warmup to full 4 weeks minimum. Verify 100% of list before loading.
  Audit copy against spam-word databases.

**Pattern: "Warmup metrics are great but cold emails go to spam"**
- Cause: Content-level spam signals. Warmup is conversational; cold email has pitch patterns.
- Diagnosis: Run cold email copy through mail-tester.com. Check for spam-trigger words,
  excessive links, HTML formatting issues.
- Fix: Simplify copy. Remove links from first email. Plain text only. Short sentences.
  Test one variable at a time until placement improves.

---

## Quick Reference: Infrastructure Calculator

For a client targeting **500 cold emails/day**:

| Component | Quantity | Rationale |
|---|---|---|
| Domains | 10 | 500 / 50 = 10 |
| Inboxes per domain | 3 | Safe ratio for cost-efficiency and deliverability |
| Total inboxes | 30 | 10 x 3 |
| Cold emails per inbox/day | ~17 | 500 / 30 (conservative, leaves headroom) |
| Warmup per inbox/day | ~15 | Ongoing reputation maintenance |
| Provider split | 7 Google / 3 Microsoft | 70/30 diversification |
| Warmup period | 4 weeks | Before any cold volume |
| Domain purchase timing | 4-8 weeks before launch | Age + warmup time |
| Monthly domain cost | ~$120/year total | ~$12/domain/year |
| Google Workspace cost | ~$147/month | 21 users x $7 |
| Microsoft 365 cost | ~$54/month | 9 users x $6 |
| Total monthly infrastructure cost | ~$200/month | Excluding sending tool |

---

## 2025-2026 Regulatory Context

These are not suggestions. They are enforced requirements with automated penalties.

- **Gmail (since Feb 2024)**: Bulk senders (5,000+/day) must have SPF, DKIM, DMARC,
  one-click unsubscribe, and maintain < 0.3% spam complaint rate
- **Outlook/Microsoft (since May 2025)**: Now enforces SPF, DKIM, and DMARC for
  high-volume senders — matching Gmail's authentication requirements
- **Authenticated senders are 2.7x more likely to reach the inbox** than unauthenticated senders
- The trend is clear: authentication requirements will only tighten. Build infrastructure
  that exceeds current minimums.
