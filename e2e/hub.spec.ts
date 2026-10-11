import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('arrive at the IT park, find your tower, take the lift to your floor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page, 'noah@northgate.test');

  // the campus: six towers, yours called out
  await expect(page.getByRole('heading', { name: 'Knovra IT Park' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toBeVisible();
  const towers = page.getByRole('navigation', { name: 'Towers' });
  await expect(towers.getByRole('button')).toHaveCount(6);
  await expect(page.getByText('Northgate is in Northgate Tower, floor 4')).toBeVisible();

  // look at another tower's directory: names only
  await towers.getByRole('button', { name: /Meridian Labs/ }).click();
  const directory = page.getByRole('region', { name: 'Meridian Labs directory' });
  await expect(directory.getByText('Nimbus AI')).toBeVisible();

  // walk into your own tower
  await towers.getByRole('button', { name: /Northgate Tower/ }).click();
  await page
    .getByRole('region', { name: 'Northgate Tower directory' })
    .getByRole('button', { name: 'Enter the lobby' })
    .click();
  await expect(page.getByRole('heading', { name: 'Northgate Tower' })).toBeVisible();

  // the lift only goes where you're expected
  const lift = page.getByRole('region', { name: 'Lift' });
  await expect(lift.getByRole('button', { name: 'Floor 2' })).toBeDisabled();
  await expect(lift.getByText('Atlas Freight Tech')).toBeVisible();
  const mine = lift.getByRole('button', { name: 'Floor 4, Northgate, your office' });
  await expect(mine).toBeEnabled();
  await mine.click();
  await expect(page.getByText('Going up to floor 4…')).toBeVisible();

  // step out on the floor, then head back down
  await expect(page.getByRole('heading', { name: 'Good morning' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Northgate · Floor 4')).toBeVisible();
  await page.getByRole('button', { name: '← Lobby' }).click();
  await expect(page.getByRole('heading', { name: 'Northgate Tower' })).toBeVisible();
  await page.getByRole('button', { name: '← Back to the campus' }).click();
  await expect(page.getByRole('heading', { name: 'Knovra IT Park' })).toBeVisible();
  expect(errors).toEqual([]);
});
