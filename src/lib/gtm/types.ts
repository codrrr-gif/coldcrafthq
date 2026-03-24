// src/lib/gtm/types.ts

export type SignalType =
  | 'funding'
  | 'job_posting'
  | 'leadership_change'
  | 'news'
  | 'intent'
  | 'tech_stack'
  | 'competitor_review'
  | 'job_change';

export type PipelineStatus =
  | 'pending'
  | 'finding_contact'
  | 'finding_email'
  | 'verifying'
  | 'researching'
  | 'ready'
  | 'pushed'
  | 'failed'
  | 'filtered';

export type EmailFoundVia = 'pattern_cache' | 'smtp_permutation' | 'external';

export interface DomainPattern {
  domain: string;
  pattern: string;
  confidence: number;
  sample_count: number;
  last_verified_at: string | null;
  updated_at: string;
}

export interface SignalSource {
  id: string;
  name: string;
  apify_actor_id: string;
  search_queries: string[];
  enabled: boolean;
  run_frequency: string;
  last_run_at: string | null;
  last_run_id: string | null;
  last_signal_count: number;
  created_at: string;
}

export interface RawSignal {
  id: string;
  source_name: string;
  signal_type: SignalType;
  company_name: string | null;
  company_domain: string | null;
  headline: string | null;
  signal_url: string | null;
  signal_date: string | null;
  score: number;
  raw_data: Record<string, unknown>;
  processed: boolean;
  filtered_reason: string | null;
  created_at: string;
}

export interface PipelineLead {
  id: string;
  signal_id: string | null;
  company_name: string | null;
  company_domain: string;
  company_size: string | null;
  company_industry: string | null;
  company_location: string | null;
  company_funding_stage: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_verified: boolean;
  email_verdict: string | null;
  email_score: number | null;
  email_found_via: EmailFoundVia | null;
  signal_type: SignalType | null;
  signal_summary: string | null;
  signal_date: string | null;
  signal_score: number | null;
  research_summary: string | null;
  pain_points: string[] | null;
  opportunity_signals: string[] | null;
  personalized_opener: string | null;
  research_data: Record<string, unknown> | null;
  instantly_campaign_id: string | null;
  status: PipelineStatus;
  failure_reason: string | null;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

// For the email finder
export interface FinderResult {
  email: string | null;
  found: boolean;
  pattern: string | null;
  found_via: EmailFoundVia | null;
  verdict: string | null;
  score: number | null;
  tried_patterns: string[];
}

// For the research agent
export interface ResearchResult {
  company_overview: string;
  pain_signals: string[];
  opportunity_signals: string[];
  personalized_opener: string;
  research_summary: string;
  contact_profile: string;
  raw_research: Record<string, string>;
}

// For signal processing
export interface ParsedSignal {
  signal_type: SignalType;
  company_name: string;
  company_domain: string | null;
  headline: string;
  signal_url: string;
  signal_date: string; // ISO date string YYYY-MM-DD
  raw_data: Record<string, unknown>;
}

// ── V6 Elite GTM types ────────────────────────────────────────────────────────

export interface Company {
  id: string;
  domain: string;
  name: string | null;
  industry: string | null;
  headcount_range: string | null;
  revenue_range: string | null;
  tech_stack: string[] | null;
  funding_stage: string | null;
  location: string | null;
  tier: 1 | 2 | 3;
  tam_score: number;
  status: 'discovered' | 'contacted' | 'replied' | 'meeting' | 'won' | 'lost' | 'paused';
  last_signal_at: string | null;
  last_contacted_at: string | null;
  source: string | null;
  created_at: string;
}

export interface HeatScore {
  company_id: string;
  score: number;
  tier: 1 | 2 | 3;
  signals_7d: number;
  signals_30d: number;
  last_signal_type: string | null;
  last_signal_at: string | null;
  last_calculated_at: string;
}

export interface Touchpoint {
  id: string;
  company_id: string | null;
  lead_id: string | null;
  channel: 'email' | 'linkedin' | 'voice';
  touch_type: 'email_sent' | 'linkedin_connect' | 'linkedin_dm' | 'voice_call' | 'voice_voicemail';
  status: 'sent' | 'delivered' | 'opened' | 'replied' | 'failed' | 'bounced';
  external_id: string | null;
  content: string | null;
  sent_at: string;
  replied_at: string | null;
}

export interface Conversation {
  id: string;
  lead_id: string | null;
  channel: 'email' | 'linkedin' | 'voice';
  inbound_text: string;
  classification: 'interested' | 'not_now' | 'wrong_person' | 'question' | 'unsubscribe' | 'auto_reply' | 'other' | null;
  drafted_reply: string | null;
  action_taken: string | null;
  created_at: string;
}

export interface ChampionEntry {
  id: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string | null;
  linkedin_url: string | null;
  last_known_company: string | null;
  last_known_domain: string | null;
  last_known_title: string | null;
  new_company_detected: string | null;
  new_company_domain: string | null;
  change_detected_at: string | null;
  sequence_triggered: boolean;
}

export interface HeyReachContact {
  firstName: string;
  lastName: string;
  linkedInUrl: string;
  customVariables?: Record<string, string>;
}

export interface VoiceCall {
  id: string;
  lead_id: string | null;
  company_id: string | null;
  vapi_call_id: string | null;
  phone_number: string | null;
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'no_answer' | 'voicemail' | 'failed';
  duration_s: number | null;
  transcript: string | null;
  outcome: 'interested' | 'not_interested' | 'voicemail' | 'wrong_number' | 'callback_requested' | 'meeting_booked' | 'no_answer' | null;
  called_at: string;
  ended_at: string | null;
}

// ── V7 Self-learning types ────────────────────────────────────────────────────

export interface LearningWeight {
  id: string;
  weight_type: 'signal' | 'icp_industry' | 'icp_headcount' | 'icp_funding';
  dimension_value: string;
  learned_score: number;
  sample_count: number;
  leads_pushed: number;
  leads_replied: number;
  leads_interested: number;
  conversion_rate: number;
  last_updated_at: string;
}

export interface OpenerPattern {
  id: string;
  signal_type: string;
  pattern_summary: string;
  example_opener: string;
  lead_id: string | null;
  signal_score: number | null;
  industry: string | null;
  company_size: string | null;
  times_used: number;
  created_at: string;
}

export interface FunnelMetrics {
  overall: {
    signals_total: number;
    pushed: number;
    replied: number;
    interested: number;
    meeting: number;
    won: number;
    push_rate: number;
    reply_rate: number;
    interest_rate: number;
    meeting_rate: number;
  };
  by_signal_type: Array<{
    signal_type: string;
    pushed: number;
    interested: number;
    conversion_rate: number;
    learned_score: number | null;
    default_score: number;
  }>;
  top_industries: Array<{ industry: string; meeting_count: number; win_rate: number }>;
  top_headcount: Array<{ range: string; meeting_count: number; win_rate: number }>;
  top_funding: Array<{ stage: string; meeting_count: number; win_rate: number }>;
  sample_openers: OpenerPattern[];
  last_optimized_at: string | null;
}

// Apify types
export interface ApifyRunResult {
  id: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
  defaultDatasetId: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface ApifyDatasetItem {
  url?: string;
  title?: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}
