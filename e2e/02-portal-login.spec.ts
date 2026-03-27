import { test, expect } from '@playwright/test';

test.describe('Portal Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // Dev server may need time to compile on first hit
    await page.goto('/portal/login', { waitUntil: 'networkidle', timeout: 15_000 });
  });

  test('renders login heading', async ({ page }) => {
    // If we got a 404 on cold start, retry once
    const heading = page.locator('h1');
    const text = await heading.textContent();
    if (text === '404') {
      await page.reload({ waitUntil: 'networkidle' });
    }
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Client Portal');
  });

  test('has email input field with label', async ({ page }) => {
    const emailInput = page.locator('input#email[type="email"]');
    await expect(emailInput).toBeVisible();
    const label = page.locator('label[for="email"]');
    await expect(label).toContainText('Email');
  });

  test('has password input field with label', async ({ page }) => {
    const passwordInput = page.locator('input#password[type="password"]');
    await expect(passwordInput).toBeVisible();
    const label = page.locator('label[for="password"]');
    await expect(label).toContainText('Password');
  });

  test('has sign in submit button', async ({ page }) => {
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Sign in');
  });

  test('sign in button shows loading state on submit', async ({ page }) => {
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'wrongpassword');

    const button = page.locator('button[type="submit"]');
    await button.click();

    // Button should show "Signing in..." while loading
    await expect(button).toContainText('Signing in...');
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input#email', 'invalid@example.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for the error message to appear
    const error = page.locator('text=Invalid email or password');
    await expect(error).toBeVisible({ timeout: 15_000 });
  });

  test('has subtitle text', async ({ page }) => {
    const subtitle = page.locator('text=Sign in to view your campaigns');
    await expect(subtitle).toBeVisible();
  });

  test('email input has autofocus', async ({ page }) => {
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeFocused();
  });
});
