# Compliance & Legal — CAN-SPAM, GDPR, CASL & Regional Regulations

The regulatory layer of the system. Compliance is not a checkbox — it is an operational
discipline that determines whether your infrastructure survives contact with scale. A single
violation can cost $51,744 (CAN-SPAM) or 4% of global revenue (GDPR). More practically:
non-compliance destroys sender reputation, triggers platform bans, and kills deliverability
permanently. Every campaign decision — list sourcing, copy, opt-out handling, data storage —
has a compliance dimension. This reference covers what's legally required, what's best practice,
and how to build compliant campaigns that still perform.

---

## Table of Contents
1. Jurisdictional Framework — How Regulations Apply
2. CAN-SPAM Act (United States)
3. GDPR (EU/EEA)
4. UK GDPR & PECR (United Kingdom)
5. CASL (Canada)
6. Spam Act 2003 (Australia)
7. Google & Yahoo Bulk Sender Requirements
8. The Universal Compliance Checklist
9. Compliance Workflows in Instantly
10. Common Violations & How to Avoid Them
11. Enforcement Actions & Penalty Reference
12. Jurisdiction Quick-Reference Matrix

---

## 1. Jurisdictional Framework — How Regulations Apply

### The Fundamental Rule

Compliance is determined by **where the recipient is**, not where you are. A US-based company
emailing a prospect at a German company must comply with GDPR. A Canadian company emailing
a US prospect must comply with CAN-SPAM. When in doubt, apply the stricter standard.

### The Three Regulatory Models

Every major jurisdiction falls into one of three models:

```
Opt-Out Model (most permissive)
  → You can email without prior consent
  → Recipient's right is to opt out after receiving
  → Example: CAN-SPAM (US)

Legitimate Interest Model (middle ground)
  → No explicit consent required, but you must document a justifiable business reason
  → Recipient can object at any time — and for direct marketing, objection is absolute
  → Example: GDPR (EU), UK GDPR

Opt-In Model (most restrictive)
  → Prior consent required before sending
  → Limited exceptions (conspicuous publication, existing business relationship)
  → Example: CASL (Canada), Spam Act (Australia)
```

### Multi-Jurisdiction Campaigns

For campaigns targeting prospects across multiple jurisdictions, the operational default
is to segment by jurisdiction and apply the appropriate standard to each segment. The
alternative — applying the strictest standard globally — is simpler but reduces volume
and flexibility in permissive jurisdictions like the US.

**Practical approach**: Tag every lead with jurisdiction at the list-building stage. Build
jurisdiction-specific campaign variants with appropriate footer content, opt-out mechanisms,
and data handling procedures. This is not optional at scale — it is the difference between
a sustainable operation and an eventual enforcement action.

---

## 2. CAN-SPAM Act (United States)

**Enforced by**: Federal Trade Commission (FTC)
**Applies to**: All commercial electronic messages sent to or from US recipients — B2B and B2C alike
**Model**: Opt-out

### Why CAN-SPAM Matters Most for Cold Outbound

CAN-SPAM is an **opt-out law**. No prior consent is required. You may legally send unsolicited
commercial email to any US business recipient. The recipient's right is to opt out after
receiving — and once they do, you must stop. This makes the US the most permissive major
jurisdiction for B2B cold email and the primary market for most cold outbound operations.

### The Seven Requirements

**1. Accurate header information** — "From," "To," "Reply-To," and routing information must
truthfully identify the person or business sending the message. The originating domain and
email address must be real and attributable.

**2. Non-deceptive subject lines** — The subject line must accurately reflect the content of
the message body. Clickbait that misrepresents the email's purpose is a violation.

**3. Advertisement identification** — The message must disclose that it is an advertisement.
Significant leeway on format — no mandated language, no required placement. "Clear and
conspicuous" is the standard.

**4. Valid physical postal address** — Every commercial email must include the sender's valid
physical postal address. Qualifying addresses:
- Current street address of the business
- PO Box registered with USPS
- Private mailbox (PMB) registered with a CMRA (e.g., UPS Store)
- **Does NOT qualify**: Virtual-only addresses, email-only addresses, fake addresses

**5. Functional opt-out mechanism** — Must work at the time of sending and for at least 30
days after. Cannot require fees, personal information beyond the email address, or multiple
steps to complete.

**6. Honor opt-outs within 10 business days** — Once someone opts out, you cannot email them
again. Cannot sell or transfer opted-out addresses. The opt-out applies to ALL commercial
messages from your organization, not just the specific campaign.

**7. Monitor third-party compliance** — Both the company whose product is promoted AND the
company that actually sends the message can be held liable. Outsourcing to an agency or
using an automation platform does not transfer liability. "I didn't know my vendor was
non-compliant" is explicitly not a defense.

### What CAN-SPAM Does NOT Require

- No prior consent needed
- No specific opt-out language mandated
- No specific advertisement disclosure format
- No requirement to use "ADV" in subject lines
- No restriction on sending volume
- No data processing documentation

### Penalties

- **$51,744 per violating email** (2025 FTC-adjusted; indexed to inflation annually)
- **No cap on total fines** — each individual email is a separate violation
- Criminal penalties for aggravated violations (spoofing, harvesting, dictionary attacks)
- Largest CAN-SPAM penalty to date: **$2.95 million** against Verkada (August 2024)

---

## 3. GDPR (EU/EEA)

**Enforced by**: Data Protection Authorities (DPAs) in each EU/EEA member state
**Applies to**: Processing of personal data of individuals in the EU/EEA — regardless of
where the sender is located
**Model**: Legitimate interest

### Cold B2B Email Is Legal Under GDPR — With Conditions

The legal basis for B2B cold email under GDPR is **legitimate interest** (Article 6(1)(f)).
This is not a loophole — it is an explicitly provided legal basis. But it requires documentation
and genuine justification. You cannot claim legitimate interest retroactively after getting caught.

### The Legitimate Interest Assessment (LIA) — Required Before Sending

You must conduct and document an LIA before launching any campaign targeting EU/EEA prospects.
This is a legal requirement, not a best practice. The LIA has three parts:

```
Part 1 — Purpose Test
  Question: What is the specific legitimate interest?
  Document: "Direct marketing of [specific B2B product/service] to [specific professional
  role] who may benefit based on their publicly available professional information."
  → Must be specific. "Growing our business" is too vague.

Part 2 — Necessity Test
  Question: Is email necessary and proportionate to achieve this interest?
  Document: Confirm you process only minimum necessary data (name, business email,
  job title, company). Specify data retention period. Explain why email (vs. other channels)
  is the proportionate approach.
  → Must demonstrate data minimization.

Part 3 — Balancing Test
  Question: Do the individual's rights override your legitimate interest?
  Factors in your favor:
    - Email was publicly available in a professional context
    - Outreach is directly relevant to their professional role
    - Business email address used (not personal)
    - Clear opt-out provided in every message
    - Limited frequency (not daily bombardment)
    - Data sourced from legitimate professional sources
  Factors against:
    - Scraped without professional context
    - Irrelevant to their role or industry
    - Personal email address used
    - No opt-out mechanism
    - Excessive frequency
    - Data purchased from unverifiable sources
```

### Data Subject Rights — Non-Negotiable

**Right to Object (Article 21)**: For direct marketing, this right is **absolute**. When
someone objects, you stop immediately. No exceptions. No "but they're in the middle of a
sequence." Immediately.

**Right to Erasure (Article 17)**: Must delete all personal data within one calendar month
of request. This means removing them from your CRM, your email tool, your spreadsheets —
everywhere.

**Right of Access (Article 15)**: Must provide confirmation of what data you hold and a
complete copy within one calendar month of request.

**Right to Rectification (Article 16)**: Must correct inaccurate data on request.

### Records of Processing Activities (RoPA) — Article 30

Maintain documentation including: controller identity, processing purposes, data categories,
data subject categories, recipients, retention periods, security measures, legal basis with
reference to your LIA, and data source documentation for every lead.

### GDPR Operational Rules for Cold Email

**DO**:
- Conduct and document LIAs before every new campaign targeting EU/EEA
- Source data from legitimate professional sources (company websites, LinkedIn, professional
  directories, industry publications)
- Collect only what you need (name, business email, job title, company)
- Include a clear, easy opt-out in every email
- Honor opt-outs within 24-48 hours (the law says 30 days — best practice is same-day)
- Maintain jurisdiction-specific suppression lists
- Keep records of where every lead's data was sourced
- Set and enforce data retention periods

**DO NOT**:
- Email personal addresses (Gmail, Yahoo, Hotmail) for EU B2B outreach
- Scrape from sources that prohibit it
- Purchase lists without verifiable, documented sourcing
- Ignore or delay opt-out requests
- Store data longer than your documented retention period
- Process data without a documented legal basis

### Penalties

- **Up to EUR 20 million or 4% of total worldwide annual turnover** — whichever is higher
- Lower tier: Up to EUR 10 million or 2% of turnover for administrative/technical violations
- DPAs can also issue warnings, processing bans, and orders to notify data subjects

---

## 4. UK GDPR & PECR (United Kingdom)

**Enforced by**: Information Commissioner's Office (ICO)
**Applies to**: Processing of personal data of UK individuals; electronic marketing to UK recipients
**Model**: Legitimate interest (UK GDPR) + corporate subscriber exemption (PECR)

### The PECR Corporate Subscriber Exemption — The Key Distinction

PECR (Privacy and Electronic Communications Regulations) creates a critical split:

- **Individual subscribers** (consumers, sole traders, partnerships): Cannot receive
  unsolicited marketing email without prior consent
- **Corporate subscribers** (limited companies, LLPs, government bodies): **Can receive
  unsolicited marketing email without prior consent**, provided you identify yourself, provide
  contact details, and offer opt-out in every message

**Bottom line**: Cold B2B email to UK corporate email addresses (addresses at limited companies,
LLPs, government bodies) is legal without consent under PECR. You still need legitimate interest
under UK GDPR for processing the individual's personal data (their name, email, etc.).

### Key Differences from EU GDPR

- **Penalty cap**: GBP 17.5 million or 4% of global turnover (vs EUR 20 million in EU)
- **Supervisory authority**: ICO only (vs separate DPAs per EU member state)
- **PECR penalty upgrade**: Data (Use and Access) Act 2025 raised PECR breach penalties from
  GBP 500,000 to **GBP 17.5 million / 4% of turnover** — a 35x increase
- **Adequacy decision**: EU granted UK adequacy June 2021, subject to periodic review

### Practical Impact

For B2B cold email, the UK is more permissive than the EU for corporate recipients due to the
PECR exemption. However, the penalty ceiling is now equivalent. Apply the same LIA and
documentation standards as EU GDPR, and segment UK corporate vs. individual subscribers
separately in your list-building process.

---

## 5. CASL (Canada)

**Enforced by**: CRTC (Canadian Radio-television and Telecommunications Commission),
Competition Bureau, Office of the Privacy Commissioner
**Applies to**: Commercial electronic messages (CEMs) sent to or accessed by Canadian recipients
**Model**: Opt-in (strictest major jurisdiction)

### CASL Requires Consent Before Sending

Unlike CAN-SPAM and GDPR, CASL requires **consent before you send**. Two types exist:

**Express Consent**: The recipient explicitly agreed to receive messages. Does not expire
unless withdrawn. Must be documented — you need proof of when, how, and what they consented to.

**Implied Consent**: Time-limited and condition-specific:
- **Existing business relationship**: 2 years from last purchase/contract, or 6 months from
  last inquiry
- **Conspicuous publication**: The only path for true cold B2B email under CASL

### The Conspicuous Publication Exemption — Your Only Path for Cold B2B

Implied consent exists when **ALL THREE** conditions are met:

```
1. The recipient has conspicuously published their email address
   → Company website, professional directory, LinkedIn profile, industry publication
   → NOT: scraped from hidden pages, harvested from source code, purchased from a list broker

2. The publication is not accompanied by a statement against receiving unsolicited CEMs
   → No "do not email" notice adjacent to the address
   → Check for this explicitly — some company websites include such statements

3. The message is relevant to the recipient's business, role, functions, or duties
   → Direct connection between their published role and your message content
   → "Relevant" is interpreted strictly (CompuFinder case, Federal Court of Appeal)
   → Mass-scraping from directories without establishing per-recipient relevance does NOT satisfy this
```

### Required Email Elements Under CASL

1. Clear sender identification (name of person and/or organization)
2. Contact information: mailing address + at least one of phone, email, or web address
3. Contact information must remain valid for at least **60 days** after sending
4. Functional unsubscribe mechanism, clearly and prominently displayed
5. Unsubscribe mechanism must remain functional for at least **60 days** after sending
6. Unsubscribe requests honored within **10 business days**

### Penalties

- **Individuals**: Up to CAD $1 million per violation
- **Organizations**: Up to CAD $10 million per violation
- **Private right of action**: Up to CAD $200 per violation, up to CAD $1 million per day

### CASL Practical Guidance

CASL is the jurisdiction where most operators get into trouble. The safest approach for
Canadian prospects:
- Only email addresses that are conspicuously published on the company's own website or
  the individual's public professional profile
- Document the source URL for every Canadian lead
- Ensure clear relevance between the recipient's published role and your message
- Include all six required elements in every email
- When in doubt, do not email — the penalties are severe and the CRTC enforces actively

---

## 6. Spam Act 2003 (Australia)

**Enforced by**: Australian Communications and Media Authority (ACMA)
**Applies to**: Commercial electronic messages with an Australian link (sent to, from, or
via Australia)
**Model**: Opt-in with inferred consent

### Three Pillars: Consent, Identify, Unsubscribe

**Consent**: Express or inferred. Inferred consent available for conspicuously published
business emails if the message is directly relevant to the recipient's business role.
Functionally similar to CASL's conspicuous publication exemption.

**Identify**: Must clearly identify the sender (individual and/or organization) and include
accurate contact information.

**Unsubscribe**: Functional opt-out mechanism in every message. Must remain active for **30
days** after sending. Unsubscribe requests must be honored within **5 business days** — the
strictest unsubscribe timeline of any major jurisdiction.

### Penalties

- **Corporations**: Up to AUD $2.5 million
- **Individual officers**: Up to AUD $500,000
- ACMA can also issue infringement notices and enforceable undertakings

---

## 7. Google & Yahoo Bulk Sender Requirements (2024-2026)

These are not laws — they are **platform-enforced technical requirements** that directly
impact whether your emails reach the inbox. Non-compliance results in spam folder placement
or outright rejection. For cold outbound operations, these requirements are as consequential
as any regulation.

### Bulk Sender Threshold

**5,000+ messages per day** to personal Gmail or Yahoo accounts triggers bulk sender
requirements. Below that threshold, a reduced set still applies.

### Requirements for All Senders

- SPF **or** DKIM authentication (at least one)
- Valid forward and reverse DNS records
- TLS encryption for message transmission
- Spam complaint rate below **0.3%**

### Additional Requirements for Bulk Senders (5,000+/day)

- SPF **AND** DKIM (both required, not either/or)
- DMARC record published (minimum `p=none`)
- DMARC alignment (From: domain aligns with SPF or DKIM domain)
- **One-click unsubscribe** via RFC 8058 headers (List-Unsubscribe and List-Unsubscribe-Post)
- Honor unsubscribe within **2 days**
- Spam complaint rate target: below **0.1%**, hard ceiling **0.3%**

### November 2025 Enforcement Escalation

Gmail now issues **temporary or permanent message rejections** — actual bounce-backs, not just
spam folder placement — for non-compliant emails. This is a material escalation from the
initial soft enforcement (spam folder only) in early 2024. Non-compliance now means your
emails literally do not arrive.

### Interaction with Cold Email Operations

Even if you never hit 5,000/day to Gmail personally, applying bulk sender standards to all
sending infrastructure is the correct operational approach. SPF + DKIM + DMARC alignment,
one-click unsubscribe headers, and sub-0.1% complaint rates should be baseline for every
sending domain.

---

## 8. The Universal Compliance Checklist

Regardless of jurisdiction, every cold email campaign must satisfy these requirements. This
is the minimum viable compliance standard for professional B2B outbound:

```
□ Sender Identity
  - Accurate "From" name and email address
  - Real person or real business entity
  - No spoofed or misleading sender information

□ Physical Address
  - Valid postal address in every email (required: US, Canada; best practice: everywhere)
  - Street address, PO Box, or registered PMB

□ Opt-Out Mechanism
  - Functional unsubscribe link or clear reply-based opt-out instruction
  - Works at time of sending and for minimum 30-60 days after (jurisdiction-dependent)
  - One-click where possible (required for Gmail/Yahoo bulk senders)

□ Opt-Out Honoring
  - Automated processing: same-day for best practice
  - Legal maximums: 5 business days (AU), 10 business days (US, CA), 30 days (EU, UK)
  - Applied globally across all campaigns, all tools, all workspaces

□ DNS Authentication
  - SPF record configured per sending domain
  - DKIM signing enabled per sending domain
  - DMARC record published (minimum p=none; target p=quarantine or p=reject)
  - Custom tracking domain (CNAME) — never use shared platform domains

□ Content Compliance
  - Non-deceptive subject lines
  - Advertisement identification (US requirement; good practice everywhere)
  - No false claims, no misleading urgency, no deceptive formatting

□ Data Sourcing
  - Documented, legitimate source for every lead
  - For GDPR: source documented in RoPA
  - For CASL: conspicuous publication documented with source URL
  - No purchased lists without verifiable provenance

□ Documentation
  - Legitimate Interest Assessment (GDPR/UK GDPR campaigns)
  - Records of Processing Activities (GDPR/UK GDPR)
  - Consent records (CASL, Australia)
  - Suppression list maintenance logs
```

---

## 9. Compliance Workflows in Instantly

### What Instantly Provides Natively

**Global Block List**: Unsubscribes apply across all campaigns within a workspace. Supports
CSV upload for importing external suppression lists and domain-level blocking for companies
that request no contact.

**Unsubscribe Link Macro**: `{{unsubscribe}}` inserts a unique opt-out URL per recipient.
Clicking it auto-adds the contact to the global block list. This is the primary compliance
mechanism for most campaigns.

**Reply-Based Opt-Out Detection**: Detects opt-out keywords in replies (e.g., "unsubscribe,"
"stop emailing," "remove me"). Can auto-block — but must be explicitly configured in
campaign settings. Not enabled by default.

**List-Unsubscribe Headers**: Supports RFC 8058 one-click unsubscribe headers, satisfying
the Gmail/Yahoo bulk sender requirement.

**Email Warmup**: Gradual sending ramp over 14+ days to build sender reputation, reducing
the likelihood of spam classification during early campaign phases.

### What Operators Must Configure Themselves

Instantly does not handle these automatically — they are entirely your responsibility:

**DNS Authentication**: SPF, DKIM, and DMARC records must be configured per sending domain
in your DNS provider. Instantly provides the values; you must create the records.

**Custom Tracking Domain**: Set up a CNAME record pointing to Instantly's tracking
infrastructure. Never use the shared default tracking domain — it pools your reputation
with every other Instantly user.

**Physical Address in Email Footer**: Instantly does not auto-insert a postal address.
You must include it in your email template or signature. Non-negotiable for US and Canadian
recipients.

**Legitimate Interest Assessment**: Entirely the operator's responsibility. Instantly has no
LIA workflow or documentation system. Maintain these externally.

**Data Source Documentation**: Instantly does not track lead provenance. You must document
where every lead's data was sourced — especially critical for GDPR and CASL compliance.

**Jurisdiction Tagging**: No auto-detection of recipient jurisdiction. Tag leads with their
jurisdiction at the list-building stage and route them to jurisdiction-appropriate campaigns.

**Cross-Platform Suppression Sync**: If using multiple Instantly workspaces or other email
tools alongside Instantly, suppression lists must be synced manually or via API. An opt-out
in one system must propagate to all systems.

### The Recommended Compliance Stack in Instantly

```
Campaign Setup:
  1. Tag all leads with jurisdiction before upload
  2. Create jurisdiction-specific campaigns (US, EU, UK, CA, AU)
  3. Include {{unsubscribe}} macro in every email template
  4. Include physical address in every email footer
  5. Enable reply-based opt-out detection
  6. Configure List-Unsubscribe headers

Ongoing Operations:
  1. Export and review global block list weekly
  2. Sync block list across all workspaces and external tools
  3. Monitor spam complaint rate (target <0.1%, hard ceiling <0.3%)
  4. Audit DNS records monthly (SPF, DKIM, DMARC, tracking domain)
  5. Review and update LIA documentation quarterly
  6. Purge leads beyond retention period per data retention policy

Incident Response:
  1. Opt-out request received → honor within 24 hours (not 10 business days)
  2. Data access request (GDPR Article 15) → respond within 20 business days
  3. Data erasure request (GDPR Article 17) → complete within 20 business days
  4. Spam complaint spike above 0.2% → pause campaign immediately, investigate
  5. Bounce rate spike above 5% → pause campaign, clean list, investigate
```

---

## 10. Common Violations & How to Avoid Them

### Violation 1: Failing to Honor Opt-Outs

**The problem**: The single most common violation and the one regulators penalize most
aggressively. Verkada's $2.95M FTC fine was primarily for failing to honor opt-outs.

**How it happens**: Multiple tools or workspaces with unsynchronized suppression lists.
Someone unsubscribes from Campaign A in Instantly Workspace 1 but continues receiving emails
from Campaign B in Workspace 2 or from a different tool entirely.

**Prevention**:
- Centralize suppression list management — one master list synced across all systems
- Weekly suppression list audit across all active tools
- Never re-upload a lead list without first scrubbing against the current suppression list
- Test opt-out flow end-to-end before every campaign launch

### Violation 2: Missing or Invalid Physical Address

**The problem**: Easy to overlook, especially when using templates. Required by CAN-SPAM and
CASL. Absence is a per-email violation.

**Prevention**:
- Build physical address into your base email template — not added per-campaign
- Use a registered PMB or PO Box if you don't want to publish a street address
- Audit every campaign template before launch: is the address present and valid?

### Violation 3: No Documentation for GDPR Legitimate Interest

**The problem**: Operating under legitimate interest without conducting or documenting an LIA.
When a DPA investigates, "we thought it was fine" is not a defense. The documentation must
exist before sending, not after an inquiry.

**Prevention**:
- Create an LIA template and complete it for every new campaign targeting EU/EEA
- Store LIAs in an accessible, organized location (not someone's email inbox)
- Review and update LIAs when campaign targeting, data sources, or offer changes

### Violation 4: Emailing Personal Addresses for EU/UK B2B

**The problem**: Using Gmail, Yahoo, Hotmail, or other personal email addresses for EU/EEA
B2B outreach. This significantly weakens the legitimate interest basis — the "reasonable
expectation" of being contacted professionally evaporates when you're emailing someone's
personal inbox.

**Prevention**:
- Filter personal email domains from EU/UK lead lists before upload
- Build domain-based filtering into your list-building workflow
- When a lead only has a personal email, skip them for EU/UK campaigns

### Violation 5: Ignoring CASL's Relevance Requirement

**The problem**: Relying on the conspicuous publication exemption without establishing
genuine relevance between the recipient's role and your message. The CRTC interprets
"relevant" strictly — the CompuFinder case confirmed this.

**Prevention**:
- Document the relevance connection for every Canadian lead
- Ensure your message content directly relates to the recipient's published role/function
- Don't mass-email a scraped Canadian list with a generic pitch

### Violation 6: Deceptive Subject Lines

**The problem**: Subject lines that misrepresent the email's content. "Re:" on a first-touch
email (implying a prior conversation that doesn't exist) is the most common example.

**Prevention**:
- Never use "Re:" or "Fwd:" on first-touch emails
- Ensure subject line accurately reflects email content
- Test subject lines against the standard: would a reasonable person feel misled?

### Violation 7: Non-Functional Opt-Out Mechanisms

**The problem**: Unsubscribe links that are broken, lead to error pages, or require multiple
steps. Must be functional at time of sending and for 30-60 days after (jurisdiction-dependent).

**Prevention**:
- Test every unsubscribe link before campaign launch
- Use Instantly's `{{unsubscribe}}` macro — it's maintained by the platform
- Monitor unsubscribe link functionality monthly

---

## 11. Enforcement Actions & Penalty Reference

### Recent Major Enforcement Actions (2024-2025)

| Case | Fine | Enforcer | Key Violation |
|------|------|----------|---------------|
| **Verkada** | $2.95M | FTC | 30M+ emails over 3 years; failed to honor opt-outs |
| **Experian** | $650K | FTC | No functional opt-out in marketing emails |
| **Orange** | EUR 50M | CNIL (France) | Ads disguised as regular emails without consent |
| **Carrefour** | EUR 3.05M | CNIL (France) | Ignored data subject rights including right to object |

### Enforcement Trends to Watch

- **FTC extending liability to agencies and platforms** — not just the brand whose product
  is promoted. If you run campaigns on behalf of clients, you carry liability.
- **UK PECR penalties raised 35x** — from GBP 500K cap to GBP 17.5M / 4% of turnover via
  Data (Use and Access) Act 2025. The UK is no longer a soft-enforcement jurisdiction.
- **EU DPAs increasing scrutiny of legitimate interest claims** — expect more challenges to
  undocumented or poorly documented LIAs.
- **Gmail enforcement escalation** — November 2025 shift from spam folder to outright message
  rejection for non-compliant senders. Technical compliance is now a deliverability prerequisite.

---

## 12. Jurisdiction Quick-Reference Matrix

| | CAN-SPAM (US) | GDPR (EU) | UK GDPR/PECR | CASL (Canada) | Spam Act (AU) |
|---|---|---|---|---|---|
| **Model** | Opt-out | Legitimate interest | LI + PECR corporate exemption | Opt-in (with implied consent) | Opt-in (with inferred consent) |
| **Prior consent for B2B?** | No | No (if LIA documented) | No (corporate subscribers) | Yes (unless conspicuous publication) | Yes (unless conspicuous publication) |
| **Physical address required?** | Yes | Recommended | Recommended | Yes | Recommended |
| **Max opt-out honoring time** | 10 biz days | 30 days | 30 days | 10 biz days | 5 biz days |
| **Opt-out mechanism duration** | 30 days | N/A | N/A | 60 days | 30 days |
| **Max penalty** | $51,744/email | EUR 20M / 4% revenue | GBP 17.5M / 4% revenue | CAD $10M/violation | AUD $2.5M corporate |
| **Documentation required** | Minimal | Extensive (LIA, RoPA) | Extensive (LIA, RoPA) | Consent records | Consent records |
| **Personal email OK for B2B?** | Yes | Strongly discouraged | Strongly discouraged | Yes (if consent exists) | Yes (if consent exists) |

### Decision Tree for "Can I Email This Person?"

```
Start: Do you have the prospect's business email address?
  │
  ├─ US recipient (CAN-SPAM)
  │   → Yes. Include physical address, opt-out, accurate headers.
  │
  ├─ EU/EEA recipient (GDPR)
  │   → Is the email a business domain (not personal)?
  │   → Do you have a documented LIA?
  │   → Is the outreach relevant to their professional role?
  │   → Can you document where you sourced their data?
  │   → All yes? → Send. Include opt-out. Honor objections immediately.
  │
  ├─ UK recipient (UK GDPR + PECR)
  │   → Is the recipient at a corporate subscriber (Ltd, LLP, gov)?
  │   → Yes? → Send under PECR exemption + LI. Include opt-out.
  │   → No (sole trader/partnership)? → Need prior consent.
  │
  ├─ Canadian recipient (CASL)
  │   → Is their email conspicuously published?
  │   → No "do not email" statement adjacent?
  │   → Is your message relevant to their published role?
  │   → All yes? → Send. Include all 6 required elements.
  │   → Any no? → Do not send without express consent.
  │
  └─ Australian recipient (Spam Act)
      → Is their business email conspicuously published?
      → Is your message directly relevant to their role?
      → All yes? → Send. Include identity, contact info, opt-out.
      → Any no? → Do not send without express consent.
```

### The Compliance-Performance Balance

Compliance and performance are not in tension. The practices that keep you legal — accurate
targeting, relevant messaging, functioning opt-outs, clean data, proper authentication —
are the same practices that drive deliverability, open rates, and positive reply rates.
Non-compliant campaigns don't just risk fines. They destroy sender reputation, trigger spam
filters, and produce worse results. Compliance is the foundation that makes sustained
high-performance cold outbound possible.
