# Firebase startup crash — 3 November 2026

## Confirmed cause

The app closed immediately after tapping its icon. A native emulator run reproduced `IllegalStateException: Default FirebaseApp is not initialized` from `NativeRNFBTurboAppCheck.<init>` during eager TurboModule creation. This happens before React renders, so checking Firebase configuration only in TypeScript cannot prevent it.

The test APK intentionally has no `google-services.json`, but its native package list still registered App Check. The App Check constructor calls `FirebaseAppCheck.getInstance()` and requires a configured default Firebase app.

## Changes

- `android/app/build.gradle`: generate `BuildConfig.FIREBASE_CONFIGURED` from the presence of `android/app/google-services.json`.
- `android/app/src/main/java/com/anujpandey/neondash/MainApplication.kt`: before TurboModule initialization, remove optional App Check/Auth/Firestore/Functions packages when Firebase is unconfigured. Keep the base Firebase package so the app can safely report an empty configured-app list. Use Kotlin type checks, not class-name strings that R8 can obfuscate.
- `plugins/withFirebaseAndroid.cjs`: preserve the build flag and native package guard during Expo prebuild. A real Firebase configuration and rebuild enable the services normally; App Check enforcement is unchanged.
- `src/services/firebase/client.ts`, `src/store/authStore.tsx`: safely probe for a default Firebase app and keep native configuration errors out of React render. Initialize auth state lazily.
- `scripts/build-android.cjs`: restore the earlier universal test APK architecture coverage: ARMv7, ARM64 and x86_64. The first emulator attempt with the ARM-only APK failed in SoLoader's native-bridge path before reaching the Firebase crash.
- `scripts/verify-apk.cjs`: verify that every included ABI contains the React Native, Hermes, app, Expo GL and C++ runtime libraries; `--universal` additionally requires all three test architectures.
- `scripts/firebase-startup.test.cjs`, `scripts/firebase-native-config.test.cjs`: cover missing configuration, failing native probes, secondary-only apps, prebuild persistence and obfuscation-safe package filtering.

No dummy Firebase project/API key was added. Character artwork, HUD layout, runner physics, local wallet and ad rewards were not changed.

## Manual checks

Install the corrected APK as an update. Open the app without Firebase configuration, enter Play and confirm the runner scene starts. Reopen after closing the app. Existing local progress should remain.

For online features, add your real `android/app/google-services.json`, rebuild and follow [Firebase setup](FIREBASE_SETUP.md). Login, App Check attestation and multiplayer still require the real project setup; those steps are independent of this offline startup fix.
