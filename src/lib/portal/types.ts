// ============================================
// Client Portal — Type Definitions
// ============================================

export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  portal_name: string | null;
  favicon_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_retainer: number;
  billing_email: string;
  status: 'onboarding' | 'active' | 'paused' | 'churned';
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientUser {
  id: string;
  client_id: string;
  email: string;
  name: string;
  password_hash: string | null;
  role: 'owner' | 'member' | 'viewer';
  last_login_at: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  client_id: string;
  prospect_name: string;
  prospect_company: string;
  prospect_email: string;
  scheduled_at: string;
  source_campaign: string | null;
  source_signal: string | null;
  calendly_event_id: string | null;
  close_opportunity_id: string | null;
  status: 'upcoming' | 'completed' | 'no_show' | 'converted';
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  stripe_invoice_id: string;
  amount: number;
  status: 'draft' | 'open' | 'paid' | 'overdue' | 'void';
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  client_id: string;
  type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  metrics: ReportMetrics;
  email_sent_at: string | null;
  email_status: string | null;
  created_at: string;
}

export interface ReportMetrics {
  leads_contacted: number;
  reply_rate: number;
  meetings_booked: number;
  pipeline_value: number;
  cost_per_meeting: number;
  campaign_health: number;
  ai_confidence_avg: number;
  prev_meetings_booked?: number;
  prev_reply_rate?: number;
}

export interface ActivityEntry {
  id: string;
  client_id: string;
  type: ActivityType;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ActivityType =
  | 'campaign_launched'
  | 'leads_pushed'
  | 'reply_received'
  | 'meeting_booked'
  | 'report_generated'
  | 'health_alert'
  | 'onboarding_step'
  | 'request_update'
  | 'system';

export interface ClientRequest {
  id: string;
  client_id: string;
  submitted_by: string | null;
  type: RequestType;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RequestType =
  | 'pause_campaign'
  | 'resume_campaign'
  | 'update_icp'
  | 'change_offer'
  | 'general_question'
  | 'other';

export interface PortalSession {
  userId: string;
  email: string;
  clientId: string;
  clientName: string;
  role: 'owner' | 'member' | 'viewer';
}
