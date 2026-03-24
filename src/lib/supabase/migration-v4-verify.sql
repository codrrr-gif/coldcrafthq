-- ============================================
-- V4 Migration: Email Verification Tables
-- ============================================
-- Run in Supabase SQL Editor

-- Verification jobs (bulk uploads)
CREATE TABLE IF NOT EXISTS verification_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_emails INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  valid INTEGER NOT NULL DEFAULT 0,
  invalid INTEGER NOT NULL DEFAULT 0,
  risky INTEGER NOT NULL DEFAULT 0,
  unknown INTEGER NOT NULL DEFAULT 0,
  source_filename TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual verification results
CREATE TABLE IF NOT EXISTS verification_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES verification_jobs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('valid', 'invalid', 'risky', 'unknown')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  score INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  recommendation TEXT CHECK (recommendation IN ('safe_to_send', 'send_with_caution', 'do_not_send', 'manual_review')),

  -- Layer results (JSONB for flexibility)
  syntax_result JSONB,
  dns_result JSONB,
  smtp_result JSONB,
  catch_all_result JSONB,
  risk_analysis JSONB,
  ai_analysis JSONB,

  suggested_correction TEXT,
  verification_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain cache (avoids redundant DNS/SMTP lookups)
CREATE TABLE IF NOT EXISTS domain_cache (
  domain TEXT PRIMARY KEY,
  has_mx BOOLEAN NOT NULL DEFAULT false,
  mx_records TEXT[] DEFAULT '{}',
  is_catch_all BOOLEAN,
  is_disposable BOOLEAN NOT NULL DEFAULT false,
  provider TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  ttl_hours INTEGER DEFAULT 24
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_results_job_id ON verification_results(job_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_verdict ON verification_results(verdict);
CREATE INDEX IF NOT EXISTS idx_verification_results_email ON verification_results(email);
CREATE INDEX IF NOT EXISTS idx_verification_jobs_status ON verification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_domain_cache_checked_at ON domain_cache(checked_at);

-- Updated_at trigger for verification_jobs
CREATE OR REPLACE FUNCTION update_verification_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verification_jobs_updated_at ON verification_jobs;
CREATE TRIGGER trigger_verification_jobs_updated_at
  BEFORE UPDATE ON verification_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_jobs_updated_at();
