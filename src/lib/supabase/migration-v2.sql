-- ============================================
-- ColdCraft Reply Engine V2 — Migration
-- ============================================
-- Run this AFTER the initial schema.sql

-- Add new columns to replies table
ALTER TABLE replies ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS auto_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS auto_send_reason TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS framework_used TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS alternative_reply TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS research_data JSONB;

-- Index for auto-send cron queries
CREATE INDEX IF NOT EXISTS idx_replies_auto_send
  ON replies(status, confidence, created_at)
  WHERE status = 'pending' AND auto_sent = FALSE;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_replies_sub_category ON replies(sub_category);
