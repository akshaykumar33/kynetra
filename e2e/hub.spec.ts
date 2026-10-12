import { expect, test } from '@playwright/test';
import { signIn, waitForFloor } from './helpers';

test('arrive in the world, find your tower, take the lift to your floor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page, 'noah@northgate.test');

  // the world: six IT park towers, yours called out, and your own home
  await expect(page.getByRole('heading', { name: 'Kynetra' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toBeVisible();
  const towers = page.getByRole('navigation', { name: 'Places' });
  await expect(towers.getByRole('button', { name: /floors/ })).toHaveCount(6);
  await expect(page.getByRole('region', { name: 'You' }).getByText(/Northgate Tower, floor 4/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go home' })).toBeVisible();

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
  await page.getByRole('button', { name: '← Back to the world' }).click();
  await expect(page.getByRole('heading', { name: 'Kynetra' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a person with no company still has a home in the world', async ({ page }) => {
  await signIn(page, 'newcomer@solo.test');
  await expect(page.getByRole('heading', { name: 'Kynetra' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/No company yet/)).toBeVisible();
  // arrives looking at their own house, which is private to them
  const card = page.getByRole('region', { name: "newcomer's home" });
  await expect(card.getByText(/Your own place/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Walk to Northgate Tower' })).toHaveCount(0);
});

test('make your home your own, open the door, and get a visitor', async ({ browser }) => {
  const host = await browser.newPage();
  await signIn(host, 'host@homes-e2e.test');
  await host.getByRole('button', { name: 'Go inside' }).click({ timeout: 30_000 });
  await expect(host.getByRole('heading', { name: "host's home" })).toBeVisible();

  const panel = host.getByRole('region', { name: 'Your home' });
  await panel.getByRole('button', { name: 'Jungle studio' }).click();
  await panel.getByRole('button', { name: 'Telescope' }).click();
  await panel.getByLabel(/Door open/).check();
  await expect(host.getByText('Door open to visitors')).toBeVisible();

  const book = host.getByRole('region', { name: 'Guestbook' });
  await book.getByLabel('Leave a note').fill('Plants need water on Fridays');
  await book.getByRole('button', { name: 'Sign' }).click();
  await expect(book.getByText('Plants need water on Fridays')).toBeVisible({ timeout: 15_000 });

  // someone else walks down the street and in through the open door
  const guest = await browser.newPage();
  await signIn(guest, 'guest@homes-e2e.test');
  await guest.getByRole('button', { name: /host's home/ }).click({ timeout: 60_000 });
  await guest.getByRole('button', { name: 'Step inside' }).click();
  await expect(guest.getByText('Visiting host')).toBeVisible();
  await expect(guest.getByText('Jungle studio')).toBeVisible();
  await expect(guest.getByRole('region', { name: 'Your home' })).toHaveCount(0);
  const theirBook = guest.getByRole('region', { name: 'Guestbook' });
  await expect(theirBook.getByRole('button', { name: /Delete note/ })).toHaveCount(0);
  await theirBook.getByLabel('Leave a note').fill('Lovely jungle!');
  await theirBook.getByRole('button', { name: 'Sign' }).click();
  await expect(theirBook.getByText('Lovely jungle!')).toBeVisible({ timeout: 15_000 });
  // close both 3D pages so they stop rendering during later tests
  await Promise.all([host.close(), guest.close()]);
});

test('found a company: name it, pick a free floor, and arrive as its owner', async ({ page }) => {
  await signIn(page, 'founder@e2e.test');
  const you = page.getByRole('region', { name: 'You' });
  await you.getByRole('button', { name: 'Found a company' }).click({ timeout: 30_000 });

  const panel = page.getByRole('region', { name: 'Found a company' });
  await panel.getByLabel('Company name').fill('Kite Studio');
  await panel.getByLabel('Team 1').fill('Makers');
  await panel.getByRole('button', { name: '+ Add a team' }).click();
  await page.keyboard.type('Sellers'); // the new team field takes the cursor
  await panel.getByRole('button', { name: 'Choose a floor' }).click();

  await panel
    .getByRole('group', { name: 'Towers' })
    .getByRole('button', { name: /Orbit One/ })
    .click();
  const floors = panel.getByRole('group', { name: 'Free floors in Orbit One' });
  const level = (await floors.getByRole('button').first().textContent())!.trim();
  await floors.getByRole('button').first().click();
  await panel.getByRole('button', { name: `Found Kite Studio on floor ${level}` }).click();

  // straight into onboarding for the new company, with its teams
  await expect(page.getByText(`Kite Studio · Floor ${level}`, { exact: false })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Makers' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Sellers' })).toBeVisible();

  // on the floor, the company's own team names are used, not the starter plan's
  await page.getByRole('button', { name: 'Walk in' }).click();
  const welcomed = expect(page.getByText(/You're in\. Your desk is by the Makers/)).toBeVisible({
    timeout: 45_000,
  });
  await waitForFloor(page);
  await welcomed;
  await expect(
    page.getByRole('complementary', { name: 'People on this floor' }).getByRole('heading', { name: 'Makers' }),
  ).toBeVisible();
});
