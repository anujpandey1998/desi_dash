# Chaser and air adventure

> Updated chase/ride/HUD behavior and device checklist: [Runner polish changelog](RUNNER_POLISH_CHANGELOG.md). The notes below describe the earlier implementation; the new 5–6 m Uncle chase and articulated cycle/drone rider supersede those sections.

## Solo gameplay

A seeded random Aunty or Uncle begins 18 metres behind. Unshielded collisions cause a short stumble and reduce the gap by 8 metres; clean running restores it slowly, up to 24 metres. Below 6 metres, a slow red edge pulse, original cartoon shout and Bhaago bubble warn the player. At 1.7 metres the chaser catches the courier; the scene plays a short caught celebration before showing results. Shields still absorb hits.

Danger and 500-metre deliveries can offer a free escape drone, with a 1.2-second incoming approach and auto-grab. These do not consume inventory or coins. Free offers have a 35-second cooldown and respect the existing drone cooldown. The rewarded-ad, saved-pass and 100-coin routes remain available and use the existing serialized transaction service.

Flights now last 10 seconds. Left/right changes lane; up/down changes height between 3.8 and 7.2 metres. Bird waves use a separate seeded RNG and a fixed pool of 18 pigeons/crows. Waves vary speed/height and may contain three birds. Hits require matching x, y and depth, consume one of three battery cells and grant brief hit immunity. Three hits trigger a protected emergency descent and restore the chase. A normal landing grants a 3-second 22% speed boost. Coins follow horizontal and vertical curves; visible and collectible positions use the same function.

Verified timed friend races retain their original fatal collision physics and exclude chasers/free drone escapes. The replay/server tests pass. Solo difficulty intentionally changes from instant death to accumulated chaser pressure.

## Presentation and audio

The approved blue-hoodie courier remains animated 2.5D artwork in a 3D world. A separate eight-frame run atlas plays at a speed proportional to running speed. Eased body transforms add head bob, takeoff crouch, airborne stretch, landing squash, stumble wobble and caught tilt; discrete artwork poses are still frame-based rather than a skeletal rig. Dust, speed lines, flapping birds, distant skyline parallax, camera impacts and incoming/failed drone motion are pooled or instanced. Jump, impacts and drone grab use the existing vibration preference. Original synthesized footsteps, cartoon shout, bird caw and looping drone buzz respect sound settings and pause flow; existing music and coin effects remain.

## Changed files

- `src/game3d/simulation.ts`: chase, encounters, altitude, bird collisions, boost, motion phase and events.
- `src/game3d/chaseEffects.ts`: chaser poses, pooled birds/dust, speed lines and far skyline.
- `src/game3d/world.ts`, `RunnerScene.tsx`, `spriteCourier.ts`: atlas loading, run animation, effects, camera and drone feedback.
- `src/screens/GameScreen.tsx`: warning, battery/controls, caught presentation, audio/haptics.
- `src/services/audioService.ts`, `scripts/compose-chase-sfx.cjs`, `src/assets/audio/{footstep,chaser-shout,bird-caw,drone-buzz}.wav`: original effects and cancellable buzz playback.
- `src/assets/runner/blue-courier-run8.png`, `chaser-atlas.png`: new art, generated with built-in imagegen; existing reference assets retained.
- `tools/preview3d.ts`, `scripts/preview-3d.cjs`, `scripts/check-3d-render.cjs`: production art in preview, bird/chaser render checks.
- `scripts/chase.test.cjs`, `reference-runner.test.cjs`, `drone.test.cjs`, `game-engine.test.cjs`, `package.json`: new solo rules and legacy friend collision coverage. Drone tests use the configured duration rather than the former eight seconds.

## Asset prompt set

Built-in imagegen was used, with the existing courier atlas as identity reference for the run sheet. Run prompt: a transparent exact 4-column, 2-row production atlas of eight consecutive contact/down/passing/up/opposite-contact/down/passing/up phases; same spiky-haired blue-hoodie boy, navy pants, cream-blue sneakers and teal backpack; rear three-quarter view, opposite arm swing, high knee lift, forward lean, consistent scale/baseline and generous gutters; no labels, scenery, shadows or glow. Chaser prompt: transparent exact 3-column, 2-row full-body front-facing atlas; top row funny expressive Aunty in orange-pink sari/teal blouse/hair bun, bottom row Uncle in purple tracksuit/grey hair/moustache; each row angry running with slipper/folded yellow umbrella, triumphant caught-you, and confused looking-up fist-shaking; bold outlines, vibrant family-friendly cartoon shading, consistent scale and generous gutters; no text or scenery.

## Checks and limits

Typecheck and 50 tests pass: 11 game, 11 drone/economy, 10 social, 9 chase, 4 character and 5 audio/resolution. WebGL checks include jump/ghost, phone/tablet framing, low detail, flying birds and chaser poses. The three-bird scene uses 143 draw calls and 60,754 triangles, below existing limits of 320 / 70,000. This is a rendering budget check, not a measured 60 FPS claim on a physical Redmi. Android device performance, feel and rewarded-ad behavior require physical-device validation.

Release APK: `artifacts/RooftopRush-chaser-air-adventure.apk`. Build, bundled-JS, native ELF64 16 KB and ZIP alignment checks passed. Installed and launched on the available Android emulator; the run advanced to 108 metres / 1,436 score, with Aunty warning and escape-drone approach visible. Screenshot: `artifacts/RooftopRush-chaser-native.png`. Emulator startup was slow, so this smoke check does not establish smooth Android frame rates or Redmi performance.
