# Approved update: back view, character choice, rooftops and supplied music

## What ships

- Boy and girl couriers are free choices in Customize. Choice persists in `rooftop.character.v1`, defaults safely to boy and is loaded before the run scene mounts. Home reflects the selected character when focused again. Existing wallet/outfit ownership is retained.
- The game uses back-view illustrated animation sheets: backpack and back of head face the camera, while the player runs toward the skyline. Front/side artwork is confined to the separate Customize viewer. The bicycle points toward the route rather than toward the camera.
- Customize provides a drag/button/accessibility-controlled **eight-angle 360-degree artwork viewer**. It is not a continuous orbit around a rigged 3D mesh. Approved illustrations preserve the intended character identity; gameplay remains 2.5D characters in the 3D rooftop scene.
- Aunty/Uncle use matching illustrated run sheets instead of the mismatched primitive 3D bodies. The generated sheet contains ten Aunty phases and six Uncle phases, cropped individually and played at speed-linked cadence. Both chase away from the camera. Chaser mechanics, birds, drone costs/rewards and cycle tricks are retained.
- Solo rooftop obstacle models now include one ribbed water tank with plumbing/plinth, outdoor AC/fan grille, solar rack, satellite dish/stand, PVC pipes, repair-material stack, skylight and clothesline. They are merged/shared meshes rather than repeated giant drum walls. Solo collision depth and jump clearance depend on the model. Verified timed friend races retain legacy collision geometry/behavior for replay compatibility.
- The board images were visual concepts; actual models are stylized game geometry inspired by them, not photoreal replicas. New models do not include the logos seen in the generated concept board.
- The user-supplied MP3 `be91c259-d1e9-44d8-985e-a988a8c74ba1.mp3` is copied intact to `src/assets/audio/rooftop-user-theme.mp3` and used as looping gameplay background music at the existing 0.3 volume. It follows sound mute, pause/background and resume. The earlier synthesized theme remains archived; it is no longer the selected music source. No claim of authorship or copyright clearance is made for the supplied recording.
- Broken cycle/drone instruction glyphs are replaced with plain readable text. The drone button is disabled/labeled during cycling rather than accepting a no-op tap.

## Changed files

### Character art and persistence

- `src/game3d/profile.ts`: character IDs, free choices, durable load/save.
- `src/game3d/characterArt.ts`: explicit Metro asset registry and crop metadata.
- `src/game3d/referenceCourier.ts`: boy/girl back sheets, back-only identity flags and hoodie-only recolor threshold.
- `src/game3d/chaserSprite.ts`, `chaseEffects.ts`: matching sprite run cycles and retained pooled effects.
- `src/game3d/RunnerScene.tsx`, `world.ts`: load selected assets and build the selected scene.
- `src/assets/runner/{blue-courier-back-v1,girl-courier-back-v1,courier-turntable-v1,girl-turntable-v1,matching-chasers-run-v1}.png` and the five `*-frames.json` files.
- `scripts/prepare-character-atlases.cjs`: alpha-bound metadata, including measured row boundaries and the irregular chaser-sheet layout.

### UI, world and audio

- `src/components/CharacterViewer.tsx`, `CharacterPortrait.tsx`, `BrandMascot.tsx`: viewer, angle crops and selected girl on Home.
- `src/screens/CustomizeScreen.tsx`, `MainMenuScreen.tsx`, `GameScreen.tsx`: selection, focus refresh, selected run, readable HUD and cycle/drone eligibility.
- `src/game3d/rooftopObstacles.ts`, `world.ts`, `simulation.ts`: eight merged models, solo variants and model-sized collision bounds. Friend replay semantics retained.
- `src/game3d/cycleModel.ts`: forward route heading.
- `src/services/audioService.ts`, `src/assets/audio/rooftop-user-theme.mp3`: requested music source.
- `tools/preview3d.ts`, `scripts/preview-3d.cjs`, `check-3d-render.cjs`: both playable characters and matching chasers in the actual scene preview.
- `scripts/{character-selection,chaser-art,roof-obstacles,restored-courier,audio-lifecycle}.test.cjs`: selection/wallet protection, compact object collisions/clearance, back-only poses and supplied music lifecycle.

## Art references and generation

Built-in imagegen used the approved blue-hoodie courier and matching character-design preview as identity/style references. The production prompt set requested: (1) strict direct-back 4x4 boy animation, (2) matching direct-back ponytail girl animation, each with eight run phases, crouch/slide/recover, jump, drone hang, two cycling poses and idle; (3) eight equally spaced standing turntable views per courier; (4) Aunty/Uncle rear-running phases in the same outlined softly dimensional style. Transparent outputs, full figures and no face/head turn in gameplay sheets were requested. Individually measured crop metadata handles generated sheet spacing. No rejected grid-lined atlas is used.

Review-only images: `src/assets/art-direction/matching-chasers-v1.png`, `girl-courier-preview-v1.png`, `artifacts/review-gameplay-back-view.png`, `review-customize-360.png`, `rooftop-obstacle-choices.png`. These are generated concept mockups, not native screenshots. Actual scene previews come from the render test.

## Validation and remaining limits

Typecheck and 67 automated tests passed across engine, drone/wallet/ads, social/replay, chase, cycle, character, music lifecycle and resolution. Render checks passed for both back-view characters, chaser artwork, jump, ghosts, low detail, phone/tablet framing, cycling, drone and birds. Example scenes: ground jump 55 draw calls / 49,730 triangles; bird-flight 81 / 53,794, below the existing 320 / 70,000 limits. These figures are not a physical Redmi 60 FPS benchmark.

Build/APK and native smoke-check results are recorded after packaging. Production advertising IDs, real rewarded-ad inventory, backend deployment and store publication are not established by local render tests. Physical Redmi testing is still needed for frame rate, sound balance and touch feel.

The source archive contains complete changed files at repository-relative paths, including runtime art, crop metadata and the supplied music. Extract it over this existing project; it is not a standalone replacement for unchanged Android configuration, dependencies or older assets.

## Cycling stability, matching scale and courier names (30 October 2026)
- `src/game3d/referenceCourier.ts`: keep the seated bicycle artwork steady instead of alternating mirrored full-body poses at speed. Wheel/pedal motion and stunt rotation remain active.
- `src/game3d/world.ts`: cycling rider remains visible during collision protection; suppress walking bob while seated.
- `src/game3d/chaserSprite.ts`, `chaseEffects.ts`: normalize both chaser silhouettes to 2.75 world units and remove extra distance-based shrinking. Camera perspective still applies naturally.
- `src/game3d/profile.ts`: locally saved courier name, whitespace normalization, 20 Unicode-codepoint limit and empty-name rejection. No wallet changes.
- `src/screens/CustomizeScreen.tsx`, `MainMenuScreen.tsx`, `GameScreen.tsx`: name editor/save feedback, saved name on Home and game HUD.
- Regression coverage: `scripts/restored-courier.test.cjs`, `chaser-art.test.cjs`, `character-selection.test.cjs`, `check-3d-render.cjs`.
- Username/password login deferred at the user's request; secure online authentication needs a backend/auth service. No password storage was added.
- TypeScript check and 64 targeted tests pass. WebGL render check covers boy/girl, cycle, drone and chasers. This update has not been tested on a physical Redmi phone.
