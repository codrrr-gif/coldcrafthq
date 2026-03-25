// scripts/setup-close-crm.ts
// ============================================
// One-time Close CRM workspace setup for ColdCraft.
//
// Run: npx tsx scripts/setup-close-crm.ts
//
// Sets up:
//   1. Lead statuses  (outreach funnel stages)
//   2. Opportunity pipeline  (active stages + won/lost)
//   3. Custom fields on Lead  (signal_type, signal_source, campaign)
// ============================================

const API_BASE = 'https://api.close.com/api/v1';

function headers() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set in .env.local');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(`  ${msg}`); }
function ok(msg: string)  { console.log(`  ✓ ${msg}`); }
function skip(msg: string){ console.log(`  – ${msg} (already exists)`); }

async function ensureLeadStatus(
  existing: Array<{ id: string; label: string }>,
  label: string,
  type: 'active' | 'inactive'
) {
  if (existing.find((s) => s.label.toLowerCase() === label.toLowerCase())) {
    skip(`Lead status "${label}"`);
    return;
  }
  await post('/status/lead/', { label, type });
  ok(`Created lead status "${label}"`);
}

async function ensureOppStatus(
  existing: Array<{ id: string; label: string; type: string }>,
  label: string,
  type: 'active' | 'won' | 'lost'
) {
  if (existing.find((s) => s.label.toLowerCase() === label.toLowerCase())) {
    skip(`Opportunity status "${label}"`);
    return;
  }
  await post('/status/opportunity/', { label, type });
  ok(`Created opportunity status "${label}"`);
}

async function ensureCustomField(
  existing: Array<{ id: string; name: string }>,
  name: string,
  type: 'text' | 'date' | 'choices',
  choices?: string[]
) {
  if (existing.find((f) => f.name.toLowerCase() === name.toLowerCase())) {
    skip(`Custom field "${name}"`);
    return;
  }
  const body: Record<string, unknown> = { name, type, required: false };
  if (type === 'choices' && choices) body.choices = choices;
  await post('/custom_field/lead/', body);
  ok(`Created custom field "${name}" (${type})`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧 Setting up Close CRM for ColdCraft\n');

  // ── 1. Lead Statuses ──────────────────────────────────────────────────────
  console.log('1. Lead Statuses');
  const { data: existingLeadStatuses } = await get<{ data: Array<{ id: string; label: string }> }>('/status/lead/');

  // Active (prospect is still in play)
  await ensureLeadStatus(existingLeadStatuses, 'Cold Outreach',   'active');
  await ensureLeadStatus(existingLeadStatuses, 'Replied',         'active');
  await ensureLeadStatus(existingLeadStatuses, 'Interested',      'active');
  await ensureLeadStatus(existingLeadStatuses, 'Meeting Booked',  'active');
  await ensureLeadStatus(existingLeadStatuses, 'Nurture',         'active');

  // Inactive (closed out)
  await ensureLeadStatus(existingLeadStatuses, 'Won',             'inactive');
  await ensureLeadStatus(existingLeadStatuses, 'Not Interested',  'inactive');
  await ensureLeadStatus(existingLeadStatuses, 'Bad Fit',         'inactive');
  await ensureLeadStatus(existingLeadStatuses, 'Unsubscribed',    'inactive');

  // ── 2. Opportunity Pipeline ───────────────────────────────────────────────
  console.log('\n2. Opportunity Pipeline');
  const { data: existingOppStatuses } = await get<{ data: Array<{ id: string; label: string; type: string }> }>('/status/opportunity/');

  // Active stages
  await ensureOppStatus(existingOppStatuses, 'Discovery Call',   'active');
  await ensureOppStatus(existingOppStatuses, 'Proposal Sent',    'active');
  await ensureOppStatus(existingOppStatuses, 'Negotiation',      'active');

  // Won / Lost
  await ensureOppStatus(existingOppStatuses, 'Closed Won',       'won');
  await ensureOppStatus(existingOppStatuses, 'Closed Lost',      'lost');
  await ensureOppStatus(existingOppStatuses, 'No Decision',      'lost');

  // ── 3. Custom Fields on Lead ──────────────────────────────────────────────
  console.log('\n3. Custom Fields');
  const { data: existingFields } = await get<{ data: Array<{ id: string; name: string }> }>('/custom_field/lead/');

  await ensureCustomField(existingFields, 'Signal Type', 'choices', [
    'funding',
    'job_posting',
    'leadership_change',
    'news',
    'intent',
    'tech_stack',
    'competitor_review',
    'job_change',
  ]);
  await ensureCustomField(existingFields, 'Signal Summary', 'text');
  await ensureCustomField(existingFields, 'Instantly Campaign', 'text');
  await ensureCustomField(existingFields, 'ColdCraft Source', 'text');
  await ensureCustomField(existingFields, 'Email Found Via', 'choices', [
    'findymail',
    'smtp_permutation',
    'pattern_cache',
    'manual',
  ]);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Close CRM is ready for ColdCraft.\n');
  console.log('   Lead statuses:    Cold Outreach → Replied → Interested → Meeting Booked → Won');
  console.log('   Opportunity stages: Discovery Call → Proposal Sent → Negotiation → Closed Won/Lost');
  console.log('   Custom fields:    Signal Type, Signal Summary, Instantly Campaign, ColdCraft Source, Email Found Via\n');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
