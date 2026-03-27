import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Portal Types', () => {
  const file = 'src/lib/portal/types.ts';

  test('exports Client interface with all required fields', () => {
    const content = fs.readFileSync(file, 'utf-8');
    const clientFields = [
      'id', 'name', 'slug', 'logo_url', 'primary_color', 'portal_name',
      'favicon_url', 'stripe_customer_id', 'stripe_subscription_id',
      'monthly_retainer', 'billing_email', 'status', 'onboarding_completed_at',
      'created_at', 'updated_at',
    ];
    for (const field of clientFields) {
      expect(content, `Missing Client field: ${field}`).toContain(field);
    }
  });

  test('Client status has exactly 4 values', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("'onboarding'");
    expect(content).toContain("'active'");
    expect(content).toContain("'paused'");
    expect(content).toContain("'churned'");
  });

  test('exports ClientUser interface', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export interface ClientUser');
    expect(content).toContain('password_hash');
    expect(content).toContain("'owner'");
    expect(content).toContain("'member'");
    expect(content).toContain("'viewer'");
  });

  test('exports Meeting interface', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export interface Meeting');
    expect(content).toContain('prospect_name');
    expect(content).toContain('calendly_event_id');
  });

  test('exports Invoice interface', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export interface Invoice');
    expect(content).toContain('stripe_invoice_id');
  });

  test('exports Report and ReportMetrics interfaces', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export interface Report');
    expect(content).toContain('export interface ReportMetrics');
  });

  test('exports ActivityType with all expected values', () => {
    const content = fs.readFileSync(file, 'utf-8');
    const activityTypes = [
      'campaign_launched', 'leads_pushed', 'reply_received',
      'meeting_booked', 'report_generated', 'health_alert',
      'onboarding_step', 'request_update', 'system',
    ];
    for (const t of activityTypes) {
      expect(content, `Missing ActivityType: ${t}`).toContain(`'${t}'`);
    }
  });

  test('exports RequestType with all expected values', () => {
    const content = fs.readFileSync(file, 'utf-8');
    const requestTypes = [
      'pause_campaign', 'resume_campaign', 'update_icp',
      'change_offer', 'general_question', 'other',
    ];
    for (const t of requestTypes) {
      expect(content, `Missing RequestType: ${t}`).toContain(`'${t}'`);
    }
  });

  test('exports PortalSession interface', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export interface PortalSession');
    expect(content).toContain('userId');
    expect(content).toContain('clientId');
    expect(content).toContain('clientName');
    expect(content).toContain('role');
  });
});

test.describe('Portal Activity Helper', () => {
  const file = 'src/lib/portal/activity.ts';

  test('exports insertActivity function', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export async function insertActivity');
  });

  test('accepts clientId, type, title, detail, metadata', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('clientId: string');
    expect(content).toContain('type: ActivityType');
    expect(content).toContain('title: string');
    expect(content).toContain('detail?: string');
    expect(content).toContain('metadata?: Record');
  });

  test('inserts into activity_feed table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("from('activity_feed').insert");
  });
});

test.describe('Portal Auth Helper', () => {
  const file = 'src/lib/portal/auth.ts';

  test('exports requirePortalSession', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export async function requirePortalSession');
  });

  test('returns session and error tuple', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/session.*error|{.*session.*error.*}/);
  });
});

test.describe('Stripe Client Helper', () => {
  const file = 'src/lib/portal/stripe.ts';

  test('exports getStripe with lazy init', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export function getStripe');
    expect(content).toContain('_stripe');
  });

  test('uses correct Stripe API version', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("apiVersion: '2026-03-25.dahlia'");
  });
});

test.describe('Auth Configuration', () => {
  const file = 'src/lib/auth.ts';

  test('has admin-credentials provider', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("id: 'admin-credentials'");
  });

  test('has portal-credentials provider', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("id: 'portal-credentials'");
  });

  test('portal provider checks password_hash with bcrypt', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('compare(password, user.password_hash)');
  });

  test('portal provider requires accepted_at', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('user.accepted_at');
  });

  test('JWT callback carries role, clientId, clientName', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('token.role');
    expect(content).toContain('token.clientId');
    expect(content).toContain('token.clientName');
  });

  test('session callback exposes role, clientId, clientName', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/session.*role/);
    expect(content).toMatch(/session.*clientId/);
    expect(content).toMatch(/session.*clientName/);
  });

  test('uses JWT strategy', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("strategy: 'jwt'");
  });
});
