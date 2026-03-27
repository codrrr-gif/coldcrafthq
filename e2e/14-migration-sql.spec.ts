import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Migration — Portal Tables', () => {
  const file = 'src/lib/supabase/migration-v9-portal.sql';

  test('migration file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('creates clients table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*clients/i);
  });

  test('creates client_users table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*client_users/i);
  });

  test('creates client_contacts table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*client_contacts/i);
  });

  test('creates meetings table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*meetings/i);
  });

  test('creates invoices table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*invoices/i);
  });

  test('creates reports table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*reports/i);
  });

  test('creates activity_feed table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*activity_feed/i);
  });

  test('creates client_requests table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/CREATE TABLE.*client_requests/i);
  });

  test('creates indexes on client_id columns', () => {
    const content = fs.readFileSync(file, 'utf-8');
    const indexMatches = content.match(/CREATE INDEX/gi);
    expect(indexMatches?.length).toBeGreaterThanOrEqual(8);
  });
});

test.describe('Migration — Client ID Backfill', () => {
  const file = 'src/lib/supabase/migration-v9-client-id.sql';

  test('migration file exists', () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  test('adds client_id to replies table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/ALTER TABLE.*replies.*ADD.*client_id/i);
  });

  test('adds client_id to pipeline_leads table', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/ALTER TABLE.*pipeline_leads.*ADD.*client_id/i);
  });

  test('creates default ColdCraft Internal client', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('ColdCraft Internal');
  });

  test('backfills existing records', () => {
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toMatch(/UPDATE.*SET.*client_id/i);
  });
});
