# Captain Nova — The Lost Relics

A full-window browser platformer inspired by the exploration, blaster combat,
and item progression of early PC games like Captain Comic. Original characters,
pixel art, scenery, sound effects, and three connected levels. Each sector spans
over 2,000 pixels vertically, with optional sky ruins rising 1,400 pixels above
the main route. No game assets or runtime dependencies need to be downloaded.

## Play

**Open `index.html` in a modern browser.** It is a standalone file and also works
offline. Click the pixel-lettered **START GAME** text or press **Enter**. The game fills the entire browser
window in both landscape and portrait; there is no surrounding dashboard. The
camera follows horizontally and vertically, keeping the art in proportion as
the window resizes. The intro shows the controls as keyboard keycaps. Light
purple scenery and effects replace the earlier green tint. Only essential stats
appear over the game, including jetpack fuel and shot charge.

To serve it locally with Node.js 20 or newer:

```sh
npm start
```

The server listens on port **3000** (override with `PORT`). No installation or
build step is required to play. Touch controls appear on touchscreen devices.

| Action | Keys |
| --- | --- |
| Move | Left / Right or A / D |
| Jump | Up or W; hold for a higher jump |
| Air dash | Hold Tab in midair; release to cancel; recharges on landing |
| Jetpack | Hold Up or W for one second; release to stop and recharge |
| Fire | Space |
| Super shot | Hold Space until charged, then release |
| Use portal / extract | E or Enter near a portal |
| Pause / resume | Escape or P |
| Toggle sound | M |
| Full screen | F |

Collect each sector's relic before using its eastern portal. Get the jump boots
in the Verdant Coast to reach the highest ledges, find the key to unseal the
Hollow Ruins, and recover the crown in the Amber Citadel. With all three relics,
use the extraction beacon at the far east of the citadel to win. Western portals
let you return to earlier regions. Once you have the boots, follow the alternating
sky ledges above the eastern ridges. A cache at the top grants a bonus life,
restores your shield, and awards 1,500 points.

Lavender flags are checkpoints. Damage briefly makes you invulnerable; medical
supplies restore two shield points. Falling or losing your shield costs a life
and recalls you to your last flag, keeping collected relics and upgrades. The
expedition ends when all three lives are lost. Pausing or leaving the tab stops
gameplay. Hold **Tab** while airborne to dash up to roughly 106 pixels in your
facing direction (or the direction you are holding), one-third of the original
range. Releasing Tab interrupts the dash immediately; holding it never extends
its 0.127-second limit. Gravity pauses during the dash, but solid walls and
locked gates still stop you. One charge is available per landing. Extra jumps
and double direction taps do not trigger a dash. Touchscreens have a dedicated
**DASH** control.

Hold **Up** or **W** for over one second to ignite the jetpack. It consumes 30
fuel points per second from a 100-point tank. When not thrusting, it recharges
at 22 points per second. If it runs empty, release and hold again to restart
after refuelling. Holding the touch jump control also engages the jetpack.

**Space** fires a normal shot on press. Hold it for 1.1 seconds to charge a
super shot, then release to fire. Blaster upgrades apply to charged shots too:
levels 1, 2, and 3 fire one, two, and three super shots in the same spread as
normal fire. Each larger glowing projectile deals six damage and can pierce
three enemies. Short holds don't produce super shots;
pausing cancels charge. X and J no longer fire. Touchscreens support holding
and releasing **FIRE** to charge too.

Spikes have shiny red tips and a soft red glow to distinguish them from the
purple terrain.

Music and sound effects start automatically with **START GAME**. Each region has
an original looping chiptune, with synthesized drums, bass, harmony, and melody.
Movement, jumping, landing, dashing, weapons, impacts, damage, pickups, gates,
checkpoints, menus, defeat, and victory all have effects. Press **M** to mute or
unmute everything. Music pauses with the game. Sound and full-screen buttons are
also available in the pause menu. On touchscreens, controls float over the bottom
of the playfield. All music, effects, and the original 5×7 pixel font are embedded
or generated locally; the game still works offline as a single HTML file.

## Development and validation

The game is intentionally self-contained: HTML, CSS, Canvas rendering, a fixed
120 Hz physics loop, and synthesized Web Audio all live in `index.html`.
`server.mjs` is a small development server; it never sends project files other
than the game. No build step or secrets are needed.

```sh
npm ci --cache /tmp/nova-npm-cache
npm test
```

Tests use Playwright and the installed Chromium at `/usr/bin/chromium` when
available. Set `CHROMIUM_PATH` for another executable, or install Playwright's
browser with `npx playwright install chromium`. The test server uses port 3100.
Browser tests cover keyboard and touch input, jumping, combat, health,
checkpoints, upgrades, locked gates, sector transitions, victory, restart, and
standalone document playback with network access blocked, a complete keyboard
playthrough, the full sky climb, and viewport resizing without stretching or
scrollbars, capped dash distance, early release, wall collisions, the Tab binding,
jetpack activation/fuel/recharge, charged-shot timing and damage, embedded pixel
text, actual audio output, soundtrack changes, and pause/mute behavior.
Deterministic test access is only enabled by `?test=1`.
