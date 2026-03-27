import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('vercel.json — Cron Configuration', () => {
  test('vercel.json exists and is valid JSON', () => {
    const content = fs.readFileSync('vercel.json', 'utf-8');
    const config = JSON.parse(content);
    expect(config).toBeTruthy();
    expect(config.framework).toBe('nextjs');
  });

  test('has weekly report cron (Monday 9am ET)', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const cron = config.crons.find((c: { path: string }) => c.path === '/api/cron/weekly-report');
    expect(cron, 'Missing weekly-report cron').toBeTruthy();
    expect(cron.schedule).toBe('0 13 * * 1'); // 13 UTC = 9am ET
  });

  test('has monthly report cron (1st of month)', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const cron = config.crons.find((c: { path: string }) => c.path === '/api/cron/monthly-report');
    expect(cron, 'Missing monthly-report cron').toBeTruthy();
    expect(cron.schedule).toBe('0 13 1 * *');
  });

  test('has churn detection cron (daily)', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const cron = config.crons.find((c: { path: string }) => c.path === '/api/cron/churn-detection');
    expect(cron, 'Missing churn-detection cron').toBeTruthy();
    expect(cron.schedule).toBe('0 14 * * *');
  });

  test('existing verify crons are preserved', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const verifyPaths = config.crons
      .filter((c: { path: string }) => c.path.startsWith('/api/cron/verify'))
      .map((c: { path: string }) => c.path);
    expect(verifyPaths).toContain('/api/cron/verify');
    expect(verifyPaths).toContain('/api/cron/verify2');
    expect(verifyPaths).toContain('/api/cron/verify3');
    expect(verifyPaths).toContain('/api/cron/verify4');
    expect(verifyPaths).toContain('/api/cron/verify5');
  });

  test('total cron count is 8', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    expect(config.crons.length).toBe(8);
  });
});
