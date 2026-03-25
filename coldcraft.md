# ColdCraft HQ — Complete System Reference

> This is the master reference for ColdCraft HQ, a B2B cold email agency's autonomous outbound automation platform. Use this document as system context when working on any part of the codebase.

---

## Owner & Preferences

**Matt** runs ColdCraft HQ, a B2B cold email agency that builds and manages cold outreach infrastructure for clients. He learned from Lead Gen Jay (mentor who sells ReplyJI 2.0 for $2.5k on n8n/Make.com). Matt prefers to build tools himself rather than buy them.

**Working style:**
- Action-oriented. Wants things built, not explained.
- Comfortable with you making technical decisions.
- Prefers concise communication. Skip preamble, lead with the answer or action.
- When writing AI-generated email replies: reduce em dashes (AI tell), cut unnecessary qualifiers like "not just a brush-off" or "and that's totally fine" (humans don't hedge like that). The goal is replies that sound like a sharp human BDR wrote them.

---

## What This System Is

ColdCraft HQ is a **fully autonomous B2B outbound sales platform** that:

1. **Detects buying signals** (funding rounds, leadership changes, sales hiring, G2 reviews, tech stack changes)
2. **Finds and verifies decision-maker emails** (pattern cache + SMTP verification via self-hosted Reacher)
3. **Researches companies with AI** (Perplexity + Claude synthesis for personalized openers)
4. **Pushes leads into email campaigns** (Instantly.ai with signal-specific campaign routing)
5. **Orchestrates multi-channel sequences** (email D1 + LinkedIn connect D1 + LinkedIn DM D5 + voice call D5)
6. **Handles all inbound replies autonomously** (AI categorization, playbook-driven drafting, confidence-based auto-send)
7. **Self-improves from outcomes** (tracks what works, adjusts signal weights, ICP scoring, confidence thresholds, and opener patterns)
8. **Syncs everything to CRM** (Close CRM lifecycle hooks: after push, on interested, on meeting booked)
9. **Books meetings via Calendly** (webhook triggers CRM opportunity creation + auto-opportunity enrichment with MRR estimate)
10. **Bi-directional CRM sync** (Close status changes propagate back to Instantly — tag, delete, block, nurture)
11. **Monitors sending account health** (bounce/reply rate tracking, health scoring, Slack alerts for degraded accounts)
12. **Runs A/B campaign experiments** (per-signal-type variant routing, round-robin assignment, reply rate + revenue tracking)
13. **Attributes revenue to signals** (traces won/lost deals back to originating signal source, feeds into learning optimizer)

The system replaces ReplyJI 2.0 ($2.5k + n8n/Make.com subscription + OpenRouter markup) with self-hosted, direct API, zero middleman.

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | TypeScript 5, React 18 |
| Database | Supabase Postgres | pgvector for knowledge base embeddings |
| Hosting | Vercel (Pro plan) | 8 cron jobs, 300s function timeout |
| AI - Classification/Drafting | Claude Sonnet 4.6 | Anthropic SDK, chain-of-thought prompts |
| AI - Embeddings | OpenAI text-embedding-3-small | Knowledge base vector search |
| AI - Research | Perplexity sonar-pro | 3 specialized parallel agents (Company, Signal, Persona) |
| Email Platform | Instantly.ai | Dual API keys for round-robin load balancing |
| Email Verification | Self-hosted Reacher VPS | verify.coldcrafthq.com, Docker + Caddy |
| External Verification | MillionVerifier + FindyMail | Fallback for catch-all/unknown emails |
| Email Finding | FindyMail + pattern cache + SMTP permutations | 3-level waterfall |
| Signal Scraping | Apify | Google Search, LinkedIn Jobs, Product Hunt, Twitter/X, Crunchbase actors |
| LinkedIn Automation | HeyReach API | Connection requests + DM follow-ups |
| Voice Calls | Vapi REST API | AI voice follow-up with outcome classification |
| CRM | Close CRM | REST API + MCP server for tool access |
| Meeting Booking | Calendly | HMAC-SHA256 verified webhooks |
| Notifications | Slack | Block Kit messages for hot leads, auto-sends, legal threats |
| CSS | Tailwind CSS 3.4 | Custom dark theme with Satoshi/JetBrains Mono/Instrument Serif |
| Animation | Framer Motion | Landing page only |
| Icons | Lucide React | Dashboard + components |
| CSV | PapaParse | Bulk verification + finder uploads |

**Production URL:** https://www.coldcrafthq.com (always use www to avoid redirect stripping auth headers)

**Supabase project ref:** gqbhpsphtrslzigikhvl

---

## Project Structure

```
coldcrafthq/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── champions/check/         # Job change monitoring cron
│   │   │   ├── crm/
│   │   │   │   ├── attribution/         # Revenue attribution analytics
│   │   │   │   ├── leads/               # CRM lead operations
│   │   │   │   └── pipeline/            # Live Close CRM pipeline
│   │   │   ├── cron/
│   │   │   │   ├── account-health/      # Daily account health monitoring
│   │   │   │   ├── auto-send/           # Daily reply engine automation
│   │   │   │   ├── revenue-check/       # Daily revenue attribution
│   │   │   │   ├── sync-close/          # Bi-directional Close ↔ Instantly sync
│   │   │   │   └── verify/              # Periodic verification maintenance
│   │   │   ├── finder/
│   │   │   │   ├── bulk/                # CSV email finding
│   │   │   │   └── find/                # Single email finder
│   │   │   ├── heat/score/              # Account heat scoring
│   │   │   ├── knowledge/               # Knowledge base CRUD
│   │   │   ├── learning/
│   │   │   │   ├── insights/            # Funnel metrics + analytics
│   │   │   │   └── optimize/            # Signal/ICP/opener optimization
│   │   │   ├── linkedin/
│   │   │   │   ├── connect/             # HeyReach connection requests
│   │   │   │   ├── message/             # HeyReach DM follow-ups
│   │   │   │   └── monitor/             # LinkedIn post monitoring
│   │   │   ├── pipeline/
│   │   │   │   ├── check/               # Poll Apify status, ingest signals
│   │   │   │   ├── ingest/              # Start Apify scraping actors
│   │   │   │   ├── leads/               # List pipeline leads
│   │   │   │   └── process/             # Enrich single lead (full chain)
│   │   │   ├── replies/[id]/
│   │   │   │   ├── approve/             # Send AI draft
│   │   │   │   ├── book/                # Mark meeting booked + CRM opp
│   │   │   │   ├── regenerate/          # New draft from scratch
│   │   │   │   ├── revise/              # Human edit → train + send
│   │   │   │   └── skip/                # Skip this reply
│   │   │   ├── tam/
│   │   │   │   ├── coverage/            # TAM coverage analytics
│   │   │   │   └── discover/            # Company discovery cron
│   │   │   ├── verify/
│   │   │   │   ├── bulk/                # Start bulk verification job
│   │   │   │   ├── campaigns/           # List Instantly campaigns
│   │   │   │   ├── jobs/                # List verification jobs
│   │   │   │   ├── process/             # Process next verification chunk
│   │   │   │   ├── push/                # Push verified emails to Instantly
│   │   │   │   ├── results/[jobId]/     # Get verification results
│   │   │   │   ├── single/              # Verify one email
│   │   │   │   └── status/[jobId]/      # Job progress polling
│   │   │   ├── dashboard/analytics/     # Unified analytics aggregation API
│   │   │   ├── instantly/
│   │   │   │   ├── experiments/         # A/B experiment CRUD
│   │   │   │   └── health/             # Account health snapshots
│   │   │   ├── voice/trigger/           # Vapi voice call scheduling
│   │   │   └── webhooks/
│   │   │       ├── instantly/           # Reply engine webhook (main orchestrator)
│   │   │       ├── instantly/bounce/    # Hard bounce tracking
│   │   │       ├── calendly/            # Meeting booking webhook
│   │   │       └── vapi/                # Voice call completion webhook
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Replies dashboard (main)
│   │   │   ├── layout.tsx               # 10-tab navigation
│   │   │   ├── analytics/              # Unified analytics (funnel, ROI, health, A/B, wins)
│   │   │   ├── crm/                     # Close CRM pipeline view
│   │   │   ├── heat/                    # Account heat scores
│   │   │   ├── insights/               # Funnel analytics + learning
│   │   │   ├── knowledge/              # Knowledge base editor
│   │   │   ├── pipeline/               # Signal ingestion + enrichment
│   │   │   ├── settings/               # Config + setup guide
│   │   │   ├── tam/                    # TAM discovery map
│   │   │   └── verify/                 # Email verification UI
│   │   │
│   │   ├── book/                        # Booking page
│   │   ├── fonts/                       # Custom web fonts
│   │   ├── layout.tsx                   # Root layout (Analytics + Speed Insights)
│   │   └── page.tsx                     # Marketing landing page
│   │
│   ├── components/                      # Landing page components
│   │   ├── Hero.tsx                     # Above-the-fold + mock dashboard
│   │   ├── System.tsx                   # 4-stage system overview + 6 feature cards
│   │   ├── Process.tsx                  # 4-step onboarding timeline
│   │   ├── Comparison.tsx               # ColdCraft vs DIY vs Agency table
│   │   ├── Deliverables.tsx             # Mock dashboard deliverable cards
│   │   ├── PainPoints.tsx               # Problem identification
│   │   ├── FoundingClients.tsx          # Social proof
│   │   ├── FAQ.tsx                      # Frequently asked questions
│   │   ├── FinalCTA.tsx                 # Bottom CTA
│   │   ├── Navbar.tsx                   # Fixed top nav with scroll blur
│   │   └── Footer.tsx                   # Footer
│   │
│   └── lib/                             # Core business logic
│       ├── ai/
│       │   ├── auto-send.ts             # Confidence-based auto-send + timeout fallback
│       │   ├── categorize.ts            # 7-category reply classification (Claude)
│       │   ├── draft-reply.ts           # Playbook + research + knowledge drafting (Claude)
│       │   ├── outcomes.ts              # Self-learning: outcome scoring, lessons, threshold tuning
│       │   ├── playbooks.ts             # 17 sub-category reply frameworks
│       │   └── train.ts                 # Training examples + knowledge base CRUD (OpenAI embeddings)
│       ├── champions/
│       │   ├── job-change-detector.ts   # LinkedIn job change detection
│       │   └── watchlist.ts             # Champion watchlist management
│       ├── conversation/
│       │   ├── auto-router.ts           # Classify → draft → store → auto-action
│       │   ├── reply-classifier.ts      # 7-category classification (20 token Claude)
│       │   └── reply-drafter.ts         # Category-specific reply drafting
│       ├── crm/
│       │   ├── close-client.ts          # Close CRM REST client (basic auth, logEmail/logCall/createTask/getCurrentUser)
│       │   ├── close-sync.ts            # 3 lifecycle hooks + logActivityToClose (7 activity types)
│       │   ├── reverse-sync.ts          # Close → Instantly reverse sync (watermark polling)
│       │   └── revenue-attribution.ts   # Traces won/lost deals back to signal source
│       ├── enrichment/
│       │   ├── campaign-mapper.ts       # Signal type → Instantly campaign ID
│       │   ├── contact-finder.ts        # 4-level waterfall: LinkedIn People Search → Google LinkedIn → website → Google
│       │   ├── research-agent.ts        # Legacy single-agent research (deprecated)
│       │   └── research-agents/
│       │       ├── index.ts             # Multi-agent orchestrator (parallel agents → Claude synthesis)
│       │       ├── perplexity.ts        # Shared Perplexity search helper
│       │       ├── company-agent.ts     # Agent 1: Company fundamentals + tech stack + competitors
│       │       ├── signal-agent.ts      # Agent 2: Signal-specific context (8 tailored query builders)
│       │       └── persona-agent.ts     # Agent 3: Contact profile + career history + priorities
│       ├── finder/
│       │   ├── index.ts                 # FindyMail → pattern cache → SMTP permutations
│       │   ├── patterns.ts              # Domain pattern cache with Bayesian confidence
│       │   └── permutations.ts          # 10 B2B email pattern generator
│       ├── gtm/
│       │   └── types.ts                 # Complete GTM type definitions
│       ├── heat/
│       │   └── account-scorer.ts        # Signal-weighted heat scoring + tier assignment
│       ├── learning/
│       │   ├── icp-learner.ts           # Winning ICP patterns (industry/headcount/funding)
│       │   ├── opener-analyzer.ts       # Extract winning openers for few-shot injection
│       │   ├── performance-tracker.ts   # Read-only funnel metrics builder
│       │   └── signal-optimizer.ts      # Per-signal conversion rate → dynamic scoring
│       ├── linkedin/
│       │   ├── connection-sender.ts     # HeyReach connection requests
│       │   ├── heyreach-client.ts       # HeyReach REST client
│       │   └── social-monitor.ts        # LinkedIn post monitoring + Claude comments
│       ├── orchestrator/
│       │   └── sequence-runner.ts       # Multi-channel sequence execution
│       ├── pipeline/
│       │   ├── processor.ts             # Full enrichment chain (contact → email → verify → research → push → CRM)
│       │   └── composite-scorer.ts      # Composite lead score (40% signal + 20% email + 40% TAM)
│       ├── signals/
│       │   ├── crunchbase-activity.ts   # Crunchbase recent funding + growth indicator parser
│       │   ├── deduplicator.ts          # Remove duplicate signals (by signal_date)
│       │   ├── funding.ts               # Funding round signal parser
│       │   ├── icp-filter.ts            # ICP qualification (domain, title, geo, industry)
│       │   ├── job-postings.ts          # Job posting signal parser (date from Apify data)
│       │   ├── leadership.ts            # Leadership change signal parser
│       │   ├── product-hunt.ts          # Product Hunt B2B launch signal parser
│       │   ├── scorer.ts                # Signal scoring (type + recency + headline)
│       │   ├── twitter.ts               # Twitter/X funding/hiring/growth signal parser
│       │   ├── types.ts                 # Signal types + ICP config
│       │   ├── utils.ts                 # Signal utilities
│       │   └── intent/
│       │       ├── g2-scraper.ts        # G2 competitor review scraping
│       │       └── technographic.ts     # Tech stack signal detection (checks companyWebsite first)
│       ├── supabase/
│       │   ├── client.ts               # Singleton Supabase client (lazy init, service role)
│       │   ├── schema.sql              # V1: replies, knowledge_base, training_examples
│       │   ├── migration-v2.sql        # V2: sub_category, confidence, auto_sent, research_data
│       │   ├── migration-v3-outcomes.sql  # V3: outcome tracking, examples, threshold tuning
│       │   ├── migration-v4-verify.sql    # V4: verification_jobs, verification_results, domain_cache
│       │   ├── migration-v4-outcomes.sql  # V4: email_outcomes (bounce history)
│       │   ├── migration-v5-gtm.sql       # V5: domain_patterns, signal_sources, raw_signals, pipeline_leads
│       │   └── migration-v8-advancement.sql  # V8: close_sync_log, revenue_attribution, account_health, ab_experiments
│       ├── tam/
│       │   ├── company-discovery.ts     # Crunchbase + LinkedIn TAM discovery
│       │   └── company-scorer.ts        # TAM scoring and tier assignment
│       ├── verify/
│       │   ├── bulk-processor.ts        # CSV bulk verification orchestrator
│       │   ├── cache.ts                 # Dual cache: memory (request) + Supabase (24h DNS, 6h catch-all)
│       │   ├── csv-parser.ts            # CSV import utilities
│       │   ├── disposable-domains.ts    # Disposable email domain list
│       │   ├── dns.ts                   # MX record lookup
│       │   ├── export.ts               # CSV export utilities
│       │   ├── external-verify.ts       # Layer 3.5: MillionVerifier + FindyMail
│       │   ├── free-providers.ts        # Gmail, Yahoo, Outlook detection
│       │   ├── outcomes-db.ts           # Layer 0: historical bounce data
│       │   ├── pipeline.ts             # Master 6-layer verification orchestrator
│       │   ├── reacher.ts              # Layer 3: SMTP via self-hosted Reacher VPS
│       │   ├── risk-score.ts           # Layer 5: 0-100 deliverability scoring
│       │   ├── role-addresses.ts       # info@, noreply@, admin@ detection
│       │   ├── syntax.ts              # Layer 1: RFC 5322 + typo detection
│       │   ├── typo-map.ts            # Common domain typos (gmai.com → gmail.com)
│       │   └── types.ts               # Verification type definitions
│       ├── voice/
│       │   ├── call-scheduler.ts       # D5 voice follow-up orchestration
│       │   └── vapi-client.ts          # Vapi AI voice call REST client
│       ├── apify.ts                    # Apify actor control (Google Search, LinkedIn Jobs, Product Hunt, Twitter, Crunchbase, LinkedIn People)
│       ├── instantly.ts                # Instantly.ai client (dual key round-robin, listSendingAccounts)
│       ├── instantly-health.ts         # Account health monitoring (bounce/reply aggregates, scoring)
│       ├── instantly-experiments.ts    # A/B campaign experiments (create, assign, results)
│       ├── perplexity.ts               # Perplexity research (3 parallel queries)
│       ├── slack.ts                    # Slack Block Kit notifications + notifySlack public wrapper
│       └── types.ts                    # Core Reply Engine types
│
├── scripts/
│   ├── migration-v6-elite-gtm.sql      # V6: companies, touchpoints, conversations, voice_calls, etc.
│   ├── migration-v7-learning.sql       # V7: learning_weights, opener_patterns
│   ├── setup-close-crm.ts             # Creates Close CRM statuses, fields, pipeline
│   ├── setup-close-advanced.ts         # Advanced Close setup (templates, sequences, smart views)
│   ├── seed-knowledge.ts              # Populate knowledge base with 18 seed entries
│   └── setup.sh                       # Installation script
│
├── mcp-servers/
│   ├── close-crm.ts                   # Full Close CRM MCP server (leads, opps, contacts, tasks, etc.)
│   └── instantly.ts                   # Full Instantly.ai MCP server (campaigns, leads, threads, etc.)
│
├── docs/
│   ├── SYSTEM.md                      # Complete system documentation (697 lines)
│   └── superpowers/
│       ├── plans/
│       │   ├── 2026-03-23-gtm-intelligence-engine.md
│       │   └── 2026-03-24-elite-gtm-v2.md
│       └── specs/
│           └── 2026-03-24-reverse-lead-magnets-pre-call-video-design.md
│
├── .claude-flow/hive-mind/            # Claude Flow multi-agent state
├── .firecrawl/                        # Firecrawl transcript cache
├── vercel.json                        # Cron jobs + framework config
├── next.config.mjs                    # Minimal (empty) Next.js config
├── tailwind.config.ts                 # Custom dark theme
├── tsconfig.json                      # Strict mode, @/* path alias
└── package.json                       # Dependencies
```

---

## Database Schema

### V1 — Reply Engine Core
| Table | Purpose |
|-------|---------|
| `replies` | All inbound replies with AI classification, draft, confidence, outcome, thread history, research data |
| `knowledge_base` | Company knowledge entries with vector embeddings for semantic search |
| `training_examples` | Human corrections to AI drafts with Claude-analyzed reasoning |

### V2 — Reply Engine Enhanced
Added to `replies`: sub_category, confidence (0-100), auto_sent, tone, urgency, ai_reasoning, framework_used, response_time_ms, research_data (JSONB)

### V3 — Self-Improvement Loop
| Table | Purpose |
|-------|---------|
| `outcome_examples` | Winning/losing reply examples with lessons for prompt injection |
| `threshold_adjustments` | Per-sub-category confidence threshold tuning log |
Added to `replies`: parent_reply_id (chain detection), outcome, outcome_evaluated_at

### V4 — Email Verification
| Table | Purpose |
|-------|---------|
| `verification_jobs` | Bulk CSV upload jobs with status + progress tracking |
| `verification_results` | Individual email verdicts (valid/invalid/risky/unknown) with full analysis |
| `domain_cache` | Cached DNS/SMTP results (24h DNS TTL, 6h catch-all TTL) |
| `email_outcomes` | Historical send outcomes (hard_bounce, soft_bounce, replied, delivered) |

### V5 — GTM Intelligence Engine
| Table | Purpose |
|-------|---------|
| `signal_sources` | Apify actor configs (google_news_funding, linkedin_jobs_sales, google_news_leadership, product_hunt_launches, twitter_signals, crunchbase_activity) |
| `raw_signals` | Scraped signals before enrichment |
| `pipeline_leads` | Central enrichment state machine (pending → finding_contact → finding_email → verifying → researching → pushed/failed/filtered). Includes composite_score (40% signal + 20% email + 40% TAM) |
| `domain_patterns` | Email pattern cache per domain with Bayesian confidence updating |

### V6 — Elite GTM V2
| Table | Purpose |
|-------|---------|
| `companies` | TAM foundation (domain, name, industry, headcount, funding_stage, tier 1/2/3, tam_score, status) |
| `touchpoints` | Multi-channel activity log (email/linkedin/voice per lead) |
| `conversations` | Inbound reply classification (7 categories) + drafted responses |
| `voice_calls` | Vapi call records (transcript, outcome, duration) |
| `champion_watchlist` | Contacts monitored for job changes |
| `account_heat_scores` | Per-company signal aggregation with recency decay |

### V7 — Self-Learning Layer
| Table | Purpose |
|-------|---------|
| `learning_weights` | Dynamic signal scores + ICP dimension optimization (signal, icp_industry, icp_headcount, icp_funding) |
| `opener_patterns` | Winning opener examples by signal_type/industry with conversion tracking |

### V8 — Close CRM + Instantly Advancement
| Table | Purpose |
|-------|---------|
| `close_sync_log` | Watermark-based sync tracking for bi-directional Close ↔ Instantly sync |
| `revenue_attribution` | Traces won/lost deals to signal source, campaign, pipeline lead — feeds into signal optimizer |
| `account_health_snapshots` | Daily sending account health (sends, bounces, replies, health_score 0-100, flagged) |
| `ab_experiments` | A/B experiment definitions (base + variant campaigns per signal type) |
| `ab_experiment_leads` | Per-lead experiment variant assignment with round-robin tracking |

---

## Cron Jobs (vercel.json)

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| Mon-Fri 12:00 UTC | `/api/pipeline/ingest` | Start Apify scrapers (funding, jobs, leadership, Product Hunt, Twitter, Crunchbase) |
| Mon-Fri 13:00 UTC | `/api/pipeline/check` | Poll Apify status, ingest signals, create pipeline leads |
| Mon-Fri 14:00 UTC | `/api/cron/auto-send` | Daily automation: timeout auto-sends, silence evaluation, threshold tuning, multi-channel sequences, learning optimization |
| Every 6 hours | `/api/cron/verify` | Process pending verification jobs |
| Monday 11:00 UTC | `/api/tam/discover` | TAM company discovery via Crunchbase + LinkedIn |
| :03, :33 every hour | `/api/cron/sync-close` | Bi-directional Close ↔ Instantly reverse sync (watermark polling) |
| Daily 13:03 UTC | `/api/cron/revenue-check` | Revenue attribution — trace won/lost deals to signal source |
| Daily 12:07 UTC | `/api/cron/account-health` | Sending account health monitoring + Slack alerts |

---

## Key Flows

### 1. Instantly Reply Webhook (`/api/webhooks/instantly`)
This is the **main orchestrator** for the reply engine:
1. Validates Bearer token webhook secret
2. Records email outcome as 'replied' (non-blocking)
3. Fetches full thread from Instantly via `getThread()`
4. Claude categorizes reply → category, sub_category, confidence, tone, urgency
5. **Hard No**: auto-tags, deletes from campaign, blocks email, alerts on legal threats
6. **Interested/Soft No/Custom**: tags in Instantly, drafts reply with playbooks + research + knowledge
7. Chain detection: finds parent reply (if follow-up) and scores parent's outcome
8. Stores everything in `replies` table
9. Auto-send check: `shouldAutoSend()` → `executeAutoSend()` if high confidence
10. CRM sync: fire-and-forget `markInterestedInCrm()` for interested leads
11. Slack notifications based on urgency
12. Conversation routing: fire-and-forget `routeInboundReply()`

### 2. Lead Enrichment Pipeline (`/api/pipeline/process`)
1. Signal ingested → `raw_signals` table
2. ICP filter → check domain, industry, TLD, title, geography
3. Score signal → recency + headline adjustments (MIN_SIGNAL_SCORE = 55)
4. Create `pipeline_lead` if score qualifies
5. Find decision maker → 4-level waterfall (LinkedIn People Search → Google LinkedIn → website → Google via Apify)
6. Find email → FindyMail → pattern cache → SMTP permutation loop (10 patterns) → catch-all FindyMail bypass
7. Verify email → 6-layer pipeline (syntax → DNS → SMTP → catch-all → MillionVerifier → FindyMail)
7.5. Composite score → 40% signal + 20% email + 40% TAM (prioritizes processing order)
8. AI research → 3 parallel agents (Company + Signal + Persona) → Claude synthesis with competitor awareness + opener patterns
9. Push to Instantly → via signal-specific campaign ID mapping
10. Sync to Close CRM → fire-and-forget lifecycle hook
11. Add to champion watchlist → job change monitoring

### 3. Self-Learning Loop (daily cron)
1. Score outcomes → map follow-up replies to sent replies as positive/negative
2. Extract lessons → Claude analyzes why a reply worked or failed
3. Detect silence → mark 3+ day unresponsive as negative examples
4. Extract opener patterns → Claude finds winning openers by signal type
5. Optimize signal weights → per-signal conversion rates adjust scoring
6. Optimize ICP weights → winning industry/headcount/funding patterns
7. Tune thresholds → adjust confidence thresholds per sub-category

### 4. Multi-Channel Sequence (daily cron)
```
D1: Email (Instantly) + LinkedIn connect (HeyReach)
D5: LinkedIn DM (HeyReach) + Voice call (Vapi) if no email reply
```

### 5. CRM Lifecycle (Close)
1. After Instantly push → `syncLeadToCrm()` creates lead with signal context, sets "Cold Outreach" status
2. On interested classification → `markInterestedInCrm()` moves to "Interested" status + high-priority note
3. On meeting booked (Calendly or manual) → `createOpportunityInCrm()` moves to "Meeting Booked" + creates opportunity with MRR estimate + prep task
4. Activity timeline → `logActivityToClose()` logs 7 event types (email_sent, email_replied, voice_call, linkedin_connect, linkedin_dm, bounce, meeting_booked) fire-and-forget

### 6. Bi-directional Sync (Close ↔ Instantly)
Every 30 min, `reverse-sync.ts` polls Close for ColdCraft-tagged leads updated since last watermark:
- Qualified → tag "crm-qualified" in Instantly
- Bad Fit → delete from Instantly campaign
- Do Not Contact → block email globally in Instantly
- Nurture → move to nurture campaign
- Meeting Booked → tag "meeting-booked"
- Customer → tag "customer-won"

### 7. Revenue Attribution (daily)
1. Query Close for opportunities closed in last 24h (won + lost)
2. Match opportunity contact email to `pipeline_leads`
3. Trace back to `raw_signals` for signal source
4. Record in `revenue_attribution` with deal value, touch count, days-to-close
5. Feed revenue-weighted boost into `signal-optimizer.ts` — winning signal types get scored higher

### 8. A/B Experiment Routing (in pipeline processor)
1. Before Instantly push, check for active experiment matching signal_type
2. If found, round-robin assign to variant campaign (least-used)
3. Record assignment in `ab_experiment_leads`
4. Push to variant campaign instead of default
5. Results tracked via reply rates + revenue per variant

---

## Email Verification Pipeline (6 Layers)

| Layer | Name | What It Does |
|-------|------|-------------|
| 0 | Historical Signal | Check email_outcomes for prior bounces/deliveries (short-circuits) |
| 1 | Syntax | RFC 5322 validation, length checks, typo detection, role-based flagging |
| 2 | DNS | MX records, SPF, DMARC, disposable domain, parked domain detection |
| 3 | SMTP | Reacher VPS handshake (25s timeout) — mailbox existence, disabled, full inbox |
| 3.5 | External | MillionVerifier + FindyMail for catch-all/unknown emails |
| 4 | Catch-All | Detect catch-all domains (90% confidence from SMTP) |
| 5 | Risk Score | Aggregate all signals → 0-100 score → verdict (valid/invalid/risky/unknown) |

**Verdicts:** valid, invalid, risky, unknown
**Risk levels:** low (>=80), medium (60-79), high (30-59), critical (<30)
**Recommendations:** safe_to_send, send_with_caution, do_not_send, manual_review

---

## Email Finder (3-Level Waterfall)

1. **FindyMail API** — fastest path if available
2. **Pattern cache** — `domain_patterns` table with Bayesian confidence (>=60% to use)
3. **SMTP permutation loop** — 10 most common B2B patterns (first.last, firstlast, flast, etc.) verified via Reacher

---

## Reply Categorization (7 Sub-Categories)

| Category | Sub-Categories | Auto-Send Eligible |
|----------|---------------|-------------------|
| Interested | meeting_ready, has_questions, warm_referral | Yes (meeting_ready, warm_referral) |
| Soft No | timing_issue, has_solution, budget_concern, not_decision_maker, generic_brush_off | Yes (timing_issue, generic_brush_off) |
| Hard No | unsubscribe, hostile, legal_threat, company_policy | No (auto-tag + delete) |
| Custom | auto_reply, out_of_office, other | No |

Each sub-category has a playbook in `src/lib/ai/playbooks.ts` with: framework name, strategy, rules, structure, and few-shot examples.

---

## Signal Types & Default Scores

| Signal Type | Default Score | Source |
|------------|--------------|--------|
| funding | 100 | Google News via Apify, Crunchbase activity, Twitter/X |
| leadership_change | 90 | Google News via Apify |
| competitor_review | 85 | G2 scraping |
| intent | 80 | Technographic detection |
| job_change | 75 | LinkedIn monitoring |
| job_posting | 70 | LinkedIn Jobs via Apify, Twitter/X |
| tech_stack | 65 | Job posting analysis |
| news | 50 | Google News, Product Hunt launches, Crunchbase growth, Twitter/X growth |

Scores are dynamically adjusted by the V7 self-learning layer based on actual conversion rates.

---

## External Services

| Service | Purpose | Env Var(s) |
|---------|---------|-----------|
| Supabase | Primary database (Postgres + pgvector) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Claude (Anthropic) | Classification, drafting, research synthesis, learning | `ANTHROPIC_API_KEY` |
| OpenAI | Embeddings for knowledge base vector search | `OPENAI_API_KEY` |
| Perplexity | Real-time lead research (sonar-pro) | `PERPLEXITY_API_KEY` |
| Instantly.ai | Email campaigns, tagging, threading, lead management | `INSTANTLY_API_KEY`, `INSTANTLY_API_KEY_2` |
| Reacher VPS | Self-hosted SMTP verification | `REACHER_API_URL`, `REACHER_API_KEY` |
| MillionVerifier | Bulk email verification (catch-all resolution) | `MILLIONVERIFIER_API_KEY` |
| FindyMail | Email finding + premium verification | `FINDYMAIL_API_KEY` |
| Apify | Web scraping actors (Google Search, LinkedIn Jobs, Cheerio) | `APIFY_API_KEY` |
| HeyReach | LinkedIn connection requests + DMs | `HEYREACH_API_KEY`, `HEYREACH_LINKEDIN_ACCOUNT_ID` |
| Vapi | AI voice calls with transcript + outcome | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID` |
| Close CRM | CRM pipeline, leads, opportunities, notes | `CLOSE_CRM_API_KEY` |
| Calendly | Meeting booking webhooks | `CALENDLY_SIGNING_SECRET`, `CALENDLY_LINK` |
| Slack | Notifications (hot leads, auto-sends, legal threats) | `SLACK_WEBHOOK_URL` |

---

## All Environment Variables

```bash
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=

# AI / LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=

# Email Platform (dual keys for round-robin)
INSTANTLY_API_KEY=
INSTANTLY_API_KEY_2=

# Campaign Routing (per signal type)
CAMPAIGN_ID_FUNDING=
CAMPAIGN_ID_JOB_POSTING=
CAMPAIGN_ID_LEADERSHIP=
CAMPAIGN_ID_NEWS=
CAMPAIGN_ID_DEFAULT=

# Email Finding & Verification
FINDYMAIL_API_KEY=
MILLIONVERIFIER_API_KEY=
REACHER_API_URL=https://verify.coldcrafthq.com
REACHER_API_KEY=

# Signal Scraping
APIFY_API_KEY=

# ICP Configuration
ICP_TARGET_TITLES=CEO,Founder,VP Sales,VP of Sales,Head of Sales,CRO,VP Marketing,CMO,Head of Growth
ICP_EXCLUDE_INDUSTRIES=government,non-profit,education
ICP_GEOGRAPHIES=US,United States,UK,Canada,Australia
ICP_MIN_FUNDING_M=0.5
ICP_MAX_FUNDING_M=100
MIN_SIGNAL_SCORE=55

# TAM Discovery
ICP_DISCOVERY_KEYWORDS=B2B lead generation,cold email agency,outbound sales
COMPETITOR_G2_URLS=
COMPETITOR_TOOLS=Apollo,Seamless,Reply.io,Outreach,Salesloft

# LinkedIn Automation
HEYREACH_API_KEY=
HEYREACH_LINKEDIN_ACCOUNT_ID=

# Voice Calls
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=

# CRM
CLOSE_CRM_API_KEY=
CAMPAIGN_ID_NURTURE=              # Nurture campaign for reverse sync (Close → Instantly)

# Meeting Booking
CALENDLY_LINK=
CALENDLY_SIGNING_SECRET=

# Notifications
SLACK_WEBHOOK_URL=

# Security
WEBHOOK_SECRET=
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://coldcrafthq.com
```

---

## Architecture Patterns

1. **Fire-and-forget safety** — CRM sync, watchlist adds, conversation routing are non-blocking. Pipeline never stalls on optional side-effects.

2. **Waterfall with early termination** — Contact finder (3 levels), email finder (3 levels), and verification (6 layers) all terminate early when a definitive result is found.

3. **Dual caching** — Memory cache (per request lifecycle for bulk operations) + Supabase persistent cache (24h DNS TTL, 6h catch-all TTL). Prevents redundant DNS/SMTP lookups.

4. **Bayesian confidence** — Domain email patterns use Bayesian updating: same pattern confirmed increases confidence, different pattern decreases it. Minimum 60% to use cached pattern.

5. **Self-learning feedback loop** — Outcomes from sent replies flow back into signal weights, ICP scoring, confidence thresholds, and opener patterns. The system gets smarter with every interaction.

6. **Few-shot injection** — AI prompts are enriched with: playbook examples, winning/losing outcome examples, proven opener patterns, training examples (human corrections), and knowledge base entries.

7. **Round-robin API keys** — Instantly uses 2 API keys with round-robin selection to double throughput and mitigate rate limits.

8. **Signal-aware research** — Research prompts change per signal type. Funding signals get different research questions than job posting or leadership change signals.

9. **Pipeline lead state machine** — Pipeline leads progress through: pending → finding_contact → finding_email → verifying → researching → pushed/ready/failed/filtered. Each state tracks what happened and why.

10. **Chain detection** — Follow-up replies are linked to parent sent replies via lead_email matching. This enables outcome scoring: if we sent a reply and the prospect responded positively, that's a win.

11. **Watermark-based polling** — Close CRM has no webhooks, so reverse sync uses watermark polling (last_close_updated_at in close_sync_log). Each poll only processes changes since the watermark, preventing duplicate actions.

12. **Workspace-level health distribution** — email_outcomes lacks from_email, so account health is computed at workspace level and distributed proportionally by each account's daily_limit. Health score: `100 - bounceRate*200 + replyRate*50`.

13. **Cross-system blocklist** — Hard bounces trigger coordinated blocks across Instantly (email block) + Close CRM (Bad Fit status + note + activity log). Single bounce event, multi-system response.

---

## Dashboard Pages (10 tabs)

| Page | Path | Purpose |
|------|------|---------|
| Replies | `/dashboard` | AI reply queue with approve/revise/skip/regenerate/book actions, 15s polling |
| Verify | `/dashboard/verify` | Single + bulk email verification, CSV upload, push to Instantly |
| Pipeline | `/dashboard/pipeline` | Signal ingestion, lead enrichment progress, scraper triggers |
| TAM | `/dashboard/tam` | Total addressable market map with company tiers and scores |
| Heat | `/dashboard/heat` | Account heat scores by buying intent tier |
| Insights | `/dashboard/insights` | Funnel analytics, signal conversion rates, winning ICP patterns, openers |
| Analytics | `/dashboard/analytics` | Unified analytics: pipeline funnel, signal ROI, account health, A/B experiments, revenue wins |
| CRM | `/dashboard/crm` | Live Close CRM pipeline grouped by opportunity stage |
| Knowledge | `/dashboard/knowledge` | CRUD for AI knowledge base entries |
| Settings | `/dashboard/settings` | Webhook URL, env var guide, setup instructions |

---

## Gotchas & Lessons Learned

1. **Vercel env vars** — Always use `printf '%s' "$VALUE" | npx vercel env add NAME production`. Never `echo`, which adds a trailing newline that corrupts API keys.

2. **Supabase row limits** — The project has a low default row limit. Always add explicit `.limit()` to queries that need all rows.

3. **www.coldcrafthq.com** — Always use the www subdomain. The bare domain redirects and strips auth headers from webhook calls.

4. **Reacher VPS (Port 25)** — Netcup VPS at 152.53.240.120. Port 25 ticket was submitted 2026-03-23. Check if it's been approved.

5. **Vercel Pro plan** — Upgraded from Hobby. 8 cron jobs configured, offset minutes to avoid stampede (e.g., :03, :07, :33).

6. **Instantly dual keys** — Uses round-robin between INSTANTLY_API_KEY and INSTANTLY_API_KEY_2 for load balancing and rate limit mitigation.

7. **AI writing style** — Reduce em dashes in AI drafts (AI tell). Cut unnecessary qualifiers like "not just a brush-off", "and that's totally fine" (humans don't hedge). Bake these rules into system prompts.

8. **Supabase client** — Always use the shared lazy-init client from `@/lib/supabase/client`. NEVER use inline `createClient(process.env.SUPABASE_URL!, ...)` — it fails at Next.js build time when env vars aren't available.

9. **Close CRM has no webhooks** — Must use cron polling with watermark-based change detection (close_sync_log table). Polls every 30 min.

10. **email_outcomes columns** — Uses `recorded_at` (NOT `created_at`). Also lacks `from_email`, so per-account health requires workspace-level aggregation distributed by daily_limit proportion.

11. **Dashboard nav format** — Uses `{ href, label, icon }` with inline SVGs in `iconMap` (not lucide-react icons). Add new icons as SVG paths in the iconMap object in layout.tsx.

12. **Pipeline lead fields** — Uses `signal_score` (NOT `icp_score`). The field `icp_score` does not exist.

---

## Current State (as of 2026-03-25)

**Built and operational:**
- Reply Engine V3 (categorization, drafting, auto-send, self-improvement loop)
- Email Verification Pipeline (6 layers, bulk + single)
- Email Finder (FindyMail + pattern cache + SMTP)
- GTM Intelligence Engine (3 signal sources, enrichment pipeline)
- Elite GTM V2 (9 systems: TAM, intent, champions, heat, LinkedIn, social, voice, conversation, orchestrator)
- V7 Self-Learning Layer (signal weights, ICP learning, opener patterns)
- Close CRM Integration (3 lifecycle hooks + Calendly webhook + MCP server)
- V8 Close + Instantly Advancement (8 systems: bi-directional sync, activity timeline, auto-blocklist, auto-opportunity enrichment, revenue attribution, account health, A/B experiments, analytics dashboard)
- Marketing Landing Page (Hero, System, Process, Comparison, Deliverables, FAQ, CTA)

**Pending:**
- Run `migration-v8-advancement.sql` against Supabase (5 new tables required for V8 crons)

**Next to build (V3.5):**
- A/B testing reply frameworks (infrastructure already in place)
- Multi-language reply support

**Future ideas (V4):**
- Lead scoring integration
- Campaign performance feedback loop
- Smart send timing per lead
- Competitive intelligence layer

---

## MCP Servers

Two MCP servers provide Claude Code tool access to external services:

1. **mcp-servers/close-crm.ts** — Full Close CRM API: leads, contacts, opportunities, activities, custom fields, email templates, status management, tasks, sequences, bulk operations
2. **mcp-servers/instantly.ts** — Full Instantly.ai API: campaigns, leads, email threads, sending accounts, labels, custom tags, blocklist, reply sending (with round-robin dual keys)

---

## Close CRM Setup

Two setup scripts configure Close CRM for the ColdCraft pipeline:

**setup-close-crm.ts** (basic):
- 9 lead statuses: Cold Outreach, Replied, Interested, Meeting Booked, Nurture, Won, Not Interested, Bad Fit, Unsubscribed
- 5 opportunity stages: Discovery Call, Proposal Sent, Negotiation, Closed Won, Closed Lost
- 5 custom fields: Signal Type, Signal Summary, Instantly Campaign, ColdCraft Source, Email Found Via

**setup-close-advanced.ts** (operator layer):
- "ColdCraft Outbound" pipeline with 10 stages
- 6 additional custom fields (ICP Score, Reply Classification, Sequence Step, etc.)
- 8 email templates for every funnel moment
- 3 automated follow-up sequences
- 8 smart view definitions (to set up manually in Close UI)

---

## Dependencies

**Runtime:**
- `@anthropic-ai/sdk` ^0.39.0 — Claude API
- `@supabase/supabase-js` ^2.49.0 — Database
- `@vercel/analytics` ^2.0.1 — Web analytics
- `@vercel/speed-insights` ^2.0.0 — Performance monitoring
- `claude-flow` ^3.5.42 — Multi-agent orchestration
- `framer-motion` ^12.34.0 — Landing page animations
- `lucide-react` ^0.577.0 — Icons
- `mailchecker` ^6.0.20 — Email format validation
- `next` 14.2.35 — Framework
- `openai` ^4.80.0 — Embeddings
- `papaparse` ^5.5.3 — CSV parsing
- `react` ^18 + `react-dom` ^18

**Dev:**
- `@modelcontextprotocol/sdk` ^1.27.1 — MCP server support
- `tsx` ^4.21.0 — TypeScript script execution
- TypeScript 5, ESLint, PostCSS, Tailwind
