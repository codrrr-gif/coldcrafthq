-- scripts/migration-v7-learning.sql
-- ============================================================
-- V7: Self-Learning Layer — Signal Weights + Opener Patterns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Learning weights (signal scores + ICP dimension scores)
--    weight_type: 'signal' | 'icp_industry' | 'icp_headcount' | 'icp_funding'
--    dimension_value: e.g. 'funding', 'saas', '11-50', 'series_a'
CREATE TABLE IF NOT EXISTS learning_weights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_type      TEXT NOT NULL CHECK (weight_type IN (
                     'signal', 'icp_industry', 'icp_headcount', 'icp_funding')),
  dimension_value  TEXT NOT NULL,
  learned_score    INT  NOT NULL CHECK (learned_score BETWEEN 10 AND 200),
  sample_count     INT  NOT NULL DEFAULT 0,
  leads_pushed     INT  NOT NULL DEFAULT 0,
  leads_replied    INT  NOT NULL DEFAULT 0,
  leads_interested INT  NOT NULL DEFAULT 0,
  conversion_rate  NUMERIC(5,4)  DEFAULT 0,
  last_updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(weight_type, dimension_value)
);

-- 2. Opener patterns (winning opener examples extracted by Claude)
CREATE TABLE IF NOT EXISTS opener_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type     TEXT NOT NULL,
  pattern_summary TEXT NOT NULL,
  example_opener  TEXT NOT NULL,
  lead_id         UUID REFERENCES pipeline_leads(id),
  signal_score    INT,
  industry        TEXT,
  company_size    TEXT,
  times_used      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_weights_type
  ON learning_weights(weight_type, dimension_value);

CREATE INDEX IF NOT EXISTS idx_learning_weights_updated
  ON learning_weights(last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_opener_patterns_signal
  ON opener_patterns(signal_type);

CREATE INDEX IF NOT EXISTS idx_opener_patterns_industry
  ON opener_patterns(signal_type, industry);
