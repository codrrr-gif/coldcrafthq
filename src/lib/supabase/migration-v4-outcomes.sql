-- ============================================
-- V4 Migration: Email Outcomes (Historical Bounce Data)
-- ============================================
-- Captures every send outcome over time to build our own
-- bounce database. The longer this runs, the more accurate
-- our verifier becomes — especially on catch-all domains.

CREATE TABLE IF NOT EXISTS email_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- What happened
  outcome TEXT NOT NULL CHECK (outcome IN (
    'hard_bounce',   -- permanent — mailbox doesn't exist
    'soft_bounce',   -- temporary — full inbox, server down, etc.
    'replied',       -- strongest valid signal possible
    'delivered'      -- delivered but no reply (weaker signal)
  )),

  -- Context
  source TEXT NOT NULL DEFAULT 'instantly',
  campaign_id TEXT,
  bounce_message TEXT,   -- raw SMTP bounce message if available
  bounce_code TEXT,      -- SMTP code: 550, 551, etc.

  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast email lookups (the hot path in verification)
CREATE INDEX IF NOT EXISTS idx_email_outcomes_email
  ON email_outcomes(email);

-- Domain-level stats (for catch-all resolution)
CREATE INDEX IF NOT EXISTS idx_email_outcomes_domain_outcome
  ON email_outcomes(domain, outcome);

-- Time-based pruning / recency queries
CREATE INDEX IF NOT EXISTS idx_email_outcomes_recorded_at
  ON email_outcomes(recorded_at DESC);
