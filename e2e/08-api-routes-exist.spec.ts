import { test, expect } from '@playwright/test';

test.describe('API Route Existence — Portal', () => {
  // These should all return 401 (route exists but requires auth)
  // vs 404 (route doesn't exist)
  const portalRoutes = [
    { path: '/api/portal/dashboard', method: 'GET' },
    { path: '/api/portal/onboarding', method: 'GET' },
    { path: '/api/portal/activity', method: 'GET' },
    { path: '/api/portal/requests', method: 'GET' },
    { path: '/api/portal/meetings', method: 'GET' },
    { path: '/api/portal/knowledge', method: 'GET' },
    { path: '/api/portal/billing', method: 'GET' },
    { path: '/api/portal/reports', method: 'GET' },
    { path: '/api/portal/settings', method: 'GET' },
  ];

  for (const route of portalRoutes) {
    test(`${route.method} ${route.path} exists (returns 401, not 404)`, async ({ request }) => {
      const resp = await request.get(route.path);
      // 401 = route exists but blocked by middleware
      // 404 = route doesn't exist at all
      expect(resp.status(), `${route.path} returned ${resp.status()} — expected 401`).toBe(401);
    });
  }
});

test.describe('API Route Existence — Admin', () => {
  const adminRoutes = [
    { path: '/api/admin/clients', method: 'GET' },
    { path: '/api/admin/requests', method: 'GET' },
  ];

  for (const route of adminRoutes) {
    test(`${route.method} ${route.path} exists (returns 401, not 404)`, async ({ request }) => {
      const resp = await request.get(route.path);
      expect(resp.status(), `${route.path} returned ${resp.status()} — expected 401`).toBe(401);
    });
  }
});

test.describe('API Route Existence — Cron', () => {
  // Cron routes use requireSecret — without CRON_SECRET header, they return 401/403
  const cronRoutes = [
    '/api/cron/weekly-report',
    '/api/cron/monthly-report',
    '/api/cron/churn-detection',
  ];

  for (const route of cronRoutes) {
    test(`GET ${route} exists (not 404)`, async ({ request }) => {
      const resp = await request.get(route);
      // Should return 401/403 (missing CRON_SECRET), not 404
      expect(resp.status()).not.toBe(404);
    });
  }
});

test.describe('API Route Existence — Invitation', () => {
  test('POST /api/admin/clients/invite exists (returns 401)', async ({ request }) => {
    const resp = await request.post('/api/admin/clients/invite', {
      data: { client_id: 'fake-id' },
    });
    expect(resp.status()).toBe(401);
  });

  test('POST /api/portal/invite/accept exists (not 404)', async ({ request }) => {
    const resp = await request.post('/api/portal/invite/accept', {
      data: { token: 'fake', password: 'test1234' },
    });
    // This route is NOT behind middleware (no /api/portal matching needed)
    // so it should process the request and return 400 or 503 (bad token or no secret)
    expect(resp.status()).not.toBe(404);
  });
});

test.describe('Webhook Route — Stripe', () => {
  test('POST /api/webhooks/stripe exists (not 404)', async ({ request }) => {
    const resp = await request.post('/api/webhooks/stripe', {
      data: '',
      headers: { 'stripe-signature': 'fake' },
    });
    // Should return 400 (bad signature) or 500, not 404
    expect(resp.status()).not.toBe(404);
  });
});
