import { test, expect } from '@playwright/test';

// A complete playthrough: only keyboard events and elapsed simulation time.
// No teleportation, invulnerability, inventory edits, or skipped collisions.
test('the entire expedition is winnable through normal movement and combat', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?test=1');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'START GAME' }).click();
  const route = [
    ['go',250], ['jump',320], ['go',380], ['jump',490], ['go',525],
    ['go',640], ['jump',780], ['jump',855], ['go',930], ['jump',1040],
    ['go',1080], ['go',1398], ['jump',1545], ['go',1600], ['jump',1700],
    ['go',1767], ['jump',1885], ['go',1905], ['go',1970], ['jump',2140],
    ['go',2395], ['exit'],
    ['go',510], ['jump',650], ['jump',720], ['go',785], ['jump',900],
    ['go',940], ['go',1010], ['jump',1170], ['go',1180], ['go',1210],
    ['jump',1420], ['go',1750], ['jump',1860], ['go',1940], ['jump',2070],
    ['go',2110], ['go',2395], ['exit'],
    ['go',250], ['jump',320], ['go',390], ['jump',530], ['go',580],
    ['jump',780], ['jump',850], ['go',905], ['jump',1050], ['go',1125],
    ['jump',1250], ['go',1280], ['jump',1510], ['go',1605], ['jump',1725],
    ['go',1810], ['jump',1955], ['go',1985], ['go',2040], ['jump',2220],
    ['go',2535], ['exit']
  ];
  for (const [kind, x] of route) {
    const result = await page.evaluate(({ kind, x }) => {
      const n = window.__nova;
      const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      let shotTime = 0;
      const tick = seconds => { for (let i = 0; i < Math.round(seconds * 120); i++) {
        shotTime += 1 / 120;
        if (shotTime >= .3) { key('Space', false); key('Space', true); shotTime = 0; }
        n.step(1 / 120);
      } };
      key('Space', true);
      if (kind === 'exit') {
        key('KeyE', true); tick(.7); key('KeyE', false);
      } else {
        const dir = x > n.player.x ? 'ArrowRight' : 'ArrowLeft';
        key(dir, true);
        if (kind === 'jump') key('KeyW', true);
        let stopped = false;
        for (let i = 0; i < (kind === 'go' ? 700 : 150); i++) {
          tick(.025);
          if (kind === 'jump' && i === 22) key('KeyW', false);
          const reached = dir === 'ArrowRight' ? n.player.x >= x : n.player.x <= x;
          if (reached && !stopped) {
            key(dir, false); stopped = true;
            if (kind === 'go') break;
          }
          if (kind === 'jump' && n.player.grounded && i > 4) break;
          if (n.game.mode !== 'playing') break;
        }
        key(dir, false); key('KeyW', false); tick(kind === 'go' ? .5 : .15);
      }
      n.draw(0);
      return { lives: n.game.lives, mode: n.game.mode, zone: n.game.zone, x: n.player.x };
    }, { kind, x });
    expect(result.lives, `Sector ${result.zone + 1}: ${kind} ${x || ''} at ${result.x}`).toBe(3);
    expect(['playing', 'won']).toContain(result.mode);
  }
  const final = await page.evaluate(() => ({ ...window.__nova.game }));
  expect(final.mode).toBe('won');
  expect(final.relics).toEqual([true, true, true]);
  expect(final.boots).toBe(true);
  expect(final.key).toBe(true);
  expect(final.weapon).toBe(3);
  await expect(page.getByText('MISSION COMPLETE', { exact: true })).toBeVisible();
});
