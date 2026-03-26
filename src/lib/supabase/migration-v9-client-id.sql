-- ============================================
-- V9b: Add client_id to existing tables
-- ============================================

-- Step 1: Add nullable client_id columns
ALTER TABLE replies ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE revenue_attribution ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE account_health_snapshots ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE ab_experiments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Step 2: Create a default client for existing data
INSERT INTO clients (id, name, slug, billing_email, monthly_retainer, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ColdCraft Internal',
  'coldcraft-internal',
  'matt@coldcrafthq.com',
  0,
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Step 3: Backfill all existing rows
UPDATE replies SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;
UPDATE pipeline_leads SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;
UPDATE knowledge_base SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;
UPDATE revenue_attribution SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;
UPDATE account_health_snapshots SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;
UPDATE ab_experiments SET client_id = '00000000-0000-0000-0000-000000000001' WHERE client_id IS NULL;

-- Step 4: Make NOT NULL (run after backfill confirmed)
ALTER TABLE replies ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE pipeline_leads ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE knowledge_base ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE revenue_attribution ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE account_health_snapshots ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE ab_experiments ALTER COLUMN client_id SET NOT NULL;

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_replies_client_id ON replies(client_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_client_id ON pipeline_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_client_id ON knowledge_base(client_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_client_id ON revenue_attribution(client_id);
CREATE INDEX IF NOT EXISTS idx_account_health_client_id ON account_health_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_client_id ON ab_experiments(client_id);
