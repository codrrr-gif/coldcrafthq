-- migration-v5-gtm.sql
-- ============================================
-- GTM Intelligence Engine Tables
-- ============================================

-- Ensure updated_at trigger function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Email finder: cache the winning pattern per domain
CREATE TABLE IF NOT EXISTS domain_patterns (
  domain TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  -- Patterns: 'first.last' | 'firstlast' | 'flast' | 'f.last' | 'first' | 'last.first' | 'lastfirst' | 'first_last'
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  sample_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal source configuration (seeded below)
CREATE TABLE IF NOT EXISTS signal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  apify_actor_id TEXT NOT NULL,
  search_queries TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  run_frequency TEXT DEFAULT 'daily',
  last_run_at TIMESTAMPTZ,
  last_run_id TEXT,
  last_signal_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw signals before enrichment
CREATE TABLE IF NOT EXISTS raw_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('funding', 'job_posting', 'leadership_change', 'news')),
  company_name TEXT,
  company_domain TEXT,
  headline TEXT,
  signal_url TEXT,
  signal_date DATE,
  score INTEGER DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  raw_data JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  filtered_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_signals_processed ON raw_signals(processed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_signals_company ON raw_signals(company_domain, signal_type);
-- Deduplication: same company + same signal type + same date = skip
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_signals_dedup
  ON raw_signals(company_domain, signal_type, signal_date)
  WHERE company_domain IS NOT NULL;

-- Enriched pipeline leads
CREATE TABLE IF NOT EXISTS pipeline_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES raw_signals(id) ON DELETE SET NULL,

  -- Company
  company_name TEXT,
  company_domain TEXT NOT NULL,
  company_size TEXT,
  company_industry TEXT,
  company_location TEXT,
  company_funding_stage TEXT,

  -- Contact
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  linkedin_url TEXT,

  -- Email
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verdict TEXT,
  email_score INTEGER,
  email_found_via TEXT, -- 'pattern_cache' | 'smtp_permutation' | 'external'

  -- Signal context
  signal_type TEXT,
  signal_summary TEXT,
  signal_date DATE,
  signal_score INTEGER,

  -- AI Research
  research_summary TEXT,
  pain_points TEXT[],
  opportunity_signals TEXT[],
  personalized_opener TEXT,
  research_data JSONB,

  -- Campaign
  instantly_campaign_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'finding_contact', 'finding_email',
    'verifying', 'researching', 'ready', 'pushed', 'failed', 'filtered'
  )),
  failure_reason TEXT,
  pushed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_domain ON pipeline_leads(company_domain);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_email ON pipeline_leads(email) WHERE email IS NOT NULL;

-- Trigger: updated_at on pipeline_leads
CREATE OR REPLACE TRIGGER set_pipeline_leads_updated_at
  BEFORE UPDATE ON pipeline_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed signal sources
INSERT INTO signal_sources (name, apify_actor_id, search_queries) VALUES
(
  'google_news_funding',
  'apify/google-search-scraper',
  ARRAY[
    'startup raised million series funding 2025 SaaS B2B',
    'company closes seed series A B funding round 2025',
    '"raised" "million" "funding" site:techcrunch.com 2025',
    '"series A" OR "series B" "raised" SaaS software 2025'
  ]
),
(
  'linkedin_jobs_sales',
  'bebity/linkedin-jobs-scraper',
  ARRAY[
    'Head of Sales',
    'VP of Sales',
    'VP Sales',
    'Director of Sales',
    'Revenue Operations',
    'Sales Development Representative',
    'Head of Growth',
    'Growth Marketing Manager',
    'Chief Revenue Officer'
  ]
),
(
  'google_news_leadership',
  'apify/google-search-scraper',
  ARRAY[
    'appoints hires VP Sales Chief Revenue Officer 2025 startup',
    '"new VP" OR "new head of" sales marketing growth 2025 SaaS',
    '"joins as" VP Director Head sales marketing revenue 2025'
  ]
)
ON CONFLICT (name) DO NOTHING;
