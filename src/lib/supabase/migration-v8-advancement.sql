-- migration-v8-advancement.sql
-- Close CRM + Instantly AI Advancement Systems
-- Run: psql or Supabase SQL Editor

-- Close sync tracking
CREATE TABLE IF NOT EXISTS close_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  close_lead_id TEXT NOT NULL UNIQUE,
  lead_email TEXT,
  campaign_id TEXT,
  last_status TEXT NOT NULL,
  last_close_updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue attribution
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id TEXT NOT NULL UNIQUE,
  close_lead_id TEXT,
  pipeline_lead_id UUID REFERENCES pipeline_leads(id),
  signal_id UUID REFERENCES raw_signals(id),
  signal_type TEXT,
  campaign_id TEXT,
  deal_value NUMERIC,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  loss_reason TEXT,
  touches_count INTEGER DEFAULT 0,
  days_to_close INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_revenue_signal ON revenue_attribution(signal_type);
CREATE INDEX idx_revenue_outcome ON revenue_attribution(outcome);
CREATE INDEX idx_revenue_campaign ON revenue_attribution(campaign_id);

-- Account health snapshots (rates as decimals: 0.05 = 5%)
CREATE TABLE IF NOT EXISTS account_health_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_email TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sends INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  bounce_rate NUMERIC(7,6) DEFAULT 0,
  reply_rate NUMERIC(7,6) DEFAULT 0,
  health_score INTEGER DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  flagged BOOLEAN DEFAULT FALSE,
  UNIQUE(account_email, snapshot_date)
);
CREATE INDEX idx_health_date ON account_health_snapshots(snapshot_date);
CREATE INDEX idx_health_flagged ON account_health_snapshots(flagged) WHERE flagged = TRUE;

-- A/B experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  signal_type TEXT,
  base_campaign_id TEXT NOT NULL,
  variant_campaign_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  winner_campaign_id TEXT,
  total_leads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_ab_status ON ab_experiments(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS ab_experiment_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID REFERENCES ab_experiments(id),
  lead_email TEXT NOT NULL,
  variant_index INTEGER NOT NULL,
  campaign_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, lead_email)
);
CREATE INDEX idx_ab_leads_experiment ON ab_experiment_leads(experiment_id);
