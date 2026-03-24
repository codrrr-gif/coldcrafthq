// ============================================
// ColdCraft Reply Engine — Type Definitions V2
// ============================================

import type { SubCategory } from './ai/playbooks';

export type ReplyCategory = 'interested' | 'soft_no' | 'hard_no' | 'custom';

export type ReplyStatus = 'pending' | 'approved' | 'sent' | 'skipped' | 'failed';

export type ReplyOutcome = 'reply_positive' | 'reply_negative' | 'reply_neutral' | 'silence' | 'meeting_booked' | null;

export interface Reply {
  id: string;
  instantly_lead_id: string | null;
  instantly_campaign_id: string | null;
  lead_email: string;
  lead_name: string | null;
  lead_company: string | null;
  category: ReplyCategory;
  sub_category: SubCategory | null;
  original_message: string;
  thread_history: ThreadMessage[];
  ai_reply: string | null;
  revised_reply: string | null;
  final_reply: string | null;
  alternative_reply: string | null;
  status: ReplyStatus;
  confidence: number;
  auto_sent: boolean;
  auto_send_reason: string | null;
  tone: string | null;
  urgency: string | null;
  ai_reasoning: string | null;
  framework_used: string | null;
  research: string | null;
  research_data: {
    company_overview: string;
    pain_signals: string;
    opportunity_signals: string;
    connection_points: string;
  } | null;
  knowledge_used: string | null;
  send_result: Record<string, unknown> | null;
  response_time_ms: number | null;
  parent_reply_id: string | null;
  outcome: ReplyOutcome;
  outcome_evaluated_at: string | null;
  outcome_reply_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadMessage {
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: 'faq' | 'offer' | 'objection_handling' | 'company_info' | 'voice' | 'general';
  created_at: string;
  updated_at: string;
}

export interface TrainingExample {
  id: string;
  reply_id: string;
  original_ai_reply: string;
  revised_reply: string;
  reasoning: string | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  skipped: number;
  failed: number;
  auto_sent: number;
  avg_confidence: number;
  avg_response_time_ms: number;
  by_category: {
    interested: number;
    soft_no: number;
    hard_no: number;
    custom: number;
  };
  by_sub_category: Record<string, number>;
  outcomes: {
    reply_positive: number;
    reply_negative: number;
    silence: number;
    meeting_booked: number;
    pending_evaluation: number;
    win_rate: number;
  };
}
