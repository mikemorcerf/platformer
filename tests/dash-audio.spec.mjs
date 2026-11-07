import { test, expect } from '@playwright/test';

async function tick(page, seconds) {
  await page.evaluate(seconds => {
    for (let i = 0; i < Math.round(seconds * 120); i++) window.__nova.step(1 / 120);
    window.__nova.draw(0);
  }, seconds);
}

test('holding Tab in midair dashes one-third as far, then stops at its time limit', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.keyboard.down('KeyW');
  await tick(page, .15);
  expect(await page.evaluate(() => window.__nova.player.dashReady)).toBe(true);
  await page.keyboard.up('KeyW');
  const before = await page.evaluate(() => ({ ...window.__nova.player }));
  await page.keyboard.down('Tab');
  await tick(page, .1);
  const active = await page.evaluate(() => ({ ...window.__nova.player }));
  expect(active.dashTime).toBeGreaterThan(0);
  expect(active.dashTime).toBeLessThan(.03);
  expect(active.dashReady).toBe(false);
  expect(active.x - before.x).toBeGreaterThan(80);
  expect(active.y).toBeCloseTo(before.y, 1);
  await tick(page, 4 / 120);
  const after = await page.evaluate(() => ({ ...window.__nova.player }));
  expect(after.x - before.x).toBeGreaterThan(104);
  expect(after.x - before.x).toBeLessThan(109);
  expect(after.dashTime).toBe(0);
  expect(after.dashReady).toBe(false);
  // Keep holding well past the cap: no extended or repeated dash.
  await tick(page, .2);
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBe(0);
  expect(await page.evaluate(() => window.__nova.audio.effects.dash)).toBe(1);
  await page.keyboard.up('Tab');
  await tick(page, .65);
  expect(await page.evaluate(() => window.__nova.player.grounded)).toBe(true);
  expect(await page.evaluate(() => window.__nova.player.dashReady)).toBe(true);
  await page.keyboard.down('KeyW'); await tick(page, .15); await page.keyboard.up('KeyW');
  const rightEdge = await page.evaluate(() => window.__nova.player.x);
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Tab');
  await tick(page, 16 / 120);
  const distance = rightEdge - await page.evaluate(() => window.__nova.player.x);
  expect(distance).toBeGreaterThan(104);
  expect(distance).toBeLessThan(109);
});

test('releasing Tab immediately interrupts the dash without restoring its charge', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.keyboard.down('KeyW'); await tick(page, .15); await page.keyboard.up('KeyW');
  const origin = await page.evaluate(() => window.__nova.player.x);
  await page.keyboard.down('Tab'); await tick(page, 5 / 120);
  const atRelease = await page.evaluate(() => window.__nova.player.x);
  expect(atRelease - origin).toBeCloseTo(35, 0);
  await page.keyboard.up('Tab');
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBe(0);
  expect(await page.evaluate(() => Math.abs(window.__nova.player.vx))).toBeLessThanOrEqual(190);
  expect(await page.evaluate(() => window.__nova.player.dashReady)).toBe(false);
  await tick(page, .05);
  expect(await page.evaluate(() => window.__nova.player.vy)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__nova.player.x) - atRelease).toBeLessThan(10);
  // Repressing in the same flight cannot restart the cancelled dash.
  await page.keyboard.down('Tab'); await tick(page, .05);
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBe(0);
  expect(await page.evaluate(() => window.__nova.audio.effects.dash)).toBe(1);
});

test('an air dash collides with a locked gate instead of crossing it', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await page.evaluate(() => {
    window.__nova.game.zone = 1;
    Object.assign(window.__nova.player, { x: 1545, y: 230, vx: 0, vy: 0, grounded: false, coyote: 0, dir: 1 });
  });
  await page.keyboard.down('Tab');
  await tick(page, .38);
  expect(await page.evaluate(() => window.__nova.player.x)).toBeLessThanOrEqual(1619);
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBe(0);
  expect(await page.evaluate(() => window.__nova.world[1].gate.open)).toBe(false);
});

test('the start prompt is unboxed pixel text with a locally embedded font', async ({ page }) => {
  await page.goto('/?test=1');
  await page.evaluate(() => document.fonts.ready);
  const prompt = page.getByRole('button', { name: 'START GAME', exact: true });
  await expect(prompt).toBeVisible();
  expect(await prompt.evaluate(el => {
    const style = getComputedStyle(el);
    return { clear: style.backgroundColor === 'rgba(0, 0, 0, 0)', shadow: style.boxShadow, pixel: style.fontFamily.includes('Nova Pixel'), loaded: document.fonts.check('30px "Nova Pixel"') };
  })).toEqual({ clear: true, shadow: 'none', pixel: true, loaded: true });
});

test('music and effects produce audible samples; pause and mute stop the soundtrack', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?test=1');
  expect(await page.evaluate(() => window.__nova.audio.state)).toBe('inactive');
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__nova.audio.state)).toBe('running');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.notes)).toBeGreaterThan(3);
  await expect.poll(() => page.evaluate(() => window.__nova.audio.rms)).toBeGreaterThan(.0001);
  expect(await page.evaluate(() => window.__nova.audio.track)).toBe(0);
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.effects.jump || 0)).toBeGreaterThan(0);
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.effects.shoot || 0)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__nova.audio.musicRunning)).toBe(false);
  expect(await page.evaluate(() => window.__nova.audio.track)).toBe(null);
  await page.getByRole('button', { name: 'Toggle sound' }).click();
  await expect(page.locator('#sound-label')).toHaveText('SOUND OFF');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.rms)).toBeLessThan(.0001);
  await page.getByRole('button', { name: 'RESUME EXPEDITION', exact: true }).click();
  expect(await page.evaluate(() => window.__nova.audio.musicRunning)).toBe(false);
  await page.keyboard.press('KeyM');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.musicRunning)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__nova.audio.rms)).toBeGreaterThan(.0001);
  // A normal portal transition changes the score to the next region's tune.
  await page.evaluate(() => {
    const n = window.__nova;
    n.game.relics[0] = true; n.game.boots = true;
    Object.assign(n.player, { x: 2420, y: 326, vx: 0, vy: 0, grounded: true });
  });
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => window.__nova.audio.track)).toBe(1);
  expect(errors).toEqual([]);
});
