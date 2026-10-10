import { expect, test } from '@playwright/test';
import { signIn, waitForFloor } from './helpers';

test('a new member signs in, sets up and lands on their floor', async ({ page }) => {
  await signIn(page, 'you@northgate.test');
  await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
  await page.getByText('Support', { exact: true }).click();
  await page.getByText('At the office').click();
  await page.getByRole('button', { name: 'Walk in' }).click();
  await waitForFloor(page);
  await expect(page.getByText(/You're in\. Your desk is by the Support team/)).toBeVisible();
  // seeded colleagues come from the database
  await expect(page.getByRole('button', { name: /Mei Lin.*Focusing/ })).toBeVisible();
});

test('a status change is saved and survives a reload', async ({ page }) => {
  await signIn(page, 'noah@northgate.test');
  await waitForFloor(page);
  // listen before clicking so the save response can't slip past
  const saved = page.waitForResponse(r => r.url().endsWith('/me') && r.request().method() === 'PATCH');
  await page.getByRole('radio', { name: 'Focusing' }).click();
  await expect(page.getByText('Focus mode is on.')).toBeVisible();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await waitForFloor(page);
  await expect(page.getByRole('radio', { name: 'Focusing' })).toHaveAttribute('aria-checked', 'true');
});

test('signing out returns to the sign-in screen', async ({ page, context }) => {
  await signIn(page, 'priya@northgate.test');
  await waitForFloor(page);
  await context.clearCookies();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Come on in' })).toBeVisible();
});
