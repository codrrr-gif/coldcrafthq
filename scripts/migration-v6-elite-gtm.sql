-- scripts/migration-v6-elite-gtm.sql
-- ============================================================
-- V6: Elite GTM System — TAM, Heat Scores, Multi-Channel
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Companies table (TAM foundation)
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT NOT NULL UNIQUE,
  name            TEXT,
  industry        TEXT,
  headcount_range TEXT,     -- '1-10','11-50','51-200','201-500','500+'
  revenue_range   TEXT,     -- '<1M','1-10M','10-50M','50M+'
  tech_stack      TEXT[],
  funding_stage   TEXT,     -- 'seed','series_a','series_b','series_c','growth','unknown'
  location        TEXT,
  tier            INT DEFAULT 2 CHECK (tier IN (1,2,3)),
  tam_score       INT DEFAULT 50 CHECK (tam_score BETWEEN 0 AND 100),
  status          TEXT DEFAULT 'discovered' CHECK (status IN (
                    'discovered','contacted','replied','meeting','won','lost','paused')),
  first_seen_at   TIMESTAMPTZ DEFAULT now(),
  last_signal_at  TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  source          TEXT,     -- 'crunchbase','g2','linkedin','manual','signal_derived'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Link pipeline_leads to companies
ALTER TABLE pipeline_leads
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 2. Touchpoints (multi-channel activity log per contact)
CREATE TABLE IF NOT EXISTS touchpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id),
  lead_id     UUID REFERENCES pipeline_leads(id),
  channel     TEXT NOT NULL CHECK (channel IN ('email','linkedin','voice')),
  touch_type  TEXT NOT NULL CHECK (touch_type IN (
                'email_sent','linkedin_connect','linkedin_dm',
                'voice_call','voice_voicemail')),
  status      TEXT DEFAULT 'sent' CHECK (status IN (
                'sent','delivered','opened','replied','failed','bounced')),
  external_id TEXT,     -- Instantly lead ID, HeyReach message ID, Vapi call ID
  content     TEXT,     -- message body or call transcript summary
  sent_at     TIMESTAMPTZ DEFAULT now(),
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Conversations (inbound reply tracking + AI classification)
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES pipeline_leads(id),
  channel         TEXT NOT NULL CHECK (channel IN ('email','linkedin','voice')),
  inbound_text    TEXT NOT NULL,
  classification  TEXT CHECK (classification IN (
                    'interested','not_now','wrong_person',
                    'question','unsubscribe','auto_reply','other')),
  drafted_reply   TEXT,
  action_taken    TEXT,     -- 'reply_sent','calendly_sent','rerouted','unsubscribed'
  classified_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. Voice calls (Vapi call records)
CREATE TABLE IF NOT EXISTS voice_calls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES pipeline_leads(id),
  company_id   UUID REFERENCES companies(id),
  vapi_call_id TEXT UNIQUE,
  phone_number TEXT,
  status       TEXT DEFAULT 'initiated' CHECK (status IN (
                 'initiated','ringing','in_progress','completed',
                 'no_answer','voicemail','failed')),
  duration_s   INT,
  transcript   TEXT,
  outcome      TEXT CHECK (outcome IN (
                 'interested','not_interested','voicemail','wrong_number',
                 'callback_requested','meeting_booked','no_answer')),
  called_at    TIMESTAMPTZ DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 5. Champion watchlist (contacts to monitor for job changes)
CREATE TABLE IF NOT EXISTS champion_watchlist (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_first_name    TEXT NOT NULL,
  contact_last_name     TEXT NOT NULL,
  contact_email         TEXT,
  linkedin_url          TEXT UNIQUE,
  last_known_company    TEXT,
  last_known_domain     TEXT,
  last_known_title      TEXT,
  new_company_detected  TEXT,
  new_company_domain    TEXT,
  new_title             TEXT,
  change_detected_at    TIMESTAMPTZ,
  last_checked_at       TIMESTAMPTZ,
  sequence_triggered    BOOLEAN DEFAULT false,
  source                TEXT DEFAULT 'pipeline_outcome',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 6. Account heat scores (aggregated per company)
CREATE TABLE IF NOT EXISTS account_heat_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES companies(id) UNIQUE NOT NULL,
  score               INT DEFAULT 0 CHECK (score >= 0),
  tier                INT DEFAULT 3 CHECK (tier IN (1,2,3)),
  signals_7d          INT DEFAULT 0,
  signals_30d         INT DEFAULT 0,
  last_signal_type    TEXT,
  last_signal_at      TIMESTAMPTZ,
  last_calculated_at  TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_domain    ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_tier      ON companies(tier);
CREATE INDEX IF NOT EXISTS idx_companies_status    ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_tam_score ON companies(tam_score DESC);
CREATE INDEX IF NOT EXISTS idx_touchpoints_lead    ON touchpoints(lead_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_company ON touchpoints(company_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_channel ON touchpoints(channel, touch_type);
CREATE INDEX IF NOT EXISTS idx_conversations_lead  ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_class ON conversations(classification);
CREATE INDEX IF NOT EXISTS idx_heat_company        ON account_heat_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_heat_score          ON account_heat_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_champion_linkedin   ON champion_watchlist(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_champion_change     ON champion_watchlist(change_detected_at)
  WHERE change_detected_at IS NOT NULL AND sequence_triggered = false;
CREATE INDEX IF NOT EXISTS idx_voice_calls_lead    ON voice_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_vapi    ON voice_calls(vapi_call_id);
