import { test, expect } from '@playwright/test';

test.describe('Portal Invite Page', () => {
  test('shows error when no token is provided', async ({ page }) => {
    await page.goto('/portal/invite');
    const error = page.locator('text=Invalid invitation link');
    await expect(error).toBeVisible();
  });

  test('renders password form when token is provided', async ({ page }) => {
    await page.goto('/portal/invite?token=fake-token-for-testing');

    const heading = page.locator('h1');
    await expect(heading).toContainText('Set Your Password');

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const confirmInput = page.locator('input[type="password"]').nth(1);
    await expect(confirmInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText(/Set Password/i);
  });

  test('validates password mismatch', async ({ page }) => {
    await page.goto('/portal/invite?token=fake-token');

    const inputs = page.locator('input[type="password"]');
    // Need passwords >= 8 chars to pass the browser minLength validation
    await inputs.first().fill('password123');
    await inputs.nth(1).fill('differentpw123');

    await page.click('button[type="submit"]');

    const error = page.locator('text=Passwords do not match');
    await expect(error).toBeVisible();
  });

  test('validates password minimum length via JS', async ({ page }) => {
    await page.goto('/portal/invite?token=fake-token');

    const inputs = page.locator('input[type="password"]');
    // Use evaluate to bypass browser minLength validation and set short values
    await inputs.first().evaluate((el: HTMLInputElement) => {
      el.removeAttribute('minLength');
    });
    await inputs.first().fill('short');
    await inputs.nth(1).fill('short');

    await page.click('button[type="submit"]');

    const error = page.locator('text=Password must be at least 8 characters');
    await expect(error).toBeVisible();
  });

  test('shows error for invalid/expired token on submit', async ({ page }) => {
    await page.goto('/portal/invite?token=expired-invalid-token');

    const inputs = page.locator('input[type="password"]');
    await inputs.first().fill('validpassword123');
    await inputs.nth(1).fill('validpassword123');

    await page.click('button[type="submit"]');

    // Should show an error from the API (invalid token) or server error
    const error = page.locator('text=/Invalid or expired|Server misconfigured|Failed to accept/');
    await expect(error).toBeVisible({ timeout: 15_000 });
  });

  test('has proper welcome text', async ({ page }) => {
    await page.goto('/portal/invite?token=fake-token');
    const welcome = page.locator('text=Welcome to the client portal');
    await expect(welcome).toBeVisible();
  });

  test('button shows loading state on submit', async ({ page }) => {
    await page.goto('/portal/invite?token=some-token');

    const inputs = page.locator('input[type="password"]');
    await inputs.first().fill('validpassword123');
    await inputs.nth(1).fill('validpassword123');

    const button = page.locator('button[type="submit"]');
    await button.click();

    await expect(button).toContainText('Setting up...');
  });
});
