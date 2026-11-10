# Reference character and steerable flight

The primitive courier is replaced with blue-hoodie reference artwork: spiky hair, expressive face, full navy pants, sneakers and delivery backpack. This is animated **2.5D artwork in the existing 3D world**, not a rigged 3D model. Dedicated poses cover running, jumping, low sliding, flying and idle. The slide crop preserves aspect and fits below gate clearance.

Left/right swipes now change lanes in flight. Takeoff preserves the current lane. Air coins alternate lanes in groups of six and require matching horizontal position and height. Jump/slide remain disabled while flying. Pause freezes flight and rejects input. Existing ad rewards, paid passes, cooldown, protection and landing rules remain intact. Verified friend races exclude drone flight.

## Changed files

- `src/assets/runner/blue-courier-atlas-v2.png`: active pose atlas.
- `src/game3d/spriteCourier.ts`: animation, billboard, pose alignment, wardrobe tint and cleanup. Preserves native EXGL URI upload flags on cloned textures.
- `src/game3d/RunnerScene.tsx`, `world.ts`: load artwork; animate runner and ghost. Procedural courier removed.
- `src/game3d/simulation.ts`: airborne steering and matching-lane coins.
- `src/game3d/droneModel.ts`: steering lean and carry bar.
- `src/screens/GameScreen.tsx`: airborne swipe instructions.
- `tools/preview3d.ts`, `scripts/preview-3d.cjs`: preview uses production atlas.
- `scripts/drone.test.cjs`, `scripts/reference-runner.test.cjs`, `scripts/check-3d-render.cjs`, `package.json`: steering, rewards, texture compatibility, slide bounds and rendered-pose checks.

## Validation

Typecheck and 35 game, drone, social and character tests passed. WebGL checks passed for movement, jumping, ghost, flight, phone/tablet framing and reduced detail. Running: 105 draw calls / 54,946 triangles; flight: 138 / 59,644. Actual scene screenshots: `artifacts/RooftopRush-reference-character.png`, `artifacts/RooftopRush-steerable-drone.png`. Physical Android visual, gesture and rewarded-ad verification remains pending.
