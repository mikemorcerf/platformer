import { test, expect } from '@playwright/test';

async function launch(page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
}
async function tick(page, seconds) {
  await page.evaluate(seconds => {
    for (let i = 0; i < Math.round(seconds * 120); i++) window.__nova.step(1 / 120);
    window.__nova.draw(0);
  }, seconds);
}

for (const direction of [-1, 1]) {
  test(`a standing dash goes ${direction < 0 ? 'left' : 'right'} without ending at the first ground collision`, async ({ page }) => {
    await launch(page);
    await page.evaluate(direction => { window.__nova.player.dir = direction; }, direction);
    const before = await page.evaluate(() => ({ ...window.__nova.player }));
    await page.keyboard.down('ShiftLeft');
    await tick(page, .1);
    const active = await page.evaluate(() => ({ ...window.__nova.player }));
    expect((active.x - before.x) * direction).toBeGreaterThan(80);
    expect(active.y).toBe(before.y);
    expect(active.grounded).toBe(true);
    expect(active.dashTime).toBeGreaterThan(0);
    expect(active.dashReady).toBe(false);
    await tick(page, 4 / 120);
    const finished = await page.evaluate(() => ({ ...window.__nova.player }));
    expect((finished.x - before.x) * direction).toBeGreaterThan(104);
    expect((finished.x - before.x) * direction).toBeLessThan(109);
    expect(finished.dashTime).toBe(0);
    expect(finished.dashReady).toBe(true);
    await tick(page, .2);
    expect(await page.evaluate(() => window.__nova.audio.effects.dash)).toBe(1);
  });
}

test('a grounded dash can be cut short, then used again with a fresh press', async ({ page }) => {
  await launch(page);
  await page.keyboard.down('ShiftLeft'); await tick(page, 5 / 120);
  const x = await page.evaluate(() => window.__nova.player.x);
  await page.keyboard.up('ShiftLeft');
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBe(0);
  await tick(page, .03);
  expect(await page.evaluate(() => window.__nova.player.x) - x).toBeLessThan(6);
  await page.keyboard.down('ShiftLeft'); await tick(page, .05);
  expect(await page.evaluate(() => window.__nova.player.dashTime)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__nova.audio.effects.dash)).toBe(2);
});

test('all 22 enemies have individual identities, silhouettes, palettes, and behavior', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await launch(page);
  const roster = await page.evaluate(() => ({
    creatures: window.__nova.world.flatMap(z => z.enemies).map(e => ({ name: e.name, species: e.species, motion: e.motion })),
    silhouettes: window.__nova.enemyTypes.map(d => d.art.join('/')),
    palettes: window.__nova.enemyTypes.map(d => d.colors.join(','))
  }));
  expect(roster.creatures).toHaveLength(22);
  for (const key of ['name', 'species', 'motion']) expect(new Set(roster.creatures.map(e => e[key])).size).toBe(22);
  expect(new Set(roster.silhouettes).size).toBe(22);
  expect(new Set(roster.palettes).size).toBe(22);
  // Render and advance every creature in its actual sector, with the player
  // nearby, so all sprite and AI paths are exercised.
  await page.evaluate(() => {
    const n = window.__nova;
    n.world.forEach((z, zone) => {
      n.game.zone = zone;
      for (const e of z.enemies) {
        Object.assign(n.player, { x: e.home, y: e.baseY - 60, vy: 0, vx: 0, invuln: 100 });
        for (let i = 0; i < 30; i++) n.step(1 / 120);
        n.draw(0);
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) throw Error('Invalid enemy coordinates: ' + e.name);
      }
    });
  });
  expect(errors).toEqual([]);
});
