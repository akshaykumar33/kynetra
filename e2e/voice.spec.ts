import { expect, test, type Page } from '@playwright/test';
import { signIn, waitForFloor } from './helpers';

interface Hook {
  player: { pos: { x: number; z: number } };
  positions: Map<string, { x: number; z: number }>;
  audibleIds: () => string[];
  useOffice: { getState: () => { me: { id: string } | null; voice: { state: string } } };
}

const myId = (page: Page) =>
  page.evaluate(() => (window as unknown as { __office: Hook }).__office.useOffice.getState().me!.id);

async function turnOnVoice(page: Page) {
  await page.getByRole('button', { name: 'Turn on voice' }).click();
  await page.waitForFunction(
    () => (window as unknown as { __office: Hook }).__office.useOffice.getState().voice.state === 'on',
    null,
    { timeout: 20_000 },
  );
}

/** Resolves with Date.now() once `page` is within `range` metres of `otherId` (or beyond it when `away`). */
const reachDistance = (page: Page, otherId: string, range: number, away = false) =>
  page
    .waitForFunction(
      ({ id, range, away }) => {
        const o = (window as unknown as { __office: Hook }).__office;
        const p = o.positions.get(id);
        if (!p) return false;
        const d = Math.hypot(p.x - o.player.pos.x, p.z - o.player.pos.z);
        return (away ? d > range : d < range) ? Date.now() : false;
      },
      { id: otherId, range, away },
      { polling: 10, timeout: 60_000 },
    )
    .then(h => h.jsonValue() as Promise<number>);

/** Resolves with Date.now() once LiveKit audio from `otherId` is (or is no longer) subscribed. */
const audible = (page: Page, otherId: string, want: boolean, timeout = 10_000) =>
  page
    .waitForFunction(
      ({ id, want }) =>
        (window as unknown as { __office: Hook }).__office.audibleIds().includes(id) === want ? Date.now() : false,
      { id: otherId, want },
      { polling: 10, timeout },
    )
    .then(h => h.jsonValue() as Promise<number>);

// Arjun and Tomás: people no other spec changes, since statuses persist in the shared test database
test('walking up to someone connects real audio, and walking away ends it', async ({ browser }) => {
  test.setTimeout(180_000);
  const lena = await (await browser.newContext()).newPage();
  const sam = await (await browser.newContext()).newPage();
  await signIn(lena, 'arjun@northgate.test');
  await waitForFloor(lena);
  await signIn(sam, 'tomas@northgate.test');
  await waitForFloor(sam);
  const [lenaId, samId] = [await myId(lena), await myId(sam)];

  // Lena steps away from the entrance so they start apart
  await lena.bringToFront();
  await lena.getByRole('heading', { name: 'Good morning' }).click();
  await lena.keyboard.down('w');
  await reachDistance(lena, samId, 6, true);
  await lena.keyboard.up('w');

  await turnOnVoice(lena);
  await turnOnVoice(sam);
  expect(await sam.evaluate(() => (window as unknown as { __office: Hook }).__office.audibleIds())).toEqual([]);

  // Sam walks over: both hear each other within a second of coming into range
  await sam.bringToFront();
  await sam.getByRole('button', { name: /Arjun Nair/ }).click();
  const near = await reachDistance(sam, lenaId, 3.2);
  const samHears = await audible(sam, lenaId, true);
  const lenaHears = await audible(lena, samId, true);
  const joinMs = Math.max(samHears, lenaHears) - near;
  console.log(`voice connect after coming into range: ${joinMs} ms`);
  expect(joinMs).toBeLessThan(1000);
  await expect(sam.getByText(/Talking with .*Arjun/)).toBeVisible();

  // Sam walks away: audio stops within a second of leaving range (4 m)
  await sam.getByRole('heading', { name: 'Good morning' }).click();
  await sam.keyboard.down('s');
  const far = await reachDistance(sam, lenaId, 4.0, true);
  const samStops = await audible(sam, lenaId, false);
  await sam.keyboard.up('s');
  const leaveMs = samStops - far;
  console.log(`voice disconnect after leaving range: ${leaveMs} ms`);
  expect(leaveMs).toBeLessThan(1000);

  // Lena focuses: Sam can walk right up and still never receives her audio
  await lena.getByRole('radio', { name: 'Focusing' }).click();
  await sam.bringToFront();
  await sam.getByRole('button', { name: /Arjun Nair/ }).click();
  await reachDistance(sam, lenaId, 2);
  await sam.waitForTimeout(1500);
  expect(await sam.evaluate(() => (window as unknown as { __office: Hook }).__office.audibleIds())).not.toContain(
    lenaId,
  );
  expect(await lena.evaluate(() => (window as unknown as { __office: Hook }).__office.audibleIds())).not.toContain(
    samId,
  );
  await expect(sam.getByText('Arjun is focusing.')).toBeVisible();
});

test('turning voice on shows a clear message when the microphone is blocked', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  // simulate a browser that refuses microphone access
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
  });
  await signIn(page, 'priya@northgate.test');
  await waitForFloor(page);
  await page.getByRole('button', { name: 'Turn on voice' }).click();
  await expect(page.getByText(/Microphone access is blocked/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Turn on voice' })).toBeEnabled();
});
