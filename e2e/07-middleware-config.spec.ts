import { test, expect } from '@playwright/test';

test.describe('Middleware Configuration', () => {
  test('middleware.ts has correct matcher config', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware.ts', 'utf-8');

    // Must match portal routes
    expect(content).toContain("'/portal/:path*'");
    // Must match portal API routes
    expect(content).toContain("'/api/portal/:path*'");
    // Must match admin API routes
    expect(content).toContain("'/api/admin/:path*'");
    // Must match admin dashboard
    expect(content).toContain("'/dashboard/:path*'");
  });

  test('middleware excludes /portal/login from auth requirement', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware.ts', 'utf-8');

    expect(content).toContain('/portal/login');
    // Should have a check like: !pathname.startsWith('/portal/login')
    expect(content).toMatch(/!pathname\.startsWith\(['"]\/portal\/login['"]\)/);
  });

  test('middleware excludes /portal/invite from auth requirement', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware.ts', 'utf-8');

    expect(content).toContain('/portal/invite');
    expect(content).toMatch(/!pathname\.startsWith\(['"]\/portal\/invite['"]\)/);
  });

  test('admin routes require admin role, not just any token', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware.ts', 'utf-8');

    // Should check token.role === 'admin' for /dashboard routes
    expect(content).toMatch(/token\.role\s*!==\s*'admin'/);
  });

  test('portal routes require clientId, not just any token', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware.ts', 'utf-8');

    // Should check token.clientId for /portal routes
    expect(content).toContain('token.clientId');
  });
});
