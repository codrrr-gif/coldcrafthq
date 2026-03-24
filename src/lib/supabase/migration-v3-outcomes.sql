-- ============================================
-- V3 Migration: Self-Improvement Loop
-- ============================================
-- Adds outcome tracking, reply chain linking,
-- and threshold auto-tuning tables.
--
-- Run in Supabase SQL Editor.

-- Link follow-up replies to the sent reply they're responding to
ALTER TABLE replies ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES replies(id);

-- Outcome tracking on sent replies
ALTER TABLE replies ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS outcome_evaluated_at TIMESTAMPTZ;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS outcome_reply_id UUID REFERENCES replies(id);

-- Curated winning/losing examples for prompt injection
CREATE TABLE IF NOT EXISTS outcome_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  sub_category TEXT NOT NULL,
  framework_used TEXT,
  prospect_message TEXT NOT NULL,
  our_reply TEXT NOT NULL,
  outcome TEXT NOT NULL,
  outcome_detail TEXT,
  is_winner BOOLEAN NOT NULL,
  lesson TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threshold adjustment log
CREATE TABLE IF NOT EXISTS threshold_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_category TEXT NOT NULL,
  old_threshold FLOAT NOT NULL,
  new_threshold FLOAT NOT NULL,
  sample_size INT NOT NULL,
  win_rate FLOAT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_replies_parent ON replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_outcome ON replies(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_replies_lead_sent ON replies(lead_email, created_at DESC) WHERE status = 'sent';
CREATE INDEX IF NOT EXISTS idx_outcome_examples_sub ON outcome_examples(sub_category, is_winner);
