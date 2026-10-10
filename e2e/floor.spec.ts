import { expect, test, type Page } from '@playwright/test';

interface OfficeHook {
  player: { pos: { x: number; z: number }; target: { x: number; y: number; z: number } | null };
  positions: Map<string, { x: number; z: number }>;
  useOffice: { getState: () => { nearby: string[] } };
}

const playerPos = (page: Page) =>
  page.evaluate(() => {
    const o = (window as unknown as { __office: OfficeHook }).__office;
    return { x: o.player.pos.x, z: o.player.pos.z };
  });

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => 'useOffice' in ((window as unknown as { __office?: object }).__office ?? {}));
  expect(errors).toEqual([]);
});

test('shows the floor HUD', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Good morning' })).toBeVisible();
  await expect(page.getByText('People on this floor')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Available' })).toHaveAttribute('aria-checked', 'true');
});

test('W moves the player forward', async ({ page }) => {
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

test('walking up to Lena opens a conversation', async ({ page }) => {
  await page.getByRole('button', { name: /Lena Fischer/ }).click();
  await expect(page.getByText(/Talking with .*Lena/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: /Lena Fischer/ }).getByText('Nearby')).toBeVisible();
});

test('setting Focus replaces conversations with focus mode', async ({ page }) => {
  await page.getByRole('radio', { name: 'Focusing' }).click();
  await expect(page.getByText('Focus mode is on.')).toBeVisible();
});
