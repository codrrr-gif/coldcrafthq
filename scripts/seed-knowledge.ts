// ============================================
// Seed Knowledge Base — Run once after Supabase setup
// Usage: npx tsx scripts/seed-knowledge.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface KnowledgeEntry {
  title: string;
  content: string;
  category: string;
}

const knowledgeEntries: KnowledgeEntry[] = [
  // === OFFER DETAILS ===
  {
    title: 'Core Offer — What ColdCraft HQ Does',
    content: `ColdCraft HQ builds and runs complete cold outreach systems that put qualified B2B meetings on your calendar — every week, on autopilot.

We handle everything end-to-end:
- Email infrastructure (60+ domains, 120+ mailboxes, built from scratch)
- ICP research & TAM mapping (10+ data sources, triple-verified emails, <2% bounce rate)
- Campaign copywriting (specialist-written, A/B tested per ICP — no templates, no AI slop)
- Multi-channel sequencing (email + LinkedIn, coordinated follow-ups)
- Reply management & meeting booking (we handle replies, you show up to meetings)
- Analytics & reporting (full dashboard, weekly reports, bi-weekly strategy calls)

Timeline: Live in 3 weeks. Meetings in 4.
Deal size: We work with B2B companies selling $3K+ offers with a clear ICP.
Industries: SaaS, agencies, professional services, consulting, tech-enabled businesses.`,
    category: 'offer',
  },
  {
    title: 'Infrastructure Details',
    content: `ColdCraft builds dedicated sending infrastructure from scratch for each client:
- 60+ domains purchased and authenticated
- 120+ mailboxes configured
- Custom DNS configuration with dedicated IPs
- 98.2% inbox placement rate
- 9.4/10 warmup score
- Clean blacklist status, passing DNS/DMARC
- Client owns everything — all infrastructure is purchased in their name or transferred to them
- If we part ways, client keeps all domains, mailboxes, and sending accounts

This is NOT shared infrastructure. Most agencies use shared sending pools. We build dedicated infrastructure from scratch. The difference shows up in deliverability and reply rates.`,
    category: 'offer',
  },
  {
    title: 'Data & Targeting Details',
    content: `Our data pipeline:
- Map total addressable market using 10+ data sources (not just LinkedIn/Apollo)
- Data enriched from 12+ providers
- Triple-verified emails
- Sub-2% bounce rate guaranteed
- Intent signal matching: job changes, funding events, tech stack shifts, hiring surges

Typical results:
- 4,271 total leads found
- 3,847 email verified
- 3,812 with bounce risk <2%
- 891 with intent signal match

Compare this to typical agency: single database pull from Apollo, 8-15% bounce rate.`,
    category: 'offer',
  },
  {
    title: 'Pricing & Engagement Model',
    content: `ColdCraft HQ pricing:
- Predictable monthly retainer (discuss on strategy call)
- No long-term lock-in contracts
- Client owns all infrastructure

Compare to alternatives:
- DIY/In-House: SDR salary $5-8K/mo + tools $2-3K/mo = $7-11K/mo
- Typical Agency: $3-5K/mo + lock-in contract

What's included in the retainer:
- Dedicated Slack channel
- Weekly performance reports
- Bi-weekly strategy calls
- All infrastructure, data, copy, sending, and reply management
- Client just shows up to booked meetings

We're deliberately small — only taking 3 new clients per month. Every engagement gets senior-level attention, not a junior account manager reading from a script.`,
    category: 'offer',
  },
  {
    title: 'Process — How It Works',
    content: `Step 1: Strategy Call (Day 1)
- Deep dive into your offer, ICP, competitive landscape
- Review what you've tried before
- Scope the build if there's a fit

Step 2: Infrastructure Build (Week 1-2)
- Purchase domains, configure DNS, set up mailboxes
- Begin warmup process (2 weeks minimum — no shortcuts without destroying deliverability)

Step 3: Targeting & Copy (Week 2-3)
- Map your TAM
- Enrich and verify contacts
- Write personalized sequences
- Prepare campaign logic

Step 4: Launch & Optimize (Week 3+)
- Campaigns go live
- Manage replies
- A/B test relentlessly
- Push qualified meetings to your calendar`,
    category: 'offer',
  },

  // === FAQs ===
  {
    title: 'FAQ — Timeline to First Meetings',
    content: `Q: How long before I start getting meetings?
A: Infrastructure takes 2 weeks to warm up properly — there are no shortcuts here without destroying deliverability. Campaigns launch in week 3. Most clients see their first booked meetings in weeks 3-4, with consistent volume building through month 2.`,
    category: 'faq',
  },
  {
    title: 'FAQ — Day-to-Day Engagement',
    content: `Q: What does the engagement look like day-to-day?
A: We handle everything — infrastructure, data, copy, sending, reply management. You'll get a dedicated Slack channel, weekly performance reports, and bi-weekly strategy calls. When a prospect says "yes," the meeting appears on your calendar. You just show up.`,
    category: 'faq',
  },
  {
    title: 'FAQ — Industries We Work With',
    content: `Q: What industries do you work with?
A: B2B companies with an offer that sells for $3K+ and a clear ICP. That usually means SaaS, agencies, professional services, consulting, and tech-enabled businesses. If you sell to other businesses and your deal size justifies outbound, we should talk.`,
    category: 'faq',
  },
  {
    title: 'FAQ — Infrastructure Ownership',
    content: `Q: Do I own the infrastructure you build?
A: Yes. Every domain, mailbox, and sending account is purchased in your name or transferred to you. If we part ways, you keep everything. This is a key differentiator — most agencies use shared infrastructure that you never own.`,
    category: 'faq',
  },
  {
    title: 'FAQ — What Makes Us Different',
    content: `Q: What makes you different from other agencies?
A: Most agencies use shared sending infrastructure, one data source (usually Apollo), and template copy. We build dedicated infrastructure from scratch, enrich data from 10+ providers with triple verification, and write custom copy per ICP. The difference shows up in deliverability and reply rates. We also don't lock you into long-term contracts.`,
    category: 'faq',
  },
  {
    title: 'FAQ — What If It Doesn\'t Work',
    content: `Q: What if it doesn't work?
A: We'll know within 3-4 weeks whether the campaigns are gaining traction. If we're not seeing positive signals by week 6, we'll have an honest conversation about what's not working and whether it makes sense to continue. We don't lock you into long-term contracts. You keep all the infrastructure regardless.`,
    category: 'faq',
  },

  // === OBJECTION HANDLING ===
  {
    title: 'Objection — "I\'ve been burned by agencies before"',
    content: `We hear this a lot. Most agencies promise 30 meetings a month and deliver excuses. You end up paying $3K/month for a weekly report that says "we're testing."

Here's how we're different:
- You own all infrastructure (domains, mailboxes, accounts) — it's in your name
- No long-term lock-in contracts
- Weekly performance reports with real data, not vanity metrics
- Bi-weekly strategy calls so you always know what's happening
- If it's not working by week 6, we have an honest conversation

We're deliberately small (3 new clients/month) so every engagement gets senior-level attention, not a junior account manager reading from a script.`,
    category: 'objection_handling',
  },
  {
    title: 'Objection — "Cold email doesn\'t work"',
    content: `Cold email absolutely works — when done right. The problem isn't cold email. The problem is how it's being done.

Most outbound fails because it's treated like a volume game — blast 10,000 generic emails and pray. We treat it like engineering. The infrastructure, the data, the targeting, the copy — each layer is a system. Build them right and outbound becomes the most predictable revenue channel you have. Build them wrong and you're just paying to burn your domain.

Our approach: dedicated infrastructure (not shared pools), 10+ data sources (not just Apollo), triple-verified emails (<2% bounce), and specialist-written copy (not templates or ChatGPT).`,
    category: 'objection_handling',
  },
  {
    title: 'Objection — "It\'s too expensive"',
    content: `Let's compare the real cost:

DIY/In-House:
- SDR salary: $5-8K/month
- Tools (Apollo, Instantly, etc.): $2-3K/month
- Total: $7-11K/month — plus 3-6 months before results (if ever)
- Plus your time managing them

Typical Agency:
- $3-5K/month + lock-in contract
- Shared infrastructure, single data source, template copy
- 6-8 weeks to results

ColdCraft HQ:
- Predictable retainer (less than an SDR)
- Dedicated infrastructure YOU own
- 10+ data sources, specialist copy
- 3-4 weeks to first meetings
- No lock-in

The question isn't whether you can afford it — it's whether you can afford NOT to have a predictable pipeline.`,
    category: 'objection_handling',
  },
  {
    title: 'Objection — "We want to do it in-house"',
    content: `Totally valid. Some companies should do outbound in-house long-term. But consider:

Building it yourself means:
- Figuring out domain/mailbox setup (or destroying deliverability)
- Finding and learning 10+ data tools
- Writing copy that doesn't sound like every other cold email
- Managing warmup, rotation, and deliverability monitoring
- Timeline: 3-6 months to get it working (if ever)

Many of our clients plan to eventually bring it in-house. We build the system, prove it works, and hand over the playbook. You keep all the infrastructure we built. Think of us as the engineering team that builds the machine — then you can hire operators to run it.`,
    category: 'objection_handling',
  },
  {
    title: 'Objection — "Not the right time / bad timing"',
    content: `Totally understand. A few things to consider:

- Infrastructure takes 2 weeks to warm up. If you wait until you "need" pipeline, you're already 3-4 weeks behind.
- We only take 3 new clients per month. Slots fill up.
- There's no lock-in — you can pause or stop anytime.

Would it make sense to at least do the strategy call so you have a plan ready when timing is right? It's free, 30 minutes, no commitment. Worst case you walk away with a better understanding of what a proper outbound system looks like.`,
    category: 'objection_handling',
  },

  // === BRAND VOICE ===
  {
    title: 'Brand Voice Guidelines',
    content: `ColdCraft HQ voice and tone:

BE:
- Direct and honest — no sales fluff, no hype
- Engineering/systems-focused — use terms like "infrastructure," "system," "pipeline," "layer"
- Confident but not arrogant — let results speak
- Practical and results-oriented — specific numbers, not vague promises
- Empathetic about past bad experiences — acknowledge without judgment
- Transparent about what we do and don't do

DON'T:
- Never use excessive exclamation marks
- Never sound desperate or pushy
- Never use generic sales language ("revolutionary," "game-changing," "synergy")
- Never promise specific meeting numbers without context
- Never badmouth competitors directly — just state facts about our approach
- Never use long-winded explanations when a direct answer works

TONE EXAMPLES:
- Good: "Infrastructure takes 2 weeks to warm up. There are no shortcuts without destroying deliverability."
- Bad: "We'll get you set up ASAP with our amazing warmup technology!"
- Good: "Most agencies use shared sending pools. We build dedicated infrastructure."
- Bad: "Unlike our competitors who use inferior shared infrastructure..."

Keep replies SHORT. 2-5 sentences max for email replies. Busy executives don't read walls of text.
Match the prospect's formality level.
Use their first name naturally.
End with a clear, specific next step.`,
    category: 'voice',
  },

  // === COMPANY INFO ===
  {
    title: 'Company Overview',
    content: `ColdCraft HQ
Website: coldcrafthq.com
Email: hello@coldcrafthq.com

What we do: Build and manage complete cold outreach infrastructure for B2B companies. Dedicated domains, verified data, specialist copywriting. Meetings on your calendar in 3 weeks.

Size: Deliberately small. Senior-level attention on every engagement.
Capacity: 3 new clients per month.
Contract: No long-term lock-in. Predictable monthly retainer.

Ideal client: B2B company with $3K+ offer, clear ICP, ready to invest in a proper outbound system.`,
    category: 'company_info',
  },
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function seed() {
  console.log(`Seeding ${knowledgeEntries.length} knowledge base entries...\n`);

  for (const entry of knowledgeEntries) {
    process.stdout.write(`  → ${entry.title}...`);

    try {
      const embedding = await generateEmbedding(`${entry.title}\n${entry.content}`);

      const { error } = await supabase.from('knowledge_base').insert({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        embedding,
      });

      if (error) {
        console.log(` FAILED: ${error.message}`);
      } else {
        console.log(' OK');
      }
    } catch (err) {
      console.log(` ERROR: ${err}`);
    }
  }

  console.log('\nDone! Knowledge base seeded.');
}

seed().catch(console.error);
