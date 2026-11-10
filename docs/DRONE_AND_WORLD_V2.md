# Drone flight, rewarded coins and gameplay art — v2

## Features

These historical notes are superseded by [Reference character and steerable flight](REFERENCE_RUNNER_AND_STEERING.md): animated reference artwork, manual airborne lanes and matching-lane coin collection replace the procedural courier and autopilot.

- During a solo run, the new **Drone** HUD button or **Call a delivery drone** in Pause opens the flight panel. Movement remains swipe-only; the removed jump/slide/lane buttons are not restored.
- A completed rewarded ad grants one saved drone pass, or the player can buy a pass for **100 wallet coins**. Any saved pass can launch immediately when eligible.
- Flight lasts **8 seconds**, picks up smoothly even mid-jump, centers the courier on autopilot, carries them over rooftop bridges/obstacles and auto-collects the visible air-coin trail. Running physics and controls return on a smooth protected landing. A 24-second cooldown begins at activation.
- Home's optional rewarded ad grants **50 wallet coins**, with a three-minute coin-ad cooldown. Existing post-run double-coin ads remain available.
- An unavailable, failed or incomplete ad grants nothing. Only the SDK earned event produces a receipt. Recent receipts are deduplicated, and purchases/rewards share the existing serialized wallet queue. Saved passes and interrupted launch reservations survive app restarts.
- Friend races do not offer ad/paid flight; the server still replays only left/right/jump/slide inputs. Coin-ad wallet rewards do not alter friend physics/scores.

## Gameplay visuals

- `courierModel.ts`: articulated rounded hoodie/body, full cargo pants, sneakers/laces, sculpted swept hair, expressive eyes/face and layered courier backpack. Rush Blue replaces the old default Sunset color at the same free outfit index; paid outfit ownership/prices are unchanged.
- `terraceRoute.ts`: separate building terraces, parapets, facade windows and metal connecting bridges instead of the continuous tiled-road slab. Navigation/collision lanes are unchanged outside drone flight.
- `roofTexture.ts`, `assets/textures/`: generated concrete material packed into offline pixel data for synchronous Expo GL use. No DOM/canvas or runtime texture download required. `scripts/prepare-roof-texture.cjs` reproduces the packed asset.
- `droneModel.ts`: visible drone, rotor motion, lights and suspension hook; arrival beep uses the existing audio preference.
- `world.ts`: softer shadows, warmer pastel architecture, rounded building edges, closer lane-aware camera and a camera lift during drone flight. Decorative laundry moved to the side terraces, removing the obstructing brown panel in the middle of the scene.
- Android Nunito bold filename aliases added to prevent the thin system-font fallback.

The 3D courier is a new original procedural rig inspired by the approved illustration. It is not a photorealistic scan or a claim of exact image-to-3D reconstruction. Shared-world WebGL screenshots show the actual renderer/model, not image-generation mockups.

## Configuration and files

- Flight constants: `src/game3d/simulation.ts` (`DRONE`).
- Prices/ad coins/cooldown: `src/constants/economy.ts`.
- Persisted inventory/wallet operations: `src/services/droneService.ts`.
- SDK-earned receipts: `src/services/adService.ts`.
- UI: `GameScreen.tsx`, `MainMenuScreen.tsx`.
- Tests: `scripts/drone.test.cjs`, extended `scripts/check-3d-render.cjs`.

## Validation

- TypeScript compilation passed.
- Existing gameplay checks: 11 passed.
- New drone/economy/SDK event checks: 10 passed.
- Existing social/replay/reward checks: 10 passed.
- Normal WebGL scene: 132 draw calls, 62,246 triangles.
- Flight WebGL scene: 164 draw calls, 66,932 triangles, visible drone and earned air-coins. Both remain within the existing 320-call / 70k-triangle test budgets. These counts are scene checks, not physical-device FPS measurements.
- Native release/package results are recorded below after the final build. Earlier emulator System UI instability remains a limitation for physical/native visual verification.

Rewarded ad unit configuration is unchanged: without production environment IDs, this build uses Google test ads. No revenue or production ad serving is claimed. No external publishing was performed.

Final ARM32 / ARM64 / x86_64 Android release build succeeded. Final APK: `artifacts/RooftopRush-drone-rooftops.apk`. Package verification checks min/target SDK, embedded JS, native 16 KB ELF alignment and ZIP alignment. Final TypeScript compilation passed. The shared renderer's actual gameplay/flight and 3D courier front-view images are saved in `artifacts/RooftopRush-roofs-v2.png`, `artifacts/RooftopRush-drone-flight.png` and `artifacts/RooftopRush-courier-3d.png`.

The final APK includes the correction preventing the translucent replay ghost from casting an opaque shadow. Native physical-device gameplay/ad completion testing is still pending; the SDK earned-event tests are mocked, and the saved gameplay previews are WebGL renders of the shared scene. The prior emulator System UI instability was not presented as an app screenshot or a successful native smoke test.
