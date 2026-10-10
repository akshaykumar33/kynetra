import { expect, test } from '@playwright/test';
import { playerPos, signIn, waitForFloor } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page, 'sam@northgate.test');
  await waitForFloor(page);
  expect(errors).toEqual([]);
});

test('shows the floor HUD with colleagues from the server', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Good morning' })).toBeVisible();
  await expect(page.getByText('Northgate · Floor 4')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lena Fischer/ })).toBeVisible();
  // nobody else is connected, so colleagues show as offline
  await expect(page.getByRole('button', { name: /Lena Fischer/ }).getByText('Offline')).toBeVisible();
});

test('W moves the player forward', async ({ page }) => {
  // give the page keyboard focus without walking anywhere (the header is not interactive)
  await page.getByRole('heading', { name: 'Good morning' }).click();
  const start = await playerPos(page);
  await page.keyboard.down('w');
  // poll rather than sleep: CI renders WebGL in software and can run at a few frames per second
  await expect
    .poll(
      async () => {
        const p = await playerPos(page);
        return Math.hypot(p.x - start.x, p.z - start.z);
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0.5);
  await page.keyboard.up('w');
});

test('in demo mode, walking up to Lena opens a conversation', async ({ page }) => {
  await page.goto('/?demo=1');
  await waitForFloor(page);
  await page.getByRole('button', { name: /Lena Fischer/ }).click();
  await expect(page.getByText(/Talking with .*Lena/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: /Lena Fischer/ }).getByText('Nearby')).toBeVisible();
});
