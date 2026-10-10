import { expect, test, type Page } from '@playwright/test';
import { signIn, waitForFloor } from './helpers';

interface Hook {
  player: { pos: { x: number; z: number } };
  remotes: Map<string, { at: number; x: number; z: number }[]>;
  useOffice: { getState: () => { me: { id: string } | null } };
}

const myId = (page: Page) =>
  page.evaluate(() => (window as unknown as { __office: Hook }).__office.useOffice.getState().me!.id);

test('two people see each other move, focus, talk and leave', async ({ browser }) => {
  const lenaCtx = await browser.newContext();
  const samCtx = await browser.newContext();
  const lena = await lenaCtx.newPage();
  const sam = await samCtx.newPage();

  await signIn(lena, 'lena@northgate.test');
  await waitForFloor(lena);
  await signIn(sam, 'sam@northgate.test');
  await waitForFloor(sam);
  const lenaId = await myId(lena);

  // Sam sees Lena on the floor
  const lenaRow = sam.getByRole('button', { name: /Lena Fischer/ });
  await expect(lenaRow).toBeEnabled({ timeout: 10_000 });
  await expect(lenaRow.getByText('Offline')).toHaveCount(0);

  // Lena walks; measure how long until Sam's client receives the move
  await lena.getByRole('heading', { name: 'Good morning' }).click();
  const start = await lena.evaluate(() => {
    const o = (window as unknown as { __office: Hook }).__office;
    return { x: o.player.pos.x, z: o.player.pos.z };
  });
  await lena.keyboard.down('w');
  const movedAt = await lena
    .waitForFunction(
      s => {
        const p = (window as unknown as { __office: Hook }).__office.player.pos;
        return Math.hypot(p.x - s.x, p.z - s.z) > 0.05 ? Date.now() : false;
      },
      start,
      { polling: 5, timeout: 15_000 },
    )
    .then(h => h.jsonValue() as Promise<number>);
  const seenAt = await sam
    .waitForFunction(
      ({ id, s }) => {
        const buf = (window as unknown as { __office: Hook }).__office.remotes.get(id);
        const p = buf?.[buf.length - 1];
        return p && Math.hypot(p.x - s.x, p.z - s.z) > 0.05 ? Date.now() : false;
      },
      { id: lenaId, s: start },
      { polling: 5, timeout: 15_000 },
    )
    .then(h => h.jsonValue() as Promise<number>);
  await lena.keyboard.up('w');
  const latency = seenAt - movedAt;
  test.info().annotations.push({ type: 'move latency (ms)', description: String(latency) });
  console.log(`move latency: ${latency} ms`);
  expect(latency).toBeLessThan(300);

  // Sam walks over to Lena and a conversation opens
  await lenaRow.click();
  await expect(sam.getByText(/Talking with .*Lena/)).toBeVisible({ timeout: 45_000 });
  await expect(lena.getByText(/Talking with .*Sam/)).toBeVisible({ timeout: 10_000 });

  // Lena focuses; Sam sees it within a second
  await lena.getByRole('radio', { name: 'Focusing' }).click();
  await expect(lenaRow).toContainText('Focusing', { timeout: 1_000 });
  await expect(sam.getByText('Lena is focusing.')).toBeVisible();

  // Lena closes the tab; after the grace period Sam sees her go offline
  await lenaCtx.close();
  await expect(lenaRow.getByText('Offline')).toBeVisible({ timeout: 8_000 });
  await samCtx.close();
});
