# Android scene startup: native loader resolution

The previous release was installed on the available Android emulator and the Play flow reproduced the screenshot's failure. Logcat reported `ReferenceError: Property 'document' doesn't exist` in `World`, preceded by `WARNING: Multiple instances of Three.js being imported`. This was a JavaScript texture-loader failure, not evidence of an unsupported phone GPU.

R3F/native's CommonJS distribution patches its Three TextureLoader for Expo assets. Metro package exports resolved application imports to Three's separate ESM distribution. The application's unpatched TextureLoader attempted to create a browser Image using `document` when the character atlas was requested.

`metro.config.js` now resolves the bare `three` package to a single CommonJS entry on Android/iOS. Web and addon subpaths retain standard Metro resolution. The Android production sourcemap was checked: it contains one Three build entry, `three.cjs`. `scripts/native-resolution.test.cjs` tests both import/require contexts and unchanged web/addon resolution.

`RunnerScene.tsx` now reports the caught error; `GameScreen.tsx` pauses the run/audio and displays the actual diagnostic message rather than claiming every failure means OpenGL is unavailable. This does not alter rewards, drone steering or race physics.

Original music is also included in this release; see [Rooftop Radio](ROOFTOP_RADIO.md). Audio initialization/cancellation tests are in `scripts/audio-lifecycle.test.cjs`.

## Release validation

`artifacts/RooftopRush-startup-music.apk` built successfully and passed bundled-JS, native ELF64 16 KB and ZIP alignment checks. Installed that APK on the available Android emulator, launched Play, and observed the reference courier, roofs and advancing countdown without the previous document/duplicate-Three error. Screenshot: `artifacts/RooftopRush-native-startup-fixed.png`. Native audio playback events were observed; sound quality on the Redmi remains unverified. Typecheck, two native-resolution tests, three audio-lifecycle tests and the WebGL render suite passed. A physical Redmi Note 14 Pro+ was not connected, so device-specific performance and sound still need checking there.

Background: [Metro package exports](https://metrobundler.dev/docs/package-exports/) documents import/require resolution and web-global failures; [R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation) documents the native renderer and loader integration. Installed package sources and Android logcat supplied the diagnosis here.
