# Instantly Operations — Unibox, Reply Management & Pipeline

The downstream system. Where leads become conversations, conversations become meetings,
and meetings become revenue. Most operators treat reply handling as an afterthought. Elite
operators design it as carefully as they design their sequences, because **Harvard Business
Review data shows that responding to a positive reply within one hour makes teams 7x more
likely to qualify the lead.** The reply system is the conversion layer of your outbound machine.

---

## Table of Contents
1. Unibox — The Operations Center
2. AI Reply Labels — Classification Architecture
3. AI Reply Agent — HITL to Autopilot
4. Lead Status and Pipeline Workflow
5. Subsequence Triggers from Unibox
6. CRM Integration and Handoff
7. The Agency Multi-Client Operations Model
8. Unibox SLAs and Team Workflows
9. Instantly Copilot — The Strategic Assistant
10. Operational Metrics & Benchmarks
11. Troubleshooting Unibox & Pipeline Issues

---

## 1. Unibox — The Operations Center

Unibox is Instantly's centralized inbox that consolidates all replies from all connected
sending accounts and all active campaigns into a single interface. For teams running 10+
inboxes or agencies managing multiple clients, it is the operational headquarters.

**What Unibox provides**:
- All replies across all inboxes in a unified view
- AI-powered automatic reply classification (Interested, Not Interested, OOO, etc.)
- Lead status tracking and updating from a single interface
- Task creation and follow-up reminders per lead
- Pipeline view (move qualified leads through stages without leaving Unibox)
- Direct reply capability (respond without switching to email client)
- One-click response templates for common reply types
- AI Reply Agent drafting responses in real-time

### Unibox Folder/Filter Architecture

```
Priority Queue:    "Interested" + "Referred Me"
                   → Requires action within 1 hour
                   → SLA: 7x qualification rate within 1 hour vs. later (HBR)

Review Queue:      "Want More Info" + "Objection" + "Custom" labels
                   → Requires action within 4 hours
                   → Human judgment required — AI drafts optional

Admin Queue:       "OOO" + "Wrong Person"
                   → Manage daily (within 24 hours)
                   → Mostly automated handling via subsequences

Archive:           "Not Interested" + bounces
                   → Log and close — no further contact
                   → Add to global block list automatically
```

### Daily Unibox Workflow

**Solo operator schedule**:

| Time | Task | Duration | Priority |
|---|---|---|---|
| 8:00 AM | Clear Priority Queue — respond to every "Interested" from last 24h | 15-30 min | Critical |
| 8:30 AM | Process Review Queue — send resources or follow-up content | 15-20 min | High |
| 12:00 PM | Check for new Priority Queue additions | 5-10 min | Critical |
| 4:00 PM | Clear Admin Queue — log wrong persons, set OOO resumes, process referrals | 10-15 min | Medium |
| 4:15 PM | Review AI Reply Agent drafts (if in HITL mode) | 10-15 min | High |
| Weekly | Audit AI classification accuracy — spot-check 20+ labels | 20 min | Medium |

**Total daily Unibox time**: 55-90 minutes for a solo operator running 5-10 active campaigns.

**Team/agency schedule** (3+ campaigns per team member):

| Role | Morning | Midday | EOD |
|---|---|---|---|
| Unibox Manager | Triage all queues, route complex replies | Monitor Priority Queue | Daily metrics review |
| SDR / Closer | Handle all "Interested" and "Objection" replies | Follow up on pending meetings | Update pipeline statuses |
| Campaign Manager | — | Review AI Agent performance | Plan next-day priorities |

---

## 2. AI Reply Labels — Classification Architecture

Instantly's AI classifies every incoming reply automatically. You can add, modify, and tune
these labels. The classification drives subsequence triggers and Unibox routing.

### Default Labels

| Label | Definition | Auto-Action | SLA |
|---|---|---|---|
| **Interested** | Explicit positive reply — wants to learn more, book a call, or asks next step | Pause sequence, move to Priority Queue, notify rep | < 1 hour |
| **Not Interested** | Explicit rejection — no further contact | End sequence, add to block list | < 24 hours |
| **Out of Office** | Auto-reply or explicit OOO message | Pause for OOO period + 2 days, auto-resume | < 24 hours |
| **Wrong Person** | Referred to someone else or confirmed irrelevant | Pause sequence, trigger referral follow-up | < 24 hours |

### Custom Labels to Add

These are missing from default and significantly improve routing accuracy:

```
Label: "Not Now / Wrong Timing"
Description: "Interested in concept but explicitly mentions timing issue — budget cycle,
              current projects, team bandwidth, or says to follow up in X timeframe"
Detection keywords: "not right now", "maybe next quarter", "reach out in", "budget",
                    "too busy", "not a priority right now", "circle back"
Action: Move to 90-day re-engagement queue; tag with timing reason
SLA: < 24 hours (acknowledge + set re-engagement trigger)

Label: "Referral / Redirect"
Description: "Replies with the name or contact info of a more relevant person"
Detection keywords: "you should talk to", "reach out to", "CC'ing", "better person"
Action: Extract contact info, add to appropriate campaign, acknowledge the referral
SLA: < 24 hours

Label: "Objection / Question"
Description: "Asks a specific question or raises a concern about offer, price, or fit"
Detection keywords: "how much", "what's the cost", "how does this work", "not sure if"
Action: Human response required — route to Priority Queue for tailored reply
SLA: < 4 hours

Label: "Meeting Booked"
Description: "Explicitly confirms meeting scheduled (via Calendly or direct reply)"
Detection keywords: "booked", "see you", "confirmed", "looking forward to the call"
Action: Mark as Won in pipeline; trigger post-booking workflow; notify rep
SLA: Immediate (automated)

Label: "Positive but Vague"
Description: "Shows some interest but doesn't commit — 'tell me more', 'send something over'"
Detection keywords: "tell me more", "send me info", "sounds interesting", "what do you offer"
Action: Send targeted follow-up resource; add to nurture subsequence
SLA: < 4 hours
```

### Label Performance Benchmarks

| Label | Typical % of Total Replies | Conversion to Meeting | Action Quality Indicator |
|---|---|---|---|
| Interested | 15-30% | 40-60% (with proper follow-up) | Reply speed is the #1 lever |
| Not Interested | 20-35% | 0% (respect the no) | Clean removal from all campaigns |
| OOO | 10-20% | 15-25% (after return + follow-up) | Auto-resume timing accuracy |
| Wrong Person | 5-10% | 10-20% (of referrals) | Referral extraction completeness |
| Not Now | 10-20% | 25-40% (at re-engagement in 90 days) | Timing tag accuracy |
| Objection | 5-15% | 20-35% (with skilled response) | Human response quality |
| Positive but Vague | 5-15% | 15-30% | Resource relevance + follow-up speed |

### Tuning AI Label Accuracy

**Initial accuracy**: Expect 75-85% correct classification out of the box.
**Target accuracy**: 90%+ after 2-3 weeks of tuning.

**Tuning protocol**:
1. Week 1: Review every AI-assigned label manually (100% audit)
2. Week 2: Review misclassified replies — adjust label descriptions for common errors
3. Week 3+: Spot-check 20% of labels; use "Test AI" feature to verify descriptions
4. Monthly: Full audit of 50+ labels; retune descriptions based on new reply patterns

**Common misclassification patterns**:

| Misclassification | Cause | Fix |
|---|---|---|
| "Interested" when they're just asking a question | Label description too broad | Add: "Must explicitly express desire to learn more or meet, not just ask a clarification question" |
| "Not Interested" when they said "not now" | Missing "Not Now" custom label | Create the custom label with specific timing keywords |
| "OOO" for auto-replies that aren't OOO | Pattern matching on auto-reply signatures | Add negative examples to OOO description |
| "Interested" for sarcastic/negative replies | AI doesn't detect tone | Add: "Exclude sarcastic or dismissive replies that contain surface positive words" |

---

## 3. AI Reply Agent — HITL to Autopilot

The AI Reply Agent drafts and sends responses to incoming replies. For agencies handling
high volume across multiple clients, this transforms reply management from a headcount
constraint into a system.

### The HITL to Autopilot Progression

| Phase | Mode | Volume Threshold | Accuracy Requirement | Risk Level |
|---|---|---|---|---|
| Phase 1 | HITL (Human-in-the-Loop) | All replies | N/A (human decides) | Zero |
| Phase 2 | Selective Autopilot | OOO + "Send More Info" only | 95%+ approval rate in HITL | Low |
| Phase 3 | Expanded Autopilot | All except "Interested" + "Objection" | 90%+ approval rate | Medium |
| Phase 4 | Full Autopilot (rare) | All reply types | 95%+ across all types | High — monitor daily |

**Phase 1: HITL (Human-in-the-Loop)**
- AI drafts reply → human reviews in Activity Feed → human approves/edits/rejects → sends
- Run HITL for minimum 20-30 approved responses before considering Autopilot
- Review AI performance: is the tone right? Are the replies personalized? Are objections
  handled correctly? Does the AI know when to book vs. when to nurture?
- Refine the AI agent's training prompts based on what you're editing

**HITL tracking metrics**:
```
Approval rate: approved drafts / total drafts → target: >90% before moving to Autopilot
Edit rate: edited drafts / total drafts → target: <15% (if higher, retrain prompts)
Rejection rate: rejected drafts / total drafts → target: <5%
Meeting booking rate: meetings booked / interested replies handled → target: >40%
```

**Phase 2: Autopilot (Selective)**
- AI sends replies automatically within 5 minutes of receiving them
- Deploy Autopilot only on campaigns/reply types where HITL quality is consistently high
- Never deploy Autopilot on complex objection replies or enterprise-level leads
- Recommended: Autopilot for OOO auto-responses and simple "send me more info" requests;
  HITL for "Interested" and "Objection" labels

### Configuring the AI Reply Agent

```
Campaign → AI Settings → AI Reply Agent:

1. Agent Name: [Sender name from the campaign]
2. Mode: HITL (start here) or Autopilot (after validation)
3. Response time: 5 minutes (Autopilot) / Queue for review (HITL)
4. Separate agents per campaign type (cold outreach vs. re-engagement)
```

### AI Reply Agent System Prompt Template

```
You are [Name], [Role] at [Company]. You handle email replies from cold outreach prospects.

CONTEXT:
Our offer: [1-2 sentence description of what you do and who you help]
Our proof: [Key case study: "[Company] achieved [result] in [timeframe]"]
Our pricing: [If relevant — "$X/month" or "enterprise pricing, custom quotes"]
Tone: [Professional but warm / Direct and concise / Conversational, not salesy]
Calendar link: [URL — only share when appropriate]

RESPONSE RULES BY REPLY TYPE:

When someone is Interested:
- Acknowledge their interest specifically (reference what they said)
- Ask 1 clarifying question OR offer a calendar link directly
- Keep reply under 75 words
- CTA: [specific ask — e.g., "Would [day] at [time] work for a quick call?"]
- NEVER just say "glad you're interested" without a concrete next step

When someone says Not Now / Wrong Timing:
- Validate their timing without pressure
- Ask: "Would it be helpful if I followed up in [X weeks/months]?"
- Keep the door open with one specific value note
- NEVER push for a meeting when they've said the timing is wrong

When someone asks a Question / Objection:
- Do NOT send a canned response — flag for human review
- Set draft status: NEEDS_HUMAN_REVIEW
- Include a draft response for the human to edit

When someone says they're the Wrong Person:
- Thank them sincerely
- Ask: "Is there someone on your team who handles [specific area]?"
- Keep it to 2 sentences

When someone is Out of Office:
- Do NOT reply to the OOO message
- Flag for auto-resume after return date + 2 days

ALWAYS:
- Reference something specific from their original reply
- Never copy-paste generic templates
- Sound like a human, not a chatbot
- Keep all replies under 75 words
- Sign with [Name] only (no title, no company, no PS)

NEVER:
- Send a calendar link to someone who hasn't expressed interest
- Use exclamation marks or emojis
- Reference the AI or automation ("our system detected...")
- Make promises about pricing or capabilities you haven't been trained on
```

---

## 4. Lead Status and Pipeline Workflow

Instantly's lead status system tracks prospects through your pipeline. Elite operators use
this to generate real revenue reporting, not just outreach metrics.

### The Lead Status Architecture

```
New → In Sequence → Replied → Interested → Meeting Booked → Qualified → Won/Lost
```

### Status Definitions, Triggers, and SLAs

| Status | Trigger | Next Action | SLA | Conversion Benchmark |
|---|---|---|---|---|
| **In Sequence** | Added to campaign | Sequence auto-runs | — | — |
| **Replied** | Any reply received | AI classifies label | Immediate (auto) | 3-10% of sends |
| **Interested** | AI labels as Interested | Human follow-up | < 1 hour | 15-30% of replies |
| **Meeting Booked** | Reply confirms call | Send calendar invite, prep materials | < 4 hours | 40-60% of interested |
| **Qualified** | Call completed, fit confirmed | Move to CRM pipeline | < 24 hours | 50-70% of meetings |
| **Won** | Deal closed | Attribution logging | — | 20-40% of qualified |
| **Lost** | Deal lost | Log reason, consider re-engagement in 6mo | — | 60-80% of qualified |
| **Not Interested** | Explicit rejection | Block from future campaigns | < 24 hours | — |
| **Wrong Timing** | Timing objection | Schedule re-engagement in 90 days | < 24 hours | 25-40% convert at re-engagement |
| **Wrong Person** | Redirect received | Add referred contact to campaign | < 24 hours | 10-20% of referrals convert |

### The Opportunities View

Instantly's Opportunities feature tracks the pipeline beyond email metrics:
- **Pipeline value** per open opportunity
- **Meetings booked** linked to campaigns and segments
- **Conversion rate** from reply → meeting → qualified → closed
- **Revenue attribution**: which campaigns, segments, and hooks are producing closed deals

**Setting up Opportunities correctly**:

```
1. Every "Meeting Booked" status creates an Opportunity record
   → Field mapping:
      - Deal name: [Contact Name] - [Company Name]
      - Deal value: [Estimated ACV — default from campaign settings]
      - Source: [Campaign name]
      - Stage: Meeting Booked

2. Assign deal value to each Opportunity
   → Use estimated ACV if exact value unknown
   → Update with real value after qualification call

3. Update status as deals progress
   → Meeting Booked → Qualified → Proposal Sent → Won/Lost

4. Tag with attribution data:
   → Campaign source
   → Segment/ICP
   → Hook type (problem/timeline/social proof)
   → Sequence step that generated the reply
```

**The revenue attribution loop**:
When you know which segment, hook, and copy combination produces the most closed revenue
(not just meetings — closed revenue), you know exactly where to double down. This is the
data that separates operators from true revenue architects.

See `references/analytics-optimization.md` Section 8 for the full attribution framework
connecting Instantly data to CRM revenue.

---

## 5. Subsequence Triggers from Unibox

The operational implementation of the subsequence architecture designed in
`references/campaign-architecture.md`. This section focuses on the execution mechanics
inside Instantly.

### Configuring Subsequence Triggers

In Campaign → Sequences → Add Subsequence:

**Trigger setup**:
- Condition: "When lead reply is labeled as [label]"
- OR: "When lead status changes to [status]"
- OR: "When lead has not replied after [N] days" (for alternative nurture path)

### Subsequence Templates with Timing

**The "Interested but No Meeting" Subsequence**:
```
Trigger: Reply labeled "Interested" + no meeting booked within 48 hours
Expected conversion: 30-50% to meeting with proper follow-up

Step 1 (Day 1 after reply):
  Subject: Re: [original thread]
  "Thanks for the reply, {{firstName}} — how about [specific day/time],
   or here's my calendar: [link]?"
  Word count: ≤40

Step 2 (Day 3):
  Subject: Re: [original thread]
  "[Proof point relevant to their company] — figured this would be
   useful context. Still up for a quick chat?"
  Word count: ≤50

Step 3 (Day 7):
  Subject: Re: [original thread]
  "Last follow-up on this — if async works better, happy to send
   a quick Loom walking through how this could work for {{companyName}}."
  Word count: ≤40
```

**The OOO Management Subsequence**:
```
Trigger: Reply labeled "Out of Office"
Expected conversion: 15-25% to meeting after return

Step 1: Pause main sequence for [return date from OOO] + 2 business days
Step 2 (after pause):
  "Welcome back from your time away — wanted to circle back on my note
   from [date]. [1-sentence value prop recap]. Worth a quick chat?"
  Word count: ≤50
```

**The Resource-Sent Subsequence**:
```
Trigger: Reply labeled "Want More Info" + resource sent
Expected conversion: 20-35% to meeting

Step 1 (Day 3 after resource):
  "Wanted to check in — did you get a chance to look at [resource]?"
  Word count: ≤20

Step 2 (Day 7):
  "Any questions after looking it through? Happy to jump on a
   quick call if it'd be helpful."
  Word count: ≤25
```

---

## 6. CRM Integration and Handoff

The connection between Instantly and your CRM is where outbound becomes a system rather
than a campaign. A positive reply that doesn't sync to CRM within minutes creates pipeline
leakage.

### Native Integrations

| CRM | Integration Type | Sync Direction | Key Features |
|---|---|---|---|
| HubSpot | Native (OutboundSync) | Bidirectional | Activities, contacts, deals, property mapping |
| Salesforce | Native | Bidirectional | Opportunities, contacts, activity logging |
| Pipedrive | Native | Bidirectional | Deals, contacts, activities |
| Other CRMs | Zapier / Make / n8n | Webhook-triggered | Custom field mapping, conditional logic |

### Integration Field Mapping

```
INSTANTLY → CRM FIELD MAPPING

Contact Fields:
  Instantly email → CRM Email (match key for dedup)
  Instantly firstName → CRM First Name
  Instantly lastName → CRM Last Name
  Instantly companyName → CRM Company / Account
  Instantly title → CRM Job Title

Activity Fields:
  Every email sent → CRM Activity: "Cold Email Sent" (with subject + body)
  Every reply received → CRM Activity: "Prospect Reply" (with content)
  Every status change → CRM Activity: "Status: [new status]"

Deal/Opportunity Fields:
  Lead status → Interested → CRM: Create Opportunity
  Campaign name → CRM Custom Property: "Instantly Campaign Source"
  Sequence step → CRM Custom Property: "Reply Step"
  Reply label → CRM Custom Property: "Reply Classification"
  Hook type → CRM Custom Property: "Hook Type" (for attribution)
```

### Deduplication Rules
- Match on email address first, then company domain
- Don't create duplicate contacts for the same email
- When Instantly contact matches existing CRM contact, update — don't create new
- If contact exists in CRM as "Customer" → exclude from cold campaigns (add to block list)

### The Handoff SLA

| Event | CRM Action | Notification | Target Time |
|---|---|---|---|
| Lead marked "Interested" | Create/update Contact + Create Opportunity | Slack + CRM task | < 5 minutes (automated) |
| Meeting booked | Update Opportunity stage | Slack + calendar invite | < 5 minutes (automated) |
| Deal qualified | Update Opportunity stage + deal value | CRM task for account exec | < 24 hours |
| Deal won/lost | Close Opportunity + log reason | Team notification | < 24 hours |

### Zapier / Make / n8n Integration (For Advanced Workflows)

For CRMs without native Instantly integration, or for custom handoff logic:

```
WORKFLOW: Interested Reply → CRM + Notification

Trigger: Instantly Webhook (on lead status change)

Step 1: Filter
  IF status = "Interested" AND reply_label = "Interested"
  THEN continue
  ELSE stop

Step 2: CRM Actions
  → Create/Update Contact (match on email)
  → Create Deal with fields:
     - Name: "[Contact Name] - [Company]"
     - Source: [campaign name]
     - Stage: "Interested"
     - Value: [default ACV]
  → Create Task: "Follow up within 1 hour"
     - Due: NOW + 60 minutes
     - Assigned to: [rep]

Step 3: Notification
  → Slack message to #sales-replies:
     "[Name] at [Company] replied interested
      Campaign: [campaign name]
      Reply: [first 100 chars of reply]
      Unibox link: [deep link]"

Step 4: (If Meeting Booked)
  → Update Deal stage: "Meeting Scheduled"
  → Add activity log with meeting notes field
  → Trigger pre-meeting prep workflow
```

See `references/ai-personalization.md` for Clay-to-Instantly integration that enriches
contacts before they enter campaigns, ensuring CRM records are complete from the start.

---

## 7. The Agency Multi-Client Operations Model

For agencies managing outbound for multiple clients, Instantly's architecture matters.

### Workspace Structure

| Architecture | Use Case | Isolation Level | Cost Implication |
|---|---|---|---|
| Separate workspace per client | Standard for agencies | Complete — campaigns, inboxes, Unibox, analytics, CRM | Each workspace has its own subscription |
| Shared workspace with labels | Testing/early stage only | Minimal — risk of cross-contamination | Not recommended for production |

**Separate workspace per client provides**:
- Complete isolation — separate campaigns, inboxes, Unibox, analytics, CRM sync
- No cross-contamination of reputation or data
- Separate deliverability network per workspace
- Client A's bounce issues don't affect Client B's reputation
- Independent billing and reporting

### Agency Operational Efficiency

**Standardize across clients**:

| Element | Standardize | Customize |
|---|---|---|
| Sequence architecture (5-step, day 1/3/7/11/17) | Yes | Cadence timing may vary by ACV |
| A/Z testing protocol | Yes — same methodology | Test variables specific to each client's ICP |
| Unibox SLA (1-hour for Interested) | Yes | — |
| Weekly report format | Yes — consistent metrics | Client-specific commentary |
| AI Reply Agent prompt structure | Template is standard | Offer, tone, proof specific to client |
| Infrastructure setup (domains, DNS, warmup) | Process is standard | Domain names client-specific |

**The client reporting stack** — pull these metrics weekly per client:

```
CLIENT WEEKLY REPORT TEMPLATE

Deliverability:
  Emails sent: [N]
  Delivery rate: [%] (target: >98%)
  Bounce rate: [%] (target: <1%)
  Inbox placement trend: [Improving / Stable / Declining]

Performance:
  Open rate: [%] (directional only — Apple MPP caveat)
  Reply rate: [%] (target: >5%)
  Positive reply rate: [%] (target: >50% of replies)
  Meetings booked: [N]
  Pipeline value created: [$]

Optimization:
  A/Z test results: [winner description + lift %]
  Current winning variant: [description]
  Next test planned: [description]

Segment Breakdown:
  [Segment A]: [reply rate] / [meetings] / [pipeline]
  [Segment B]: [reply rate] / [meetings] / [pipeline]

Recommendations:
  [1-3 specific actions for next week]
```

**Scaling without headcount**:
The key to profitable agency operations: AI Reply Agent handles volume, Unibox consolidates
management, Instantly's flat-fee unlimited inbox model means costs don't scale with client
count. The limiting factor is strategy capacity, not operational capacity.

| Agency Scale | Clients | Team Size | Key Bottleneck |
|---|---|---|---|
| Solo | 1-3 | 1 | Time management — Unibox + strategy in same person |
| Small | 4-8 | 2-3 | Strategy capacity — need dedicated campaign manager |
| Medium | 9-20 | 4-6 | Process standardization — SOPs critical |
| Large | 20+ | 7+ | Quality control — AI Agent + SLA monitoring essential |

---

## 8. Unibox SLAs and Team Workflows

### Response Time SLAs

| Reply Type | SLA | Why | Impact of Missing SLA |
|---|---|---|---|
| **Interested** | < 1 hour | 7x qualification rate within 1 hour (HBR) | Meeting conversion drops 50%+ after 4 hours |
| **Objection / Question** | < 4 hours | Question unanswered = lost momentum | Interest decays; competitor may respond first |
| **Want More Info** | < 4 hours | Send resource while interest is active | Prospect moves on; forgets the conversation |
| **OOO** | < 24 hours | Configure subsequence; set resume correctly | Risk of sending during their absence |
| **Wrong Person** | < 24 hours | Extract referral; add to campaign | Referral window closes; contact forgets |
| **Not Interested** | < 24 hours | Block; log; no further contact | Risk of accidental re-contact |

### SLA Monitoring

```
DAILY SLA CHECK (5 minutes)

1. Filter Unibox by "Interested" label, last 24 hours
   → Any reply older than 1 hour without a response? → Handle immediately

2. Filter by "Objection" + "Want More Info", last 24 hours
   → Any reply older than 4 hours? → Handle immediately

3. Check AI Reply Agent queue
   → Any drafts pending approval for >2 hours? → Review immediately

4. Log SLA compliance: [% of Interested replies handled within 1 hour]
   → Target: 95%+ compliance
   → Below 80%: systemic issue — need process change or additional capacity
```

### Team Role Definitions (For Agencies / Teams)

| Role | Primary Responsibility | Key Metrics | Tools |
|---|---|---|---|
| **Unibox Manager** | Monitor Priority Queue daily; route complex replies; ensure SLAs met; manage AI Agent quality | SLA compliance %, AI approval rate | Unibox, Slack notifications |
| **SDR / Closer** | Handle "Interested" and "Objection" replies; book meetings; move leads through pipeline | Meetings booked, reply-to-meeting conversion | Unibox, Calendar, CRM |
| **Campaign Manager** | Review performance weekly; manage A/Z tests; update copy; manage list building | Reply rate, positive reply rate, meetings/1000 sent | Analytics, Copilot, SuperSearch |

---

## 9. Instantly Copilot — The Strategic Assistant

Copilot is Instantly's AI assistant built into the platform. Used correctly, it accelerates
campaign strategy, sequence writing, data interpretation, and optimization.

### High-Value Copilot Use Cases

| Use Case | How to Use | Time Saved | Quality Note |
|---|---|---|---|
| Sequence generation | Prompt with ICP + pain + offer + hook type | 30-60 min per sequence | Starting point — elevate with copy skill |
| Spam check | Run every sequence through Spam Words Checker before launch | 5-10 min per sequence | Non-negotiable pre-launch step |
| Analytics summary | "What are my top 3 campaigns this week and why?" | 15-20 min per review | Good for pattern identification |
| A/Z test hypotheses | "My subject lines get X% opens but Y% replies — what to test?" | 10-15 min per hypothesis | Starting point for human judgment |
| Company name cleanup | Copilot template: normalize company names in list | 30-60 min per list | Prevents personalization failures |

### Sequence Generation Prompt Template

```
Write a [N]-step cold email sequence for:

ICP: [exact title, company type, size, stage]
Pain: [specific frustration in their language]
Offer: [what you do — 1 sentence]
Proof: [case study: "[Company] achieved [result] in [timeframe]"]
Hook type for Step 1: [Problem / Timeline / Social Proof / Curiosity]

Requirements:
- Step 1: ≤80 words, question-based CTA, no calendar link
- Step 2: ≤50 words, "feels like a reply" format
- Step 3: ≤60 words, proof-focused
- Step 4: ≤30 words, direct question only
- Step 5: ≤40 words, breakup

Include spintax for subject lines (3 variants) and CTAs (2 variants).
Tone: [conversational / professional / direct]
```

Then edit using the copy skill standards — Copilot generates direction-setting
copy; your copywriting skill elevates it to conversion-grade.

See `references/copy-integration.md` for the full copy brief template and quality
standards checklist.

### Weekly Review Workflow

Enable "Scheduled Analytics Summaries" in Copilot settings — receive a weekly performance
digest without logging in manually.

```
COPILOT WEEKLY REVIEW SEQUENCE

Monday: Ask Copilot → "Show me inbox health scores for all active campaigns"
Wednesday: Ask Copilot → "What are my best and worst performing campaigns
           by positive reply rate this week? What's different about them?"
Friday: Ask Copilot → "Based on this week's A/Z test results, what should
        I test next week?"
```

---

## 10. Operational Metrics & Benchmarks

### The Instantly Operations Dashboard

Track these metrics daily/weekly to maintain operational excellence:

| Metric | Target | Warning | Critical | Check Frequency |
|---|---|---|---|---|
| SLA compliance (Interested <1hr) | >95% | 80-95% | <80% | Daily |
| AI label accuracy | >90% | 80-90% | <80% | Weekly audit |
| AI Reply Agent approval rate (HITL) | >90% | 80-90% | <80% | Weekly |
| Reply-to-meeting conversion | >40% | 25-40% | <25% | Weekly |
| Meeting no-show rate | <15% | 15-25% | >25% | Weekly |
| CRM sync success rate | >99% | 95-99% | <95% | Daily |
| Average time to first response (Interested) | <30 min | 30-60 min | >60 min | Daily |

### Pipeline Velocity Metrics

| Metric | Formula | Benchmark | Optimization Lever |
|---|---|---|---|
| Emails to meeting | Total sends / meetings booked | 100-300 sends per meeting | List quality + copy quality |
| Reply to meeting | Positive replies / meetings booked | 2-4 positive replies per meeting | Reply handling speed + quality |
| Meeting to qualified | Meetings / qualified opportunities | 50-70% qualification rate | ICP accuracy |
| Qualified to closed | Qualified / closed won | 20-40% close rate | Sales process (beyond email) |
| Full funnel: emails to revenue | Total sends / closed won deals | 500-2,000 sends per deal | Entire system |

---

## 11. Troubleshooting Unibox & Pipeline Issues

### Common Problems and Fixes

| Problem | Likely Cause | Diagnosis | Fix |
|---|---|---|---|
| Replies not appearing in Unibox | Inbox not connected or connection expired | Check Settings → Email Accounts → Connection status | Reconnect inbox; verify OAuth permissions |
| AI labels consistently wrong | Label descriptions too vague or conflicting | Review last 50 labels; identify pattern | Rewrite label descriptions with specific keywords and exclusions |
| "Interested" replies not converting to meetings | Slow response time or weak follow-up copy | Check average time-to-response; review sent replies | Enforce 1-hour SLA; audit AI Agent responses |
| CRM not syncing | Webhook failure or field mapping error | Check integration logs in Make/Zapier/n8n | Verify webhook URL; test field mapping; check CRM permissions |
| Pipeline value not tracking | Opportunities not created on status change | Check if "Meeting Booked" auto-creates Opportunity | Configure automation: status change → Opportunity creation |
| Duplicate contacts in pipeline | Deduplication rules not configured | Check CRM for multiple records per email | Set email as primary match key; configure merge rules |
| AI Reply Agent sending inappropriate responses | System prompt too vague or missing edge cases | Review last 20 AI-sent responses | Update system prompt with specific rules for edge cases |

### The Weekly Operations Audit

```
WEEKLY OPERATIONS AUDIT (20 minutes)

1. Unibox Health
   - Any replies older than 24 hours unprocessed? → Clear immediately
   - SLA compliance this week: [%] → Target: >95%
   - AI label accuracy (spot-check 10 labels): [%] → Target: >90%

2. Pipeline Health
   - Interested → Meeting Booked conversion this week: [%] → Target: >40%
   - Any "Interested" leads stuck without meeting for >7 days? → Follow up or close
   - Meeting no-show rate: [%] → Target: <15%

3. Integration Health
   - CRM sync errors this week: [N] → Target: 0
   - Any contacts missing from CRM that should be there? → Fix mapping

4. AI Agent Health (if using)
   - Approval rate in HITL: [%] → Target: >90%
   - Any embarrassing or incorrect responses sent? → Update prompt
   - Meeting booking rate from AI-handled replies: [%] → Compare to human baseline
```

See `references/analytics-optimization.md` for the full weekly optimization protocol that
incorporates these operational metrics into campaign-level decisions.
