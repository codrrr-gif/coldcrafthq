// ============================================
// Email Verification — Type Definitions
// ============================================

// --- Verdict & Risk ---

export type VerificationVerdict = 'valid' | 'invalid' | 'risky' | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type InvalidReason =
  | 'syntax_error'
  | 'no_mx_records'
  | 'domain_not_found'
  | 'smtp_rejected'
  | 'mailbox_not_found'
  | 'disposable_domain'
  | 'blocked_domain'
  | 'typo_detected'
  | 'known_hard_bounce';

export type RiskyReason =
  | 'catch_all'
  | 'role_based'
  | 'free_provider'
  | 'low_score'
  | 'greylisted'
  | 'smtp_timeout'
  | 'accept_all_unverifiable'
  | 'full_inbox'
  | 'new_domain'
  | 'known_soft_bounce';

export type SendRecommendation =
  | 'safe_to_send'
  | 'send_with_caution'
  | 'do_not_send'
  | 'manual_review';

// --- Layer Results ---

export interface SyntaxResult {
  valid: boolean;
  local_part: string;
  domain: string;
  has_typo: boolean;
  suggested_domain: string | null;
  is_role_based: boolean;
  is_free_provider: boolean;
  errors: string[];
}

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface DnsResult {
  has_mx: boolean;
  mx_records: MxRecord[];
  has_spf: boolean;
  has_dmarc: boolean;
  provider: string | null;
  is_disposable: boolean;
  is_parked: boolean;
  accepts_mail: boolean;
}

export interface SmtpResult {
  connectable: boolean;
  mailbox_exists: boolean;
  is_catch_all: boolean;
  is_disabled: boolean;
  has_full_inbox: boolean;
  smtp_code: number | null;
  smtp_message: string | null;
  greylisted: boolean;
  timeout: boolean;
}

export interface CatchAllResult {
  is_catch_all: boolean;
  confidence: number;
  method: 'smtp_probe' | 'reacher' | 'pattern_match';
}

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RiskAnalysis {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  is_role_based: boolean;
  is_disposable: boolean;
  is_free_provider: boolean;
  is_catch_all: boolean;
  has_valid_mx: boolean;
  recommendation: SendRecommendation;
}

export interface AiAnalysis {
  confidence: number;
  reasoning: string;
  recommendation: SendRecommendation;
  flags: string[];
}

// --- Full Verification Result ---

export interface VerificationResult {
  email: string;
  verdict: VerificationVerdict;
  risk: RiskLevel;
  score: number;
  reason: InvalidReason | RiskyReason | null;

  syntax: SyntaxResult;
  dns: DnsResult | null;
  smtp: SmtpResult | null;
  catch_all: CatchAllResult | null;
  risk_analysis: RiskAnalysis;
  ai_analysis: AiAnalysis | null;

  suggested_correction: string | null;

  verified_at: string;
  verification_time_ms: number;
}

// --- Reacher API Types ---

export interface ReacherRequest {
  to_email: string;
  from_email?: string;
  hello_name?: string;
}

export interface ReacherResponse {
  input: string;
  is_reachable: 'safe' | 'invalid' | 'risky' | 'unknown';
  misc: {
    is_disposable: boolean;
    is_role_account: boolean;
    gravatar_url: string | null;
  };
  mx: {
    accepts_mail: boolean;
    records: string[];
  };
  smtp: {
    can_connect_smtp: boolean;
    has_full_inbox: boolean;
    is_catch_all: boolean;
    is_deliverable: boolean;
    is_disabled: boolean;
  };
  syntax: {
    address: string | null;
    domain: string;
    is_valid_syntax: boolean;
    username: string;
  };
}

// --- Bulk Verification ---

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VerificationJob {
  id: string;
  status: JobStatus;
  total_emails: number;
  processed: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

// --- Domain Cache ---

export interface DomainCacheEntry {
  domain: string;
  has_mx: boolean;
  mx_records: string[];
  is_catch_all: boolean | null;
  is_disposable: boolean;
  provider: string | null;
  checked_at: string;
  ttl_hours: number;
}

// --- Pipeline Config ---

export interface PipelineConfig {
  skip_smtp: boolean;
  skip_ai: boolean;
  reacher_url: string | null;
  timeout_ms: number;
  batch_size: number;
  concurrency: number;
  // External verification (Layer 3.5) — kicks in for catch-all/unknown only
  use_million_verifier: boolean;
  use_findymail: boolean; // premium — only for high-value catch-alls
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  skip_smtp: false,
  skip_ai: false,
  reacher_url: process.env.REACHER_URL || null,
  timeout_ms: 30000,
  batch_size: 10,
  concurrency: 5,
  use_million_verifier: !!process.env.MILLION_VERIFIER_API_KEY,
  use_findymail: !!process.env.FINDYMAIL_API_KEY,
};
