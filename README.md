# Captain Nova — The Lost Relics

**[Play Captain Nova in your browser](https://mikemorcerf.github.io/platformer/)**

Stranded on Kepler-9, Captain Nova has one mission: recover three ancient relics
and make it back to the stars. Explore a strange alien coast, unlock forgotten
ruins, and climb an enormous citadel in this retro side-scrolling adventure.

An original homage to early PC platformers like **Captain Comic**, with original
pixel art, a light-purple world, and a synthesized chiptune soundtrack. Free to
play in a modern browser, with keyboard and touchscreen controls.

## The adventure

- **Three connected regions:** the Verdant Coast, Hollow Ruins, and Amber Citadel.
- **Three lost relics:** the Star Crystal, Solar Chalice, and Moon Crown.
- **Upgradeable firepower:** blaster upgrades add extra bullets and matching super
  shots. Charge your weapon for powerful projectiles that pierce enemies.
- **A rechargeable jetpack:** take to the skies, release to recover fuel, and
  instantly re-engage while falling after activating it in that flight.
- **Short, controllable air dashes:** escape danger or stretch a jump. Release the
  dash key to cut it short.
- **Tall worlds to explore:** each region spans over 2,000 vertical pixels, with
  optional sky ruins and a bonus cache over 1,400 pixels above the main route.
- **A retro soundscape:** original music for each region and sound effects for
  movement, combat, upgrades, and discoveries.

## Controls

Click **START GAME** or press **Enter**. The intro displays the controls as
keyboard keys; the game fills the window in landscape or portrait.

| Action | Keyboard |
| --- | --- |
| Move | Left / Right arrows or A / D |
| Jump | Up arrow or W; hold for a higher jump |
| Jetpack | Hold Up or W for one second to activate |
| Air dash | Hold **Shift** while airborne; release to stop early |
| Shoot | **Space** |
| Charge a super shot | Hold Space for 1.1 seconds, then release |
| Use portal / extract | E or Enter near a portal |
| Pause / resume | Escape or P |
| Music and sound | M |
| Full screen | F |

On touchscreens, use the on-screen movement, **DASH**, **FIRE**, and jump controls.
Hold jump to activate the jetpack; hold and release **FIRE** for a super shot.

### Flight and combat

The jetpack starts with **100 fuel**, consumes **30 fuel per second**, and
recharges at **22 per second** while idle. After activating it, press Up again
while falling to immediately resume thrust without another one-second wait.
Landing resets the activation delay. An empty pack needs a fresh press after
refuelling.

Dashes travel up to roughly **106 pixels**, one-third of the original range.
They stop on release or after **0.127 seconds**, even if you keep holding Shift.
Each landing restores the dash. Walls and locked gates still block it; extra
jumps and double direction taps do not trigger it.

Blaster levels **1, 2, and 3** fire **one, two, and three** projectiles for both
normal and charged shots, with matching spreads. Each super-shot projectile deals
six damage and can pierce three enemies. Pausing cancels an unfinished charge.

## Find your way home

Recover each region's relic before entering its eastern portal. Find the jump
boots on the coast, then use the ruin key to open the sealed gate in the Hollow
Ruins. With all three relics, reach the extraction beacon at the eastern end of
the citadel and press **E** to finish the expedition.

Western portals let you revisit earlier regions. Lavender flags are checkpoints;
medical supplies restore two shield points. Shiny red, glowing spikes mark
hazardous ground. Falling or losing your shield costs a life and recalls you to
your checkpoint, keeping your relics and upgrades. Sky caches restore your shield,
give a bonus life, and award 1,500 points.

## Run locally or offline

Open **`index.html`** directly in a modern browser. The whole game is contained in
that file, including its pixel font. Art and audio are generated locally, so it
works offline with no installation or build step.

To serve it with Node.js 20 or newer:

```sh
npm start
```

The development server listens on port **3000**; set `PORT` to change it.

## Automatic GitHub Pages updates

The [Publish Captain Nova workflow](../../actions/workflows/pages.yml) runs on
pushes to **`main`** and can also be started manually from the Actions tab. It
installs dependencies, runs the browser tests, packages only the standalone game,
and deploys it to **https://mikemorcerf.github.io/platformer/**. Failed tests stop
deployment.

For the initial repository setup, select **GitHub Actions** as the source under
**Settings → Pages**. The workflow uses GitHub's built-in deployment token; no
custom deployment key or personal access token is needed. Once enabled, merging
or pushing changes to `main` updates the public game automatically.

## Development

The game uses Canvas, fixed-step physics, and Web Audio. There are no external
runtime assets or dependencies. Playwright supplies the browser tests:

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Local tests can use `/usr/bin/chromium` or a browser specified by `CHROMIUM_PATH`.
CI uses Playwright's installed browser. Tests cover a complete expedition, the
sky climb, controls, fuel, charged shots, dash timing, collisions, sound, and
responsive layouts. Test helpers are exposed only when the URL has `?test=1`.

Released under the [MIT License](LICENSE).
