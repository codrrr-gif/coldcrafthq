// src/lib/gtm/types.ts

export type SignalType = 'funding' | 'job_posting' | 'leadership_change' | 'news';

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
