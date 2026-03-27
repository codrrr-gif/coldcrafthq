import { test, expect } from '@playwright/test';

test.describe('Middleware — Auth guards', () => {
  // ========================================
  // Portal routes redirect to /portal/login
  // ========================================
  const portalProtectedRoutes = [
    '/portal/dashboard',
    '/portal/onboarding',
    '/portal/activity',
    '/portal/requests',
    '/portal/meetings',
    '/portal/knowledge',
    '/portal/billing',
    '/portal/reports',
    '/portal/settings',
  ];

  for (const route of portalProtectedRoutes) {
    test(`unauthenticated ${route} → redirects to /portal/login`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'commit' });
      // Middleware should 307 redirect to /portal/login
      expect(page.url()).toContain('/portal/login');
    });
  }

  // ========================================
  // Admin routes redirect to /login
  // ========================================
  const adminProtectedRoutes = [
    '/dashboard',
    '/dashboard/clients',
    '/dashboard/clients/new',
    '/dashboard/requests',
    '/dashboard/settings',
  ];

  for (const route of adminProtectedRoutes) {
    test(`unauthenticated ${route} → redirects to /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'commit' });
      expect(page.url()).toContain('/login');
    });
  }

  // ========================================
  // Portal public routes are accessible
  // ========================================
  test('/portal/login is accessible without auth', async ({ page }) => {
    const resp = await page.goto('/portal/login');
    expect(resp?.status()).toBe(200);
    expect(page.url()).toContain('/portal/login');
  });

  test('/portal/invite is accessible without auth', async ({ page }) => {
    const resp = await page.goto('/portal/invite');
    expect(resp?.status()).toBe(200);
    expect(page.url()).toContain('/portal/invite');
  });

  test('/login (admin) is accessible without auth', async ({ page }) => {
    const resp = await page.goto('/login');
    expect(resp?.status()).toBe(200);
  });

  // ========================================
  // API routes return 401 without auth
  // ========================================
  const portalApiRoutes = [
    '/api/portal/dashboard',
    '/api/portal/activity',
    '/api/portal/requests',
    '/api/portal/meetings',
    '/api/portal/knowledge',
    '/api/portal/billing',
    '/api/portal/reports',
    '/api/portal/settings',
    '/api/portal/onboarding',
  ];

  for (const route of portalApiRoutes) {
    test(`API ${route} → 401 without auth`, async ({ request }) => {
      const resp = await request.get(route);
      expect(resp.status()).toBe(401);
      const body = await resp.json();
      expect(body.error).toBe('Unauthorized');
    });
  }

  const adminApiRoutes = [
    '/api/admin/clients',
    '/api/admin/requests',
  ];

  for (const route of adminApiRoutes) {
    test(`API ${route} → 401 without auth`, async ({ request }) => {
      const resp = await request.get(route);
      expect(resp.status()).toBe(401);
      const body = await resp.json();
      expect(body.error).toBe('Unauthorized');
    });
  }
});
