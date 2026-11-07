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
const player = page => page.evaluate(() => ({ ...window.__nova.player }));

test('holding Up for one second starts a jetpack, consumes fuel, and releasing recharges it', async ({ page }) => {
  await launch(page);
  await page.keyboard.down('ArrowUp');
  await tick(page, .99);
  expect((await player(page)).jetActive).toBe(false);
  expect((await player(page)).jetFuel).toBe(100);
  await tick(page, .05);
  const ignited = await player(page);
  expect(ignited.jetActive).toBe(true);
  expect(ignited.jetFuel).toBeLessThan(100);
  await tick(page, .6);
  const flying = await player(page);
  expect(flying.y).toBeLessThan(ignited.y - 60);
  expect(ignited.jetFuel - flying.jetFuel).toBeGreaterThan(17);
  expect(ignited.jetFuel - flying.jetFuel).toBeLessThan(19);
  await page.keyboard.up('ArrowUp');
  expect((await player(page)).jetActive).toBe(false);
  await tick(page, .5);
  expect((await player(page)).jetFuel).toBeGreaterThan(flying.jetFuel + 10);
  expect((await player(page)).jetFuel).toBeLessThanOrEqual(100);
  expect(await page.evaluate(() => window.__nova.audio.effects.jetStart)).toBe(1);
});

test('an empty jetpack stops and requires a fresh hold instead of flickering back on', async ({ page }) => {
  await launch(page);
  await page.keyboard.down('ArrowUp');
  await tick(page, 4.5);
  const empty = await player(page);
  expect(empty.jetLocked).toBe(true);
  expect(empty.jetActive).toBe(false);
  expect(empty.jetFuel).toBeGreaterThanOrEqual(0);
  expect(empty.jetFuel).toBeLessThan(6);
  await tick(page, .6);
  expect((await player(page)).jetActive).toBe(false);
  expect((await player(page)).jetFuel).toBeGreaterThan(empty.jetFuel);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowUp');
  await tick(page, 1.05);
  expect((await player(page)).jetActive).toBe(true);
  expect((await player(page)).jetFuel).toBeGreaterThan(0);
});

test('Space fires and charges a powerful piercing shot on release; X and J no longer fire', async ({ page }) => {
  await launch(page);
  await page.keyboard.press('KeyX'); await page.keyboard.press('KeyJ');
  await tick(page, .1);
  expect(await page.evaluate(() => window.__nova.bullets.length)).toBe(0);
  await page.keyboard.down('Space');
  await tick(page, .1);
  expect((await player(page)).y).toBe(326);
  expect(await page.evaluate(() => window.__nova.bullets.filter(b => !b.charged).length)).toBe(1);
  await tick(page, 1.1);
  expect((await player(page)).charge).toBe(1);
  expect(await page.evaluate(() => window.__nova.bullets.some(b => b.charged))).toBe(false);
  await page.keyboard.up('Space');
  const shot = await page.evaluate(() => window.__nova.bullets.find(b => b.charged));
  expect(shot.damage).toBe(6);
  expect(shot.pierce).toBe(3);
  expect(shot.w).toBeGreaterThan(20);
  expect((await player(page)).charge).toBe(0);
  await tick(page, .65);
  expect(await page.evaluate(() => window.__nova.world[0].enemies[0].alive)).toBe(false);
  expect(await page.evaluate(() => window.__nova.audio.effects.superShot)).toBe(1);
});

for (const level of [1, 2, 3]) {
  test(`level ${level} upgrades normal and charged shot counts equally in both directions`, async ({ page }) => {
    await launch(page);
    await page.evaluate(level => { window.__nova.game.weapon = level; }, level);
    for (const direction of [-1, 1]) {
      await page.evaluate(direction => { window.__nova.player.dir = direction; }, direction);
      await page.keyboard.down('Space'); await tick(page, .02);
      const normal = await page.evaluate(() => window.__nova.bullets.filter(b => !b.charged).map(b => ({ vx: b.vx, vy: b.vy })));
      expect(normal).toHaveLength(level);
      await tick(page, 1.12);
      await page.keyboard.up('Space');
      const charged = await page.evaluate(() => window.__nova.bullets.filter(b => b.charged).map(b => ({ vx: b.vx, vy: b.vy, damage: b.damage, pierce: b.pierce })));
      expect(charged).toHaveLength(level);
      charged.forEach((shot, i) => {
        expect(Math.sign(shot.vx)).toBe(direction);
        expect(shot.vy / shot.vx).toBeCloseTo(normal[i].vy / normal[i].vx, 6);
        expect(shot.damage).toBe(6);
        expect(shot.pierce).toBe(3);
      });
      await tick(page, 1.7);
    }
  });
}

test('early release and pausing discard unfinished shot charge', async ({ page }) => {
  await launch(page);
  await page.keyboard.down('Space'); await tick(page, .4); await page.keyboard.up('Space');
  expect((await player(page)).charge).toBe(0);
  expect(await page.evaluate(() => window.__nova.bullets.some(b => b.charged))).toBe(false);
  await page.keyboard.down('Space'); await tick(page, .8);
  expect((await player(page)).charge).toBeGreaterThan(.7);
  await page.keyboard.press('Escape');
  expect((await player(page)).charge).toBe(0);
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__nova.bullets.some(b => b.charged))).toBe(false);
});

test('only Tab triggers an air dash; extra jumps and repeated direction taps do not', async ({ page }) => {
  await launch(page);
  await page.keyboard.down('KeyW'); await tick(page, .15); await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await tick(page, .03);
  expect((await player(page)).dashTime).toBe(0);
  expect((await player(page)).dashReady).toBe(true);
  await page.keyboard.down('Tab'); await tick(page, .05);
  expect((await player(page)).dashTime).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('game');
  await page.keyboard.up('Tab');
  expect((await player(page)).dashTime).toBe(0);
});
