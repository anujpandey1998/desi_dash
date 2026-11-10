# Approved courier restored, face visible

The procedural courier introduced in option 2 is removed from the player and replay-ghost render paths. The approved blue hoodie, navy trousers, cream-blue shoes, swept black hair and expressive brown-eyed face are restored through reference-based artwork. Both eyes face the camera rather than a strict right-side profile. Existing menu artwork is untouched.

The depth treatment is softly shaded **2.5D artwork in the 3D rooftop world**, with contact shadow, bob/lean, animation and landing feedback. It is not a reference-matched sculpted or rigged 3D model, and should not be described as one. Chaser mechanics, cycle/ramp/trick rules, ads, wallet and friend replay logic were not changed by this visual restoration. The bicycle view now faces the camera to match the rider.

## Changed files

- `src/game3d/referenceCourier.ts`: new reference-art actor; eight front-run frames, crouch/slide/recovery, jump, drone and alternating cycling poses; palette tint, camera facing and disposal. Preserves EXGL's native texture upload marker.
- `src/assets/runner/blue-courier-front-v1.png`: generated transparent front-facing atlas, saved alongside existing art.
- `src/assets/runner/front-atlas-frames.json`, `scripts/prepare-front-atlas.cjs`: reproducible alpha-bound UV metadata. Explicit row boundaries prevent adjacent-row hair leaking into the jump frame. Pose crops preserve aspect; the slide stays below the gate height.
- `src/game3d/world.ts`, `RunnerScene.tsx`: load and use restored art for player/ghost, remove the forced 90-degree player turn, and align the drone carry bar with raised hands.
- `src/game3d/cycleModel.ts`: align bicycle heading with the visible-face rider view.
- `tools/preview3d.ts`, `scripts/preview-3d.cjs`, `scripts/check-3d-render.cjs`: use the same art in preview and assert approved identity/front-facing output.
- `scripts/restored-courier.test.cjs`: front-facing identity/native upload, eight run phases, atlas bleed, slide clearance and paused-cycle rotation checks.

## Art provenance and prompt

Built-in imagegen used `src/assets/mascot/blue-courier.png` as the identity reference. Prompt: preserve the exact approved face, giant brown eyes, swept spiky black hair, warm skin, blue zip hoodie, navy cargo pants and cream-blue sneakers; subtly dimensional cartoon lighting without replacing the character with a toy/robot. Transparent 4×4 atlas, all sixteen poses directly front-facing with both eyes visible and no side/rear view. Eight distinct run phases followed by crouch, low slide, stand recovery, jump, drone hang, two cycling poses and idle; uniform full-body size, gutters, no labels, props, ground shadows, glow or scenery. The native game uses deterministic alpha-bound crops because generated row spacing is not perfectly uniform.

## Validation

Typecheck, 61 tests and WebGL rendering checks passed. The actual scene preview is `artifacts/RooftopRush-approved-front-preview.png`; flight preview is `artifacts/RooftopRush-approved-front-drone.png`. Physical Redmi visual/gesture/performance verification remains pending. Prior option-2 APKs/previews are historical and do not show the restored courier.
