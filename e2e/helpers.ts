import { expect, type Page } from '@playwright/test';

export interface OfficeHook {
  player: { pos: { x: number; z: number } };
}

/** Signs in through the development sign-in form. */
export async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/**
 * Gets from wherever the app opened (the campus, after sign-in) to your own floor, using the
 * campus shortcut, and waits until the floor is ready.
 */
export async function waitForFloor(page: Page) {
  const floorHeading = page.getByRole('heading', { name: 'Good morning' });
  const shortcut = page.getByRole('button', { name: 'Go straight to my desk' });
  await expect(floorHeading.or(shortcut)).toBeVisible({ timeout: 30_000 });
  if (await shortcut.isVisible()) await shortcut.click();
  await expect(floorHeading).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => 'useOffice' in ((window as unknown as { __office?: object }).__office ?? {}));
}

export const playerPos = (page: Page) =>
  page.evaluate(() => {
    const o = (window as unknown as { __office: OfficeHook }).__office;
    return { x: o.player.pos.x, z: o.player.pos.z };
  });
