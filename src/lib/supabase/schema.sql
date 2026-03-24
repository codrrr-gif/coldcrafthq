-- ============================================
-- ColdCraft Reply Engine — Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database.
-- Requires the pgvector extension (enabled by default in Supabase).

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Replies Table — All incoming replies tracked here
-- ============================================
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instantly_lead_id TEXT,
  instantly_campaign_id TEXT,
  lead_email TEXT NOT NULL,
  lead_name TEXT,
  lead_company TEXT,
  category TEXT NOT NULL CHECK (category IN ('interested', 'soft_no', 'hard_no', 'custom')),
  original_message TEXT NOT NULL,
  thread_history JSONB DEFAULT '[]'::jsonb,
  ai_reply TEXT,
  revised_reply TEXT,
  final_reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'skipped', 'failed')),
  research TEXT,
  knowledge_used TEXT,
  send_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_replies_status ON replies(status);
CREATE INDEX idx_replies_category ON replies(category);
CREATE INDEX idx_replies_created_at ON replies(created_at DESC);
CREATE INDEX idx_replies_lead_email ON replies(lead_email);

-- ============================================
-- Knowledge Base — Your offer, FAQs, voice
-- ============================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('faq', 'offer', 'objection_handling', 'company_info', 'voice', 'general')),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX idx_knowledge_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- Training Examples — Learn from human edits
-- ============================================
CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  original_ai_reply TEXT NOT NULL,
  revised_reply TEXT NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_reply_id ON training_examples(reply_id);

-- ============================================
-- Vector Search Function
-- ============================================
-- This function enables semantic search over the knowledge base.
-- Called by the AI draft-reply module to find relevant knowledge.

CREATE OR REPLACE FUNCTION match_knowledge(
  query_text TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding VECTOR(1536);
BEGIN
  -- Note: In production, you'd generate the embedding via the API
  -- and pass it directly. This is a fallback for text search.
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1.0::FLOAT as similarity
  FROM knowledge_base kb
  WHERE kb.content ILIKE '%' || query_text || '%'
     OR kb.title ILIKE '%' || query_text || '%'
  LIMIT match_count;
END;
$$;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- For production, enable RLS and create policies.
-- Since this is a server-side app using service_role key,
-- RLS is bypassed. But if you ever add client-side access:

-- ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Updated_at Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER replies_updated_at
  BEFORE UPDATE ON replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
