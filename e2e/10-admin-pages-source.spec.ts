import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Admin Page Source — Clients List', () => {
  const file = 'src/app/dashboard/clients/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('is a client component', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("'use client'");
  });

  test('fetches from /api/admin/clients', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/admin/clients');
  });

  test('imports Client type from portal types', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("from '@/lib/portal/types'");
    expect(content).toContain('Client');
  });

  test('has status badges for all 4 statuses', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('onboarding');
    expect(content).toContain('active');
    expect(content).toContain('paused');
    expect(content).toContain('churned');
  });

  test('calculates MRR from active clients only', () => {
    const content = fs.readFileSync(file, 'utf-8');
    // Should filter by 'active' before summing
    expect(content).toMatch(/filter.*active.*reduce|filter.*status.*active/s);
  });

  test('has Add Client link', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/dashboard/clients/new');
    expect(content).toContain('Add Client');
  });

  test('displays table with correct columns', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('Client');
    expect(content).toContain('Status');
    expect(content).toContain('Retainer');
    expect(content).toContain('Billing Email');
    expect(content).toContain('Created');
  });
});

test.describe('Admin Page Source — New Client', () => {
  const file = 'src/app/dashboard/clients/new/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('POSTs to /api/admin/clients', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/admin/clients');
    expect(content).toContain("'POST'");
  });

  test('has all 4 form fields', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/Company Name/i);
    expect(content).toMatch(/Billing Email/i);
    expect(content).toMatch(/Monthly Retainer/i);
    expect(content).toMatch(/Admin Email/i);
  });

  test('converts dollars to cents before sending', () => {
    const content = fs.readFileSync(file, 'utf-8');
    // Should multiply by 100 to convert $ to cents
    expect(content).toMatch(/\*\s*100|parseFloat.*100/);
  });

  test('redirects to /dashboard/clients on success', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain("router.push('/dashboard/clients')");
  });

  test('has error handling', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/error|setError/);
  });
});

test.describe('Admin Page Source — Requests', () => {
  const file = 'src/app/dashboard/requests/page.tsx';

  test('file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('fetches from /api/admin/requests', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('/api/admin/requests');
  });

  test('has respond/update functionality', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('PUT');
    expect(content).toMatch(/respond|Respond/);
  });

  test('shows pending count', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/pending/);
  });

  test('has status dropdown with 3 options', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('pending');
    expect(content).toContain('in_progress');
    expect(content).toContain('resolved');
  });

  test('has textarea for admin response', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/textarea/i);
    expect(content).toMatch(/response|Response/);
  });

  test('displays client name per request', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/clients\?\.name/);
  });
});
