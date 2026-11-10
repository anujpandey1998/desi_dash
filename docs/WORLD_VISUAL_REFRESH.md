# Gameplay world visual refresh

User direction: improve the actual courier, rooftop neighborhood, homes and obstacles toward a believable real-world feel. This extends the earlier home-screen UI checkpoint.

## Changed files

- `src/game3d/surfaces.ts`: deterministic offline concrete, plaster, brick, fabric and tank textures, compatible with Expo GL without canvas or network downloads.
- `src/game3d/cityDetails.ts`: instanced balconies, railings, AC units, drainpipes, roof stair rooms, parapets, dishes and distant skyline. Extra details turn off in Low graphics mode.
- `src/game3d/world.ts`: textured rooftops and walls, rounded courier anatomy, fabric outfit/backpack, cap and sneakers; ribbed water tanks and better barrier/gate details; warm daylight, atmospheric haze, procedural clouds and directional shadows. Static obstacle parts are batched by material. New scenery stays outside the playable lanes. Existing obstacle dimensions and collision rules are preserved.
- `src/game3d/RunnerScene.tsx`: lower, aspect-aware camera and shared renderer lighting/shadow configuration.
- `tools/preview3d.ts`: preview uses the same lighting and shadow setup as Android.

This is an original procedural 3D art upgrade, not a photorealistic scanned-asset conversion. No changes to simulation, login, ads, rewards or wallet storage.

## Validation

The WebGL regression checks shaders, lane movement, animated jumping, ghost pose and rendering budgets. Native Android builds and final screenshots are recorded after verification.

Latest checks passed:
- TypeScript compilation.
- 11 deterministic gameplay regression checks.
- WebGL shader rendering, movement/jump and ghost pose; 126 draw calls / 49,274 triangles in the checked scene.
- Courier framing at 320/844, 390/844 and 800/1280 aspect ratios, on both outer lanes.
- Low quality reduces draw calls and disables shadow maps.
- Earlier social/reward regression suite: 10 checks passed; service implementations remain unchanged.

Android x86_64 release launched and rendered the updated world and tutorial. Native inspection identified narrow-camera framing and cloud precision issues; both were corrected for the final build. A physical-phone FPS benchmark has not been performed.

Visual preview: `artifacts/RooftopRush-world-preview.png` (shared world rendered in WebGL).
Final package: `artifacts/RooftopRush-world-refresh.apk` (ARM32, ARM64 and x86_64).


Final ARM32/ARM64/x86_64 release build completed successfully. Package structural verification was run against `artifacts/RooftopRush-world-refresh.apk`.

## Superseding character art direction

The user subsequently requested a cuter semi-realistic 3D cartoon direction with large expressive eyes, an orange hoodie and delivery backpack, combining approachable mascot expression with an urban runner aesthetic. The generated concept sheet is saved at `src/assets/art-direction/courier-character-sheet-v1.png`. It contains front/side references and happy, sad, excited, surprised, sleepy and angry expression portraits. This is a raster concept/reference asset, not an animated 3D model; the current procedural in-game mesh has not been converted to this new design. The packaged world refresh predates integration of that art direction.
