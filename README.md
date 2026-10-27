# Neon Dash 3D

An original third-person, three-lane rail runner for Android 13+. The game uses actual 3D meshes, perspective camera, lighting and depth through Three.js / React Three Fiber / native Expo GL. It replaces the earlier 2D side-scrolling game.

## Game

- Animated human runner with a hoodie, backpack and articulated arms/legs.
- Three railway lanes, city buildings, foliage, overhead structures and trains.
- Swipe left/right to dodge, up or tap to jump barriers, down to slide under red gates.
- On-screen controls provide the same actions without swipe gestures.
- Collect coins and blue shields. A shield absorbs one collision with brief recovery time.
- Fixed-step physics, increasing speed, 500 m checkpoints, pause/resume and automatic background pause.
- Persistent best score, coin wallet, three hoodie colors and optional HUD profile photo.
- Portrait presentation, responsive landscape fallback, redesigned menu/HUD/results and sound/vibration settings.

The scene is original stylized 3D, not photorealistic art or a copy of Subway Surfers assets. Geometry is shared and scenery/coins/windows are instanced to limit rendering overhead. Rendering and simulation tests do not replace performance testing on physical phones.

## Windows setup

Install Node.js, Android Studio, Android SDK and JDK 21+. Set `ANDROID_HOME` to your SDK folder. The build helper uses Android Studio's bundled JDK when available.

```powershell
cd "D:\Desi Dash"
npm ci
npm run typecheck
npm test
npm run doctor
```

Use npm and `package-lock.json`. The native Android folder is checked in and is the build source of truth. Doctor's automatic configuration sync warning is intentionally disabled; after changing `app.json`, apply changes with `npm run android:sync`. EAS builds also consume this checked-in native configuration.

## Build / install

```powershell
npm run android:apk
npm run android:verify
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.anujpandey.neondash/.MainActivity
```

The phone APK contains ARM32 + ARM64 libraries, targets API 36 and requires API 33 (Android 13). It embeds game code and audio: Expo Go, Metro and an internet connection are not needed to play. Version 0.2.1 / code 3 upgrades the previous app and keeps local progress.

Local release APKs use the generated debug key for internal testing. Configure a private upload key before Play Store distribution. `npm run android:aab` builds the bundle for that workflow. A native rebuild is required after adding `expo-gl`; an old APK cannot run the new 3D scene.

For native development: `npm run android`. For an emulator-specific release, set `$env:NEON_ANDROID_ABIS="x86_64"` before building and remove the override before building a phone APK.

## 3D rendering checks

```powershell
npm run test:render
```

This runs the actual shared Three.js world and physics in headless Edge/Chrome at a phone aspect ratio. It checks WebGL/shader errors, lane movement, the animated 3D jump and a rendering budget. It writes screenshots to `_tmp_test/3d-first-frame.png` and `_tmp_test/3d-running.png`. Set `NEON_BROWSER` to your Chrome/Edge executable if the default Windows paths do not apply. This checks the scene; Android GPU/native GL validation remains a separate device test.

`npm run preview:3d` opens a local developer scene viewer at `http://127.0.0.1:8082`.

## Code

- `src/game3d/simulation.ts`: pooled entities, collisions, lane movement, jump/slide, rewards and difficulty.
- `src/game3d/world.ts`: shared 3D world, original models, materials, camera and animation.
- `src/game3d/RunnerScene.tsx`: native React Three Fiber rendering and lifecycle.
- `src/screens/GameScreen.tsx`: gestures, HUD, pause/results and persistence.

No real advertising or purchase SDK is integrated.

## Release startup regression

v0.2.0 crashed when Expo created the GL view: R8 removed `GLView(Context, AppContext)`, which Expo locates with reflection. Native startup also requires `GLContext.flush()` by JNI name. The targeted `expo.modules.gl.GLView` and `expo.modules.gl.GLContext` keep rules are stored in native ProGuard and in `expo-build-properties.extraProguardRules`. APK verification checks the release mapping for that constructor and JNI callback. Android release launch/Play testing is required in addition to browser rendering tests.

The scene also blocks GL calls synchronously on unmount: native GLView destruction precedes R3F passive cleanup, and rendering/disposal must not call a released JNI context.


Verified v0.2.1 release on the Android 15 emulator: launch, rendered 3D menu, Play/countdown, pause, resume, gameplay/results and return to menu; process remained alive and the native crash buffer stayed empty. The ARM64 APK was run through the emulator's ARM translation (test-only extracted native libraries); a physical Redmi Note 14 Pro+ has not been directly tested. Release signature, SDK levels, bundled JS and 16 KB alignment passed. Fixed APK: artifacts/NeonDash-3D-0.2.1-fixed.apk.

