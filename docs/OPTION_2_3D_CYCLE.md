# Option 2: articulated code-built 3D and cycle mode

This implementation follows the user's final selection of option 2: code-built stylized 3D characters. It supersedes the earlier custom-GLB direction and the intervening sprite-only instruction. Characters now use actual volumetric geometry and hierarchical joints. This is a playable stylized prototype, not a sculpted reference-identical character asset. Existing approved art remains in menus and the old sprite source/assets are retained but are no longer the gameplay character renderer.

## Controls and behavior

- Characters present a right-facing side profile relative to the gameplay camera. Courier, Aunty, Uncle and replay ghost use the same articulated actor factory with distinct clothes/face/hair. Hips, knees, shoulders and elbows animate continuously with speed; head/clothing bob, torso lean, jump anticipation/stretch and landing squash are procedural.
- Slide blends from running to low crouch and back; its full geometry is tested below the existing 1.28-metre gate. The existing lower slide hitbox remains active. Dust, landing camera feedback, speed lines, music, existing effects and haptic preference are retained.
- A solo cycle section starts at 180 metres, then is eligible every 600 metres, provided the courier is grounded, not sliding/stumbling and no drone is active/approaching. Milestone drone offers have priority near a milestone. Cycling lasts 12 seconds; an airborne rider finishes landing before dismounting if time expires.
- Bike and rider are separate objects. Wheels rotate by distance/radius, cranks by distance, and leg/arm inverse-kinematic angles target pedals/handlebars. Grounded left/right still changes lane; up bunny-hops and down tucks.
- Ramps spawn ahead in the current lane; crossing a ramp raises the rider along its slope and launches at 14.5 m/s under 22 m/s² gravity. Missing a ramp does not launch. Tank clearance while riding requires sufficient height.
- In cycle air time: tap/up = backflip, down = frontflip, left = 360 spin, right = no-hands. One trick can run at a time. Each takes 0.52 seconds; tricks have smooth angular easing. Chained completed tricks build a multiplier up to 4x. A late unfinished trick can produce a bad landing.
- Upright landing with no unfinished trick awards 100 base style points plus completed trick points (100 × current combo per trick). Two tricks therefore award 400 total points. These are score points, not wallet coins. Bad landings discard pending points and dismount into a protected stumble.
- Paid/ad drones cannot activate during cycling, and cycling cannot start during a drone ride/approach. No paid pass is consumed by the cycle system. Verified friend races exclude cycling and preserve existing replay physics.

## Changed files — complete source in the accompanying ZIP

1. `src/game3d/cartoonActor.ts` — new courier/chaser factory, face/hair/clothes, joints, slide/run/flight/cycling poses and IK.
2. `src/game3d/cycleModel.ts` — new independent bicycle, wheels, cranks, pedals and sloped ramp geometry.
3. `src/game3d/simulation.ts` — cycle state, timers, ramp elevation/launch, gravity, trick inputs, combo/landing score, mode exclusions and snapshots.
4. `src/game3d/chaseEffects.ts` — replaces the chaser image plane with animated 3D Aunty/Uncle; fixes chaser placement toward screen interior.
5. `src/game3d/world.ts` — integrates actors, bike, ghost, airborne camera tracking, trick rotations and resource disposal.
6. `src/game3d/RunnerScene.tsx` — removes gameplay PNG texture loads and constructs the procedural world directly.
7. `src/screens/GameScreen.tsx` — cycle/trick input mapping, cycle HUD, perfect/fall messages, sound/haptic feedback.
8. `tools/preview3d.ts` — previews the same code-built world and exposes cycle controls to render tests.
9. `scripts/check-3d-render.cjs` — adds bike/rider rendering and budget assertions/screenshots.
10. `scripts/cycle.test.cjs` — eight cycle/actor tests, including late-trick failure, combo scoring, pause, determinism, reset and actual slide bounds.
11. `package.json` — adds `npm run test:cycle`.
12. `docs/REAL_3D_AND_CYCLE_BRIEF.md` — prior reviewable design brief, retained for context; this document records the selected implementation.
13. `docs/OPTION_2_3D_CYCLE.md` — current behavior, file list and validation.

## Validation and limits

Typecheck and 58 automated tests passed, including existing game, drone/economy, social/replay, chase, legacy sprite, audio and Metro tests plus eight new tests. WebGL render checks passed for actor jump, ghost, phone/tablet framing, low detail, birds, cycle and drone. Example counts: cycle scene 142 draw calls / 50,878 triangles; bird-flight scene 181 / 63,950, below the existing 320 / 70,000 limits. These are scene-budget checks, not measured 60 FPS on a Redmi.

The source ZIP contains complete changed files at their repository-relative paths. Extract over this existing project; it is not a standalone replacement for dependencies or unchanged assets. Build commands remain `npm install`, `npm run typecheck`, `npm run test:cycle`, `npm run test:render`, `npm run android:apk`. Native install/play, sound and device-specific frame-rate results should be reported separately from these browser/logic checks.

Final artifacts: `artifacts/RooftopRush-option2-source.zip`, `artifacts/RooftopRush-option2-3d-cycle.apk`, `artifacts/RooftopRush-option2-cycle.png`. Release build and API 33 minimum / API 36 target, embedded JavaScript, 44 ELF64 libraries with 16 KB alignment and ZIP alignment verification passed. This release has not been play-tested on a physical Redmi; its native animation/performance and sound remain unverified.
