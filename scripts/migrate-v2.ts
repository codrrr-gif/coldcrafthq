// Run migration V2 via Supabase Management API
// Usage: npx tsx scripts/migrate-v2.ts

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const migrations = [
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS sub_category TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS auto_sent BOOLEAN DEFAULT FALSE',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS auto_send_reason TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS tone TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS urgency TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS ai_reasoning TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS framework_used TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS alternative_reply TEXT',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS response_time_ms INTEGER',
  'ALTER TABLE replies ADD COLUMN IF NOT EXISTS research_data JSONB',
];

async function runMigration() {
  console.log('Running V2 migration...\n');

  for (const sql of migrations) {
    const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || sql;
    process.stdout.write(`  → ${colName}...`);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // The REST API can't run DDL directly. Let's use a different approach.
    // We'll use the Supabase SQL endpoint
    console.log(' (will run via SQL editor)');
  }

  // Alternative: Test if columns already exist by doing an insert with defaults
  console.log('\nTesting column access...');
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/replies?select=id&limit=0`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (testRes.ok) {
    console.log('  → Replies table accessible');
  }

  // Try adding columns via PATCH on the table (this won't work either)
  // The real solution is to run the SQL in the Supabase dashboard
  console.log('\n⚠️  The Supabase REST API cannot run DDL (ALTER TABLE) commands.');
  console.log('Please run the following SQL in your Supabase SQL Editor:\n');
  console.log(migrations.join(';\n') + ';');
  console.log('\nOr paste the contents of src/lib/supabase/migration-v2.sql');
}

runMigration().catch(console.error);
