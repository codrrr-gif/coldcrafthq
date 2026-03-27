import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Layout — nav items', () => {
  const expectedNavItems = [
    { href: '/dashboard', label: 'Replies', icon: 'inbox' },
    { href: '/dashboard/verify', label: 'Verify', icon: 'shield' },
    { href: '/dashboard/pipeline', label: 'Pipeline', icon: 'zap' },
    { href: '/dashboard/tam', label: 'TAM', icon: 'map' },
    { href: '/dashboard/heat', label: 'Heat', icon: 'fire' },
    { href: '/dashboard/insights', label: 'Insights', icon: 'chart' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' },
    { href: '/dashboard/crm', label: 'CRM', icon: 'crm' },
    { href: '/dashboard/knowledge', label: 'Knowledge', icon: 'book' },
    { href: '/dashboard/clients', label: 'Clients', icon: 'crm' },
    { href: '/dashboard/requests', label: 'Requests', icon: 'inbox' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
  ];

  test('admin nav includes all 12 items', async () => {
    const fs = await import('fs');
    const layoutContent = fs.readFileSync(
      'src/app/dashboard/layout.tsx',
      'utf-8'
    );

    for (const item of expectedNavItems) {
      expect(layoutContent, `Missing nav item: ${item.label}`).toContain(item.label);
      expect(layoutContent, `Missing href: ${item.href}`).toContain(item.href);
    }
  });

  test('Clients nav comes before Settings', async () => {
    const fs = await import('fs');
    const layoutContent = fs.readFileSync(
      'src/app/dashboard/layout.tsx',
      'utf-8'
    );

    const clientsIdx = layoutContent.indexOf("'/dashboard/clients'");
    const settingsIdx = layoutContent.indexOf("'/dashboard/settings'");
    expect(clientsIdx).toBeGreaterThan(0);
    expect(settingsIdx).toBeGreaterThan(clientsIdx);
  });

  test('Requests nav comes before Settings', async () => {
    const fs = await import('fs');
    const layoutContent = fs.readFileSync(
      'src/app/dashboard/layout.tsx',
      'utf-8'
    );

    const requestsIdx = layoutContent.indexOf("'/dashboard/requests'");
    const settingsIdx = layoutContent.indexOf("'/dashboard/settings'");
    expect(requestsIdx).toBeGreaterThan(0);
    expect(settingsIdx).toBeGreaterThan(requestsIdx);
  });

  test('sign out button exists in layout', async () => {
    const fs = await import('fs');
    const layoutContent = fs.readFileSync(
      'src/app/dashboard/layout.tsx',
      'utf-8'
    );

    expect(layoutContent).toContain('signOut');
    expect(layoutContent).toContain('/login');
  });
});
