import { test, expect } from '@playwright/test';

test('the game fills the whole viewport in desktop, tall portrait, and landscape layouts', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: 'START GAME', exact: true })).toBeVisible();
  expect(await page.locator('header, aside, footer, .hud, .console').count()).toBe(0);
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 1200 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => page.evaluate(() => {
      const r = document.querySelector('canvas').getBoundingClientRect();
      const v = window.__nova.view;
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        proportional: Math.abs(v.width / v.height - r.width / r.height) < .005
      };
    })).toEqual({ x: 0, y: 0, ...size, overflow: false, proportional: true });
  }
  await expect(page.locator('#overlay')).toBeHidden();
  expect(await page.evaluate(() => window.__nova.game.lives)).toBe(3);
});

test('the sky ruins can be climbed over 1,400 pixels and the vertical camera follows', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME', exact: true }).click();
  // Start at the boot pickup. From there, use only keyboard input and normal
  // collisions to traverse all 18 ledges; no positions or upgrades are edited.
  await page.evaluate(() => {
    const boots = window.__nova.world[0].items.find(it => it.type === 'boots');
    Object.assign(window.__nova.player, { x: boots.x, y: 215, vx: 0, vy: 0 });
    window.__nova.step(1 / 120);
  });
  expect(await page.evaluate(() => window.__nova.game.boots)).toBe(true);
  const initialCamera = await page.evaluate(() => window.__nova.view.y);
  for (let level = 1; level <= 18; level++) {
    const landed = await page.evaluate(level => {
      const n = window.__nova;
      const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      const tick = seconds => { for (let i = 0; i < Math.round(seconds * 120); i++) n.step(1 / 120); };
      const moveTo = target => {
        const dir = target > n.player.x ? 'ArrowRight' : 'ArrowLeft';
        key(dir, true);
        for (let i = 0; i < 200; i++) {
          tick(.025);
          if (dir === 'ArrowRight' ? n.player.x >= target : n.player.x <= target) break;
        }
        key(dir, false); tick(.2);
      };
      const previousX = 1845 + ((level - 1) % 2 ? 175 : 0);
      const nextX = 1845 + (level % 2 ? 175 : 0);
      const right = nextX > previousX;
      moveTo(previousX + (right ? 125 : 5));
      const target = nextX + (right ? 45 : 105);
      const dir = right ? 'ArrowRight' : 'ArrowLeft';
      key(dir, true); key('KeyW', true);
      let stopped = false;
      for (let i = 0; i < 100; i++) {
        tick(.025);
        if (i === 22) key('KeyW', false);
        if (!stopped && (right ? n.player.x >= target : n.player.x <= target)) { key(dir, false); stopped = true; }
        if (n.player.grounded && i > 4) break;
      }
      key(dir, false); key('KeyW', false); tick(.2);
      if (level === 18) moveTo(nextX + 65);
      n.draw(0);
      return {
        foot: n.player.y + n.player.h, onGround: n.player.grounded,
        viewY: n.view.y, playerInView: n.player.y - n.view.y > 0 && n.player.y + n.player.h - n.view.y < n.view.height,
        lives: n.game.lives, cacheTaken: n.world[0].items.find(it => it.type === 'cache').taken
      };
    }, level);
    expect(landed.foot, `Sky ledge ${level}`).toBeCloseTo(249 - level * 78, 0);
    expect(landed.onGround).toBe(true);
    expect(landed.playerInView).toBe(true);
    if (level === 18) {
      expect(initialCamera - landed.viewY).toBeGreaterThan(1000);
      expect(landed.lives).toBe(4);
      expect(landed.cacheTaken).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
