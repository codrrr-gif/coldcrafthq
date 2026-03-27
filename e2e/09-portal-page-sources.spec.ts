import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// These tests validate the source code of portal pages
// to catch structural issues without needing an auth session

test.describe('Portal Page Source — Dashboard', () => {
  const file = 'src/app/portal/(authenticated)/dashboard/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('is a client component', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("'use client'");
  });

  test('fetches from /api/portal/dashboard', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/dashboard');
  });

  test('has loading skeleton state', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/animate-pulse|loading/i);
  });

  test('has error state', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/failed|error/i);
  });

  test('displays all expected metrics', () => {
    const content = fs.readFileSync(file, 'utf-8');
    const expectedMetrics = [
      'Meetings Booked',
      'Reply Rate',
      'Leads Contacted',
      'Cost Per Meeting',
      'Campaign Health',
      'AI Confidence',
      'Pipeline Value',
    ];
    for (const metric of expectedMetrics) {
      expect(content, `Missing metric: ${metric}`).toContain(metric);
    }
  });
});

test.describe('Portal Page Source — Onboarding', () => {
  const file = 'src/app/portal/(authenticated)/onboarding/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/onboarding', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/onboarding');
  });

  test('has form for submitting steps', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/form|onSubmit|handleSubmit/i);
  });

  test('has progress indicator', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/progress|completed|step/i);
  });
});

test.describe('Portal Page Source — Activity', () => {
  const file = 'src/app/portal/(authenticated)/activity/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/activity', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/activity');
  });

  test('has type filter', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/filter|type/i);
  });
});

test.describe('Portal Page Source — Requests', () => {
  const file = 'src/app/portal/(authenticated)/requests/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/requests', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/requests');
  });

  test('has POST for creating requests', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/method:\s*'POST'/);
  });

  test('has request type selector', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/pause_campaign|update_icp|change_offer|general_question/);
  });
});

test.describe('Portal Page Source — Meetings', () => {
  const file = 'src/app/portal/(authenticated)/meetings/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/meetings', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/meetings');
  });

  test('displays prospect info', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/prospect_name|prospect_company|prospect_email/);
  });
});

test.describe('Portal Page Source — Knowledge', () => {
  const file = 'src/app/portal/(authenticated)/knowledge/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/knowledge', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/knowledge');
  });

  test('supports CRUD operations', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/POST/);
    expect(content).toMatch(/PUT/);
    expect(content).toMatch(/DELETE/);
  });
});

test.describe('Portal Page Source — Billing', () => {
  const file = 'src/app/portal/(authenticated)/billing/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/billing', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/billing');
  });

  test('displays invoice information', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/invoice|amount|status/i);
  });

  test('has Stripe portal link', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/portal_url|stripe|Manage/i);
  });
});

test.describe('Portal Page Source — Reports', () => {
  const file = 'src/app/portal/(authenticated)/reports/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/reports', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/reports');
  });

  test('displays report metrics', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/metrics|meetings_booked|reply_rate/);
  });
});

test.describe('Portal Page Source — Settings', () => {
  const file = 'src/app/portal/(authenticated)/settings/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/portal/settings', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/portal/settings');
  });

  test('has branding controls', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/primary_color|logo|portal_name|branding/i);
  });

  test('has team member display', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/team|member|role/i);
  });
});
