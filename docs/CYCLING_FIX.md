# Cycling presentation fix

This change is limited to cycling. The approved boy/girl artwork, HUD, drone presentation, scoring and swipe rules remain.

Changed files:

- `src/game3d/cyclePresentation.ts`: deform the existing seated artwork around its feet and visible hand, tying them to the crank and handlebar while anchoring the hips to the saddle. Head/backpack artwork stays stable; no generic 3D character replaces it.
- `src/game3d/referenceCourier.ts`: use that deformation only during cycling, reset it on exit, and follow the bike's pitch/yaw instead of incorrectly adding both angles to screen roll.
- `src/game3d/cycleModel.ts`: align the bike's view with the authored seated pose, keep both wheels distinguishable, match the handlebar position, keep pedal platforms level and share lane lean with the rider.
- `src/game3d/world.ts`: pass the existing lane lean to the cycle so rider and bicycle move together.
- `src/game3d/simulation.ts`: reduce only the crank cadence to a speed-linked gear ratio. Airborne/pause freezing, race timing, scoring and collision rules are unchanged.
- `scripts/{cycle,restored-courier}.test.cjs`, `scripts/check-3d-render.cjs`: verify deterministic cadence, stable identity, no accumulated paused rotation, and contact on the actual visible artwork during several pedal phases, flips and spins for both characters.

Validation: TypeScript, 24 focused gameplay/character/cycle checks and WebGL checks pass. Visible contact error in sampled poses: boy below 0.001 mm, girl below 2 mm. Cycle render sample: 72 draw calls / 50,082 triangles, inside the existing budget. This does not establish physical Android FPS.

Test on the phone: boy and girl cycling, each outfit, lane swipes, jump/pedaling stop, landing/resume, flips/spin, pause/resume and transition back to running. In a no-hands stunt, the authored hand intentionally releases its grip.

Test APK: `artifacts/RooftopRush-cycling-fix-2026-11-03.apk` (103,980,171 bytes). Release build and universal APK verification passed: ARMv7, ARM64, x86_64, complete native runtimes, bundled JS and 16 KB alignment. Android device gameplay has not been verified for this cycling patch; the emulator was no longer connected. This test build carries the existing Firebase startup guard and requires the manual project setup for online features.
