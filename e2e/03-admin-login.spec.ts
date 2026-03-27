import { test, expect } from '@playwright/test';

test.describe('Admin Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders login form', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('has ColdCraft branding', async ({ page }) => {
    // Should have ColdCraft mentioned somewhere on the page
    const text = await page.textContent('body');
    expect(text).toMatch(/coldcraft/i);
  });

  test('shows error on bad credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'bad@example.com');
    await page.fill('input[type="password"]', 'badpassword');
    await page.click('button[type="submit"]');

    // Wait for error state (may show as an error message or a redirect back)
    await page.waitForTimeout(3000);
    // Should still be on login page (not redirected to dashboard)
    expect(page.url()).toContain('/login');
  });
});
