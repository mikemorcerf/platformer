import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function load(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  return errors;
}
async function tick(page, seconds) {
  await page.evaluate(seconds => {
    for (let i = 0; i < Math.round(seconds * 120); i++) window.__nova.step(1 / 120);
    window.__nova.draw(0);
  }, seconds);
}
async function state(page) {
  return page.evaluate(() => ({ ...window.__nova.game, player: { ...window.__nova.player } }));
}
async function place(page, x, y = 326) {
  await page.evaluate(({ x, y }) => Object.assign(window.__nova.player, { x, y, vx: 0, vy: 0, grounded: true }), { x, y });
}
async function collectFixture(page, type) {
  await page.evaluate(type => {
    const it = window.__nova.world[window.__nova.game.zone].items.find(i => i.type === type && !i.taken);
    Object.assign(window.__nova.player, { x: it.x, y: it.y, vx: 0, vy: 0 });
  }, type);
  await tick(page, .02);
}
async function useExit(page) {
  const x = await page.evaluate(() => window.__nova.world[window.__nova.game.zone].exit.x);
  await place(page, x);
  await page.keyboard.press('KeyE');
  await tick(page, .7);
}

test('starts with a real scene, responds to movement, jumping, firing, and pause', async ({ page }) => {
  const errors = await load(page);
  await expect(page.getByRole('button', { name: 'START GAME' })).toBeVisible();
  await page.keyboard.press('Enter');
  expect((await state(page)).mode).toBe('playing');
  await page.keyboard.down('ArrowRight');
  await tick(page, .5);
  await page.keyboard.up('ArrowRight');
  const moved = await state(page);
  expect(moved.player.x).toBeGreaterThan(200);
  await page.keyboard.down('KeyW');
  await tick(page, .2);
  expect((await state(page)).player.y).toBeLessThan(270);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await tick(page, .2);
  expect(await page.evaluate(() => window.__nova.bullets.length)).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  const paused = await state(page);
  await tick(page, 1);
  expect((await state(page)).time).toBe(paused.time);
  await expect(page.getByRole('button', { name: 'RESUME EXPEDITION' })).toBeVisible();
  await page.keyboard.press('Enter');
  expect((await state(page)).mode).toBe('playing');
  expect(errors).toEqual([]);
});

test('blaster destroys enemies; suit damage and health supplies work', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'START GAME' }).click();
  await place(page, 350);
  await page.keyboard.down('Space');
  await tick(page, 1.2);
  await page.keyboard.up('Space');
  await tick(page, .35);
  expect(await page.evaluate(() => window.__nova.world[0].enemies[0].alive)).toBe(false);
  expect((await state(page)).score).toBe(100);
  await page.evaluate(() => {
    const enemy = window.__nova.world[0].enemies[1];
    Object.assign(window.__nova.player, { x: enemy.x, y: 326, vx: 0, vy: 0 });
  });
  await tick(page, .03);
  expect((await state(page)).hp).toBe(4);
  await collectFixture(page, 'health');
  expect((await state(page)).hp).toBe(5);
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '5');
});

test('powerups increase jump height and firepower; all relics and portals lead to victory', async ({ page }) => {
  const errors = await load(page);
  await page.getByRole('button', { name: 'START GAME' }).click();
  await useExit(page);
  expect((await state(page)).zone).toBe(0);
  await collectFixture(page, 'relic');
  await useExit(page);
  expect((await state(page)).zone).toBe(0); // The boots are required for the citadel.
  await collectFixture(page, 'boots');
  await collectFixture(page, 'blaster');
  expect((await state(page)).weapon).toBe(2);
  await place(page, 130);
  await page.keyboard.down('KeyW');
  await tick(page, .4);
  expect((await state(page)).player.y).toBeLessThan(210);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await tick(page, .02);
  expect(await page.evaluate(() => window.__nova.bullets.length)).toBe(2);
  await page.keyboard.up('Space');
  await useExit(page);
  expect((await state(page)).zone).toBe(1);
  await place(page, 1618);
  await page.keyboard.down('ArrowRight');
  await tick(page, .3);
  await page.keyboard.up('ArrowRight');
  expect((await state(page)).player.x).toBeLessThanOrEqual(1619);
  expect(await page.evaluate(() => window.__nova.world[1].gate.open)).toBe(false);
  await collectFixture(page, 'key');
  await place(page, 1570);
  await tick(page, .02);
  expect(await page.evaluate(() => window.__nova.world[1].gate.open)).toBe(true);
  await collectFixture(page, 'relic');
  await useExit(page);
  expect((await state(page)).zone).toBe(2);
  await collectFixture(page, 'relic');
  await useExit(page);
  expect((await state(page)).mode).toBe('won');
  await expect(page.getByText('MISSION COMPLETE', { exact: true })).toBeVisible();
  await expect(page.locator('#relic-count')).toHaveText('3 / 3');
  expect((await state(page)).relics).toEqual([true, true, true]);
  await page.getByRole('button', { name: 'PLAY AGAIN' }).click();
  const fresh = await state(page);
  expect(fresh.relics).toEqual([false, false, false]);
  expect(fresh.zone).toBe(0);
  expect(fresh.hp).toBe(5);
  expect(fresh.weapon).toBe(1);
  expect(errors).toEqual([]);
});

test('falling recalls to the checkpoint, preserves items, and eventually permits a fresh retry', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'START GAME' }).click();
  await collectFixture(page, 'relic');
  await place(page, 1580);
  await tick(page, .03);
  expect((await state(page)).checkpoint.x).toBe(1580);
  await place(page, 700, 500);
  await tick(page, .03);
  const recalled = await state(page);
  expect(recalled.lives).toBe(2);
  expect(recalled.player.x).toBe(1580);
  expect(recalled.relics[0]).toBe(true);
  for (let i = 0; i < 2; i++) {
    await place(page, 700, 500);
    await tick(page, .03);
  }
  expect((await state(page)).mode).toBe('gameover');
  await page.getByRole('button', { name: 'TRY AGAIN' }).click();
  expect((await state(page)).lives).toBe(3);
  expect((await state(page)).relics).toEqual([false, false, false]);
});

test.describe('mobile input', () => {
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test('touch controls support moving and jumping together on a narrow screen', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'START GAME' }).click();
  const right = page.getByRole('button', { name: 'Move right', exact: true });
  const jump = page.getByRole('button', { name: 'Jump', exact: true });
  const dash = page.getByRole('button', { name: 'Air dash', exact: true });
  const r = await right.boundingBox(), j = await jump.boundingBox(), d = await dash.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const finger1 = { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 };
  const finger2 = { x: j.x + j.width / 2, y: j.y + j.height / 2, id: 2 };
  const finger3 = { x: d.x + d.width / 2, y: d.y + d.height / 2, id: 3 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger1] });
  await tick(page, .3);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger1, finger2] });
  await tick(page, .2);
  const moved = await state(page);
  expect(moved.player.x).toBeGreaterThan(200);
  expect(moved.player.y).toBeLessThan(275);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger3] });
  await tick(page, .1);
  const dashed = await state(page);
  expect(dashed.player.dashTime).toBeGreaterThan(0);
  expect(dashed.player.x - moved.player.x).toBeGreaterThan(80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await state(page)).player.dashTime).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
});

test('the standalone document runs without any runtime network requests', async ({ page }) => {
  const requests = [], errors = [];
  page.on('request', req => { if (req.url().startsWith('http')) requests.push(req.url()); });
  page.on('pageerror', error => errors.push(error.message));
  // Managed Chromium blocks file:// navigation. Exercise the exact standalone
  // document in an opaque origin with all network access blocked instead.
  await page.route('**/*', route => route.abort());
  await page.setContent(await readFile(resolve('index.html'), 'utf8'));
  await page.getByRole('button', { name: 'START GAME' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Toggle sound' }).click();
  await expect(page.locator('#sound-label')).toHaveText('SOUND OFF');
  await page.keyboard.press('KeyM');
  await expect(page.locator('#sound-label')).toHaveText('SOUND ON');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
