import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('API Source — Admin Clients', () => {
  const file = 'src/app/api/admin/clients/route.ts';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('has GET handler for listing', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export async function GET');
  });

  test('has POST handler for creating', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('export async function POST');
  });

  test('validates required fields', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/name.*billing_email.*monthly_retainer/s);
    expect(content).toContain('400');
  });

  test('generates slug from name', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/slug.*toLowerCase|toLowerCase.*slug/s);
  });

  test('creates Stripe customer in try-catch', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('stripe.customers.create');
    expect(content).toContain('try');
    expect(content).toContain('catch');
  });

  test('creates subscription with monthly interval', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("interval: 'month'");
    expect(content).toContain('stripe.subscriptions.create');
  });

  test('inserts client_users with owner role', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("role: 'owner'");
    expect(content).toContain("from('client_users')");
  });

  test('sends Slack notification fire-and-forget', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('notifySlack');
    expect(content).toMatch(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/);
  });
});

test.describe('API Source — Admin Requests', () => {
  test('list route joins clients table', () => {
    const content = fs.readFileSync('src/app/api/admin/requests/route.ts', 'utf-8');
    expect(content).toContain("clients(name)");
    expect(content).toContain('.limit(200)');
  });

  test('update route sets resolved_at on resolve', () => {
    const content = fs.readFileSync('src/app/api/admin/requests/[id]/route.ts', 'utf-8');
    expect(content).toContain("'resolved'");
    expect(content).toContain('resolved_at');
  });

  test('update route inserts activity', () => {
    const content = fs.readFileSync('src/app/api/admin/requests/[id]/route.ts', 'utf-8');
    expect(content).toContain('insertActivity');
  });
});

test.describe('API Source — Invitation', () => {
  test('invite API generates JWT with 7d expiry', () => {
    const content = fs.readFileSync('src/app/api/admin/clients/invite/route.ts', 'utf-8');
    expect(content).toContain("expiresIn: '7d'");
    expect(content).toContain('sign(');
  });

  test('invite API returns URL', () => {
    const content = fs.readFileSync('src/app/api/admin/clients/invite/route.ts', 'utf-8');
    expect(content).toContain('invite_url');
    expect(content).toContain('/invite?token=');
  });

  test('accept API verifies JWT and hashes password', () => {
    const content = fs.readFileSync('src/app/api/portal/invite/accept/route.ts', 'utf-8');
    expect(content).toContain('verify(token');
    expect(content).toContain('hash(password');
  });

  test('accept API sets accepted_at', () => {
    const content = fs.readFileSync('src/app/api/portal/invite/accept/route.ts', 'utf-8');
    expect(content).toContain('accepted_at');
  });

  test('accept API inserts activity and notifies Slack', () => {
    const content = fs.readFileSync('src/app/api/portal/invite/accept/route.ts', 'utf-8');
    expect(content).toContain('insertActivity');
    expect(content).toContain('notifySlack');
  });
});

test.describe('API Source — Cron Jobs', () => {
  test('weekly report uses requireSecret', () => {
    const content = fs.readFileSync('src/app/api/cron/weekly-report/route.ts', 'utf-8');
    expect(content).toContain('requireSecret');
    expect(content).toContain("force-dynamic");
    expect(content).toContain('maxDuration');
  });

  test('weekly report gathers metrics for active clients', () => {
    const content = fs.readFileSync('src/app/api/cron/weekly-report/route.ts', 'utf-8');
    expect(content).toContain('gatherMetrics');
    expect(content).toContain("'active'");
    expect(content).toContain("'weekly'");
  });

  test('monthly report uses correct period', () => {
    const content = fs.readFileSync('src/app/api/cron/monthly-report/route.ts', 'utf-8');
    expect(content).toContain('gatherMetrics');
    expect(content).toContain("'monthly'");
    expect(content).toContain('getMonth() - 1');
  });

  test('churn detection checks 4 risk factors', () => {
    const content = fs.readFileSync('src/app/api/cron/churn-detection/route.ts', 'utf-8');
    // No login in 14 days
    expect(content).toContain('last_login_at');
    // No meetings
    expect(content).toContain("from('meetings')");
    // Overdue invoices
    expect(content).toContain("'overdue'");
    // Pause requests
    expect(content).toContain("'pause_campaign'");
  });

  test('churn detection sends Slack warning', () => {
    const content = fs.readFileSync('src/app/api/cron/churn-detection/route.ts', 'utf-8');
    expect(content).toContain("'warning'");
    expect(content).toContain('Churn risk');
  });
});

test.describe('API Source — Report Metrics Helper', () => {
  test('gatherMetrics queries 4 tables in parallel', () => {
    const content = fs.readFileSync('src/lib/portal/report-metrics.ts', 'utf-8');
    expect(content).toContain('Promise.all');
    expect(content).toContain("from('replies')");
    expect(content).toContain("from('meetings')");
    expect(content).toContain("from('account_health_snapshots')");
    expect(content).toContain("from('clients')");
  });

  test('calculates all ReportMetrics fields', () => {
    const content = fs.readFileSync('src/lib/portal/report-metrics.ts', 'utf-8');
    expect(content).toContain('leads_contacted');
    expect(content).toContain('reply_rate');
    expect(content).toContain('meetings_booked');
    expect(content).toContain('cost_per_meeting');
    expect(content).toContain('campaign_health');
    expect(content).toContain('ai_confidence_avg');
  });
});

test.describe('Webhook Wiring — Activity Feed', () => {
  test('Instantly webhook imports and calls insertActivity', () => {
    const content = fs.readFileSync('src/app/api/webhooks/instantly/route.ts', 'utf-8');
    expect(content).toContain("from '@/lib/portal/activity'");
    expect(content).toContain('insertActivity');
    expect(content).toContain("'reply_received'");
  });

  test('Calendly webhook inserts meeting record', () => {
    const content = fs.readFileSync('src/app/api/webhooks/calendly/route.ts', 'utf-8');
    expect(content).toContain("from('meetings').insert");
    expect(content).toContain("'meeting_booked'");
  });

  test('Calendly webhook selects client_id from pipeline_leads', () => {
    const content = fs.readFileSync('src/app/api/webhooks/calendly/route.ts', 'utf-8');
    expect(content).toContain('client_id');
    expect(content).toMatch(/select\(['"].*client_id/);
  });
});
