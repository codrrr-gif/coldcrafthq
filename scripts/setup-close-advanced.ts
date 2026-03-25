// scripts/setup-close-advanced.ts
// ============================================
// Advanced Close CRM setup — the operator layer.
//
// Run: npx tsx scripts/setup-close-advanced.ts
//
// Sets up:
//   1. Dedicated "ColdCraft Outbound" pipeline (clean stages)
//   2. Email templates for every funnel moment
//   3. Post-interested follow-up sequence (3-touch)
//   4. Post-meeting follow-up sequence (2-touch)
//   5. Nurture re-engagement sequence
//   6. Additional custom fields (ICP score, reply classification)
// ============================================

const API_BASE = 'https://api.close.com/api/v1';
const KEY = process.env.CLOSE_CRM_API_KEY;

function headers() {
  if (!KEY) throw new Error('CLOSE_CRM_API_KEY not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers() });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${path} → ${res.status}`);
}

function ok(msg: string)   { console.log(`  ✓ ${msg}`); }
function skip(msg: string) { console.log(`  – ${msg} (already exists)`); }
function info(msg: string) { console.log(`  · ${msg}`); }

// ─────────────────────────────────────────────────────────────────────────────
// 1. PIPELINE — "ColdCraft Outbound"
// ─────────────────────────────────────────────────────────────────────────────

async function setupPipeline() {
  console.log('\n1. Pipeline — ColdCraft Outbound');

  const { data: pipelines } = await get<{ data: Array<{ id: string; name: string }> }>('/pipeline/');
  if (pipelines.find((p) => p.name === 'ColdCraft Outbound')) {
    skip('Pipeline "ColdCraft Outbound"');
    return;
  }

  await post('/pipeline/', {
    name: 'ColdCraft Outbound',
    statuses: [
      // Active stages — the working pipeline
      { label: 'Discovery Call Scheduled', type: 'active' },
      { label: 'Discovery Call Completed', type: 'active' },
      { label: 'Proposal Sent',            type: 'active' },
      { label: 'Negotiation',              type: 'active' },
      { label: 'Contract Sent',            type: 'active' },
      // Terminal stages
      { label: 'Closed Won',               type: 'won'    },
      { label: 'Closed Lost - No Budget',  type: 'lost'   },
      { label: 'Closed Lost - No Need',    type: 'lost'   },
      { label: 'Closed Lost - Timing',     type: 'lost'   },
      { label: 'Ghosted',                  type: 'lost'   },
    ],
  });
  ok('Created pipeline "ColdCraft Outbound" with 10 stages');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CUSTOM FIELDS — additional context fields
// ─────────────────────────────────────────────────────────────────────────────

async function setupCustomFields() {
  console.log('\n2. Custom Fields');

  const { data: existing } = await get<{ data: Array<{ id: string; name: string }> }>('/custom_field/lead/');
  const has = (name: string) => existing.some((f) => f.name.toLowerCase() === name.toLowerCase());

  const fields: Array<{ name: string; type: string; choices?: string[] }> = [
    { name: 'ICP Score',            type: 'number' },
    { name: 'Reply Classification', type: 'choices', choices: ['interested', 'soft_no', 'hard_no', 'custom', 'no_reply'] },
    { name: 'Sequence Step',        type: 'text' },
    { name: 'Last Touchpoint',      type: 'choices', choices: ['email', 'linkedin', 'voice', 'manual'] },
    { name: 'Booked Via',           type: 'choices', choices: ['calendly', 'manual', 'direct_reply'] },
    { name: 'MRR Potential',        type: 'number' },
  ];

  for (const f of fields) {
    if (has(f.name)) { skip(`Custom field "${f.name}"`); continue; }
    const body: Record<string, unknown> = { name: f.name, type: f.type, required: false };
    if (f.choices) body.choices = f.choices;
    await post('/custom_field/lead/', body);
    ok(`Created custom field "${f.name}" (${f.type})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EMAIL TEMPLATES — every funnel moment
// ─────────────────────────────────────────────────────────────────────────────

async function setupEmailTemplates() {
  console.log('\n3. Email Templates');

  const { data: existing } = await get<{ data: Array<{ id: string; name: string }> }>('/email_template/');
  const has = (name: string) => existing.some((t) => t.name === name);

  const templates = [
    {
      name: '[CC] Interested — Acknowledge + Book',
      subject: 'Re: {{lead.name}}',
      body: `Hi {{contact.first_name}},

Thanks for getting back to me — glad this landed at the right time.

I'd love to learn more about what you're working on and see if there's a fit.

Do you have 20 minutes this week for a quick call? Here's my calendar: {{your_calendly_link}}

Talk soon,
{{user.first_name}}`,
    },
    {
      name: '[CC] Interested — Send Case Study',
      subject: 'How we helped [similar company] book 12 meetings in 30 days',
      body: `Hi {{contact.first_name}},

Following up on my last message — wanted to share a quick example of what we've done for a company in a similar position.

[CLIENT] came to us when their outbound had plateaued. Within 30 days of launching their ColdCraft system:
• 847 qualified leads identified via buying signals
• 12 meetings booked with decision-makers
• 3 closed deals totalling $47k ARR

Happy to walk you through exactly how we'd do the same for {{lead.name}}.

Are you free for 20 minutes this week? {{your_calendly_link}}

{{user.first_name}}`,
    },
    {
      name: '[CC] Meeting Booked — Confirmation',
      subject: 'Confirmed: our call on {{meeting_date}}',
      body: `Hi {{contact.first_name}},

Looking forward to our call.

To make the most of our time, could you share:
1. What's your current outbound process?
2. How many meetings are you booking per month right now?
3. What's your ideal customer profile?

No pressure — just helps me come prepared with relevant ideas.

See you then,
{{user.first_name}}`,
    },
    {
      name: '[CC] Post-Meeting — Proposal Follow-up',
      subject: 'Next steps for {{lead.name}}',
      body: `Hi {{contact.first_name}},

Great speaking with you. Here's a quick recap of what we covered:

**Your situation:** [fill in]
**The goal:** [fill in]
**Our recommended approach:** [fill in]

I'll send over a formal proposal by [DATE]. In the meantime, let me know if you have any questions.

{{user.first_name}}`,
    },
    {
      name: '[CC] Post-Meeting — No Response Follow-up',
      subject: 'Re: Next steps for {{lead.name}}',
      body: `Hi {{contact.first_name}},

Just checking in — did you get a chance to review what I sent over?

Happy to jump on a quick call to answer any questions before you make a decision.

{{user.first_name}}`,
    },
    {
      name: '[CC] Nurture — Quarterly Check-in',
      subject: 'Checking in — {{lead.name}}',
      body: `Hi {{contact.first_name}},

Hope things are going well at {{lead.name}}.

We spoke a few months back about your outbound — just wanted to check if anything has changed on your end. We've had some great results recently that might be relevant.

Worth a quick catch-up?

{{user.first_name}}`,
    },
    {
      name: '[CC] Re-engage — Gone Cold',
      subject: 'Still relevant for {{lead.name}}?',
      body: `Hi {{contact.first_name}},

I know timing isn't always right — totally understand.

I'm going to leave the ball in your court. If building a consistent outbound engine ever becomes a priority, feel free to grab time here: {{your_calendly_link}}

Either way, wishing you and the team at {{lead.name}} a strong quarter.

{{user.first_name}}`,
    },
    {
      name: '[CC] Soft No — Future Follow-up',
      subject: 'Re: {{lead.name}}',
      body: `Hi {{contact.first_name}},

Totally get it — sounds like the timing isn't right.

Would it be okay to check back in [TIMEFRAME]? I'd hate to lose touch if things change.

{{user.first_name}}`,
    },
  ];

  for (const t of templates) {
    if (has(t.name)) { skip(`Template "${t.name}"`); continue; }
    await post('/email_template/', { name: t.name, subject: t.subject, body: t.body });
    ok(`Created template "${t.name}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SEQUENCES — automated multi-touch follow-ups
// ─────────────────────────────────────────────────────────────────────────────

async function setupSequences() {
  console.log('\n4. Sequences');

  const { data: existing } = await get<{ data: Array<{ id: string; name: string }> }>('/sequence/');
  const has = (name: string) => existing.some((s) => s.name === name);

  // Fetch the templates we just created so we can reference their IDs
  const { data: templates } = await get<{ data: Array<{ id: string; name: string }> }>('/email_template/');
  const tpl = (name: string) => templates.find((t) => t.name === name)?.id || null;

  // ── Sequence 1: Post-Interested (3 touches) ──────────────────────────────
  const seq1Name = '[CC] Post-Interested Follow-up (3-touch)';
  if (has(seq1Name)) {
    skip(`Sequence "${seq1Name}"`);
  } else {
    const steps = [];

    const ackId = tpl('[CC] Interested — Acknowledge + Book');
    if (ackId) steps.push({ type: 'email', delay: 0,  email_template_id: ackId });

    const csId = tpl('[CC] Interested — Send Case Study');
    if (csId) steps.push({ type: 'email', delay: 3,  email_template_id: csId });

    const reengageId = tpl('[CC] Re-engage — Gone Cold');
    if (reengageId) steps.push({ type: 'email', delay: 7,  email_template_id: reengageId });

    if (steps.length) {
      await post('/sequence/', { name: seq1Name, steps, timezone: 'America/New_York' });
      ok(`Created sequence "${seq1Name}" (${steps.length} steps)`);
    } else {
      info(`Skipped sequence "${seq1Name}" — templates not found yet`);
    }
  }

  // ── Sequence 2: Post-Meeting (2 touches) ─────────────────────────────────
  const seq2Name = '[CC] Post-Meeting Follow-up (2-touch)';
  if (has(seq2Name)) {
    skip(`Sequence "${seq2Name}"`);
  } else {
    const steps = [];

    const proposalId = tpl('[CC] Post-Meeting — Proposal Follow-up');
    if (proposalId) steps.push({ type: 'email', delay: 1,  email_template_id: proposalId });

    const noRespId = tpl('[CC] Post-Meeting — No Response Follow-up');
    if (noRespId) steps.push({ type: 'email', delay: 5,  email_template_id: noRespId });

    if (steps.length) {
      await post('/sequence/', { name: seq2Name, steps, timezone: 'America/New_York' });
      ok(`Created sequence "${seq2Name}" (${steps.length} steps)`);
    } else {
      info(`Skipped sequence "${seq2Name}" — templates not found yet`);
    }
  }

  // ── Sequence 3: Nurture (long-term) ──────────────────────────────────────
  const seq3Name = '[CC] Nurture Re-engagement (quarterly)';
  if (has(seq3Name)) {
    skip(`Sequence "${seq3Name}"`);
  } else {
    const steps = [];

    const nurtureId = tpl('[CC] Nurture — Quarterly Check-in');
    if (nurtureId) {
      steps.push({ type: 'email', delay: 30,  email_template_id: nurtureId });
      steps.push({ type: 'email', delay: 90,  email_template_id: nurtureId });
      steps.push({ type: 'email', delay: 180, email_template_id: nurtureId });
    }

    if (steps.length) {
      await post('/sequence/', { name: seq3Name, steps, timezone: 'America/New_York' });
      ok(`Created sequence "${seq3Name}" (${steps.length} steps: 30d / 90d / 180d)`);
    } else {
      info(`Skipped sequence "${seq3Name}" — templates not found yet`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SMART VIEWS — print setup instructions (API not available for views)
// ─────────────────────────────────────────────────────────────────────────────

function printSmartViewInstructions() {
  console.log('\n5. Smart Views (set these up manually in Close)');
  console.log('   Navigate to: Close CRM → Leads → Save View\n');

  const views = [
    { name: '🔥 Hot — Needs Action',     query: 'status:"Interested" sort:date_updated' },
    { name: '📅 Meeting Booked',          query: 'status:"Meeting Booked" sort:date_updated' },
    { name: '⏰ Stale Interested (5d+)',  query: 'status:"Interested" date_updated < "5 days ago"' },
    { name: '🆕 New This Week',           query: 'status:"Cold Outreach" date_created > "7 days ago"' },
    { name: '📊 Active Pipeline',         query: 'has_opportunity:true opportunity_status_type:"active"' },
    { name: '🏆 Won This Month',          query: 'status:"Won" date_updated > "30 days ago"' },
    { name: '💤 Nurture Queue',           query: 'status:"Nurture" sort:date_updated' },
    { name: '🤝 All ColdCraft Leads',     query: 'tag:"ColdCraft" sort:date_updated' },
  ];

  for (const v of views) {
    console.log(`   ${v.name}`);
    console.log(`   Query: ${v.query}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Advanced Close CRM Setup for ColdCraft\n');

  await setupPipeline();
  await setupCustomFields();
  await setupEmailTemplates();
  await setupSequences();
  printSmartViewInstructions();

  console.log('\n✅ Done. Close CRM is now structured for scale.\n');
  console.log('   Pipeline:   ColdCraft Outbound (10 stages)');
  console.log('   Fields:     6 new custom fields');
  console.log('   Templates:  8 email templates covering every funnel moment');
  console.log('   Sequences:  Post-Interested (3-touch), Post-Meeting (2-touch), Nurture (quarterly)');
  console.log('   Smart Views: See above — set up manually in Close UI\n');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
