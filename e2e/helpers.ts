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

/** Waits until the 3D floor and its test hook are ready, failing on any page error. */
export async function waitForFloor(page: Page) {
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => 'useOffice' in ((window as unknown as { __office?: object }).__office ?? {}));
}

export const playerPos = (page: Page) =>
  page.evaluate(() => {
    const o = (window as unknown as { __office: OfficeHook }).__office;
    return { x: o.player.pos.x, z: o.player.pos.z };
  });
