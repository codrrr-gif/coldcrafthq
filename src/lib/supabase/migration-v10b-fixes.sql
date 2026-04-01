-- ============================================
-- V10b: Fix missing columns and data integrity
-- ============================================

-- 1. Add message_hash column for reply idempotency
ALTER TABLE replies ADD COLUMN IF NOT EXISTS message_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_replies_message_hash ON replies(message_hash);

-- 2. Update stale apify_actor_id values for documentation accuracy
-- (Ingest route uses hardcoded actors, but keeping DB accurate)
UPDATE signal_sources SET apify_actor_id = 'curious_coder/linkedin-jobs-scraper' WHERE name = 'linkedin_jobs_sales';
UPDATE signal_sources SET apify_actor_id = 'maximedupre/product-hunt-scraper' WHERE name = 'product_hunt_launches';
UPDATE signal_sources SET apify_actor_id = 'apidojo/tweet-scraper' WHERE name = 'twitter_signals';
UPDATE signal_sources SET apify_actor_id = 'pratikdani/crunchbase-companies-scraper' WHERE name = 'crunchbase_activity';
