# Rooftop Rush Firebase setup

The app and backend code are implemented locally. Firebase Console setup, production deployment, email delivery, Google OAuth, Play Integrity attestation and two-phone races require your Firebase project. No API key or service-account credential is hardcoded.

## 0. Android project and configuration

1. **MANUAL:** Create/select a Firebase project. Register an Android app with the existing package **`com.anujpandey.neondash`**. Do not change it for an update to the installed game.
2. **MANUAL:** Download its `google-services.json` and place it at **`android/app/google-services.json`**. It is ignored by Git. No JavaScript `initializeApp` credential object is needed. See [Firebase Android setup](https://firebase.google.com/docs/android/setup).
3. **MANUAL:** Register SHA-1 and SHA-256 for your debug signing certificate, upload certificate, and Play App Signing certificate as appropriate. Re-download the JSON after enabling Google sign-in.
4. Copy `.env.example` to local `.env`, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **Web** OAuth client ID, and keep region `asia-south1` consistent with `functions/src/index.ts`. This ID is public configuration, not a client secret. Never place service-account JSON or OAuth client secrets in the app. See [Google sign-in configuration](https://react-native-google-signin.github.io/docs/original).
5. Run `npm install`, `npm --prefix functions install`. Use a native Android build/development client, not Expo Go. Without Firebase JSON, the existing offline game opens normally and online features explain that setup is pending.
6. `plugins/withFirebaseAndroid.cjs` preserves the Google Services and signing configuration during normal Expo prebuild. Back up `google-services.json` outside `android/` before any destructive clean prebuild, then restore it afterward. Existing native GL/R8 fixes remain.

Changed files: `package.json`, lockfiles, `android/build.gradle`, `android/app/build.gradle`, `app.json`, `.env.example`, `.gitignore`, `plugins/withFirebaseAndroid.cjs`.

Test: build without JSON and play offline; add the real JSON, rebuild, and confirm the login screen appears. An old installed APK will not acquire Firebase configuration just by copying a file on your PC.

## 1. Authentication

**MANUAL:** In Authentication > Sign-in method enable **Email/Password** and **Google**. Set the Google support email. Customize verification/password-reset email templates and their sender settings. Do not enable Phone OTP yet.

New code: `src/services/firebase/{client,authService,errors}.ts`, `src/store/authStore.tsx`, `src/screens/auth/{AuthScreens,AccountCard}.tsx`. `App.tsx` restores the native Firebase session before routing; logged-in users enter Home. Settings includes logout and verification resend. Passwords/emails remain with Firebase Auth; Firestore profiles do not duplicate them.

Test:

- Signup with name/email/password (8+ characters); check verification email and spam folder.
- Duplicate email, incorrect password, weak password, offline/network errors and Google cancellation.
- Reset email: a generic success response avoids revealing which accounts exist.
- Kill and reopen the app: the session persists. Logout: protected screens disappear from navigation history.
- Google login: check both debug and Play-signed builds. Use the Web OAuth ID, not an Android OAuth ID.

## 2. Private user profiles

`users/{uid}` contains only `displayName`, `avatarId`, `coins`, `highScore`, `createdAt`. First authentication creates it transactionally without resetting an existing profile. Settings changes the display name. Initial avatar uses the device's selected boy/girl. Names are 1–20 characters. Completed runs can raise a bounded cloud high score.

New code: `src/services/firebase/userService.ts`. Profile listeners live in the auth store and unsubscribe on logout/change/unmount.

**Currency boundary:** cloud `coins` starts at zero and cannot be changed by a client. The existing device wallet, outfits, daily rewards and local rewarded-ad passes continue to work independently. They are **not** uploaded as trusted cloud currency or restored as an account wallet. Moving that economy to the cloud requires server-validated run/reward transactions and AdMob server-side verification; this change does not silently trust a local wallet.

Test: first login creates exactly the five fields; subsequent logins preserve them. Rename in Settings and reopen. Try reading another user's document or writing `coins`: denied. Existing local coins must not be reset or double-counted.

## 3. Four-player rooms

**MANUAL:** Create a Cloud Firestore database in production mode and choose an appropriate location. Deploy rules and Functions before trying Create/Join. Do not temporarily open the database to make joins work.

New code: `src/services/firebase/roomService.ts`, `src/screens/rooms/{RoomScreens,useRoomRace}.tsx`, `functions/src/{index,domain}.ts`, `firebase.json`, `firestore.indexes.json`. `MainMenuScreen.tsx` adds a room entry; `GameScreen.tsx` uses the existing runner simulation and swipes for races.

- Secure callables create a unique six-letter uppercase code using a private `roomCodes` index. Create/join run in transactions; a fifth concurrent join is rejected. `roomSessions` prevents parallel active rooms for one account.
- Room documents include the requested fields plus `seed`, `round`, `startsAt`, `duration`. Player entries include `left` and `lastSeen` for disconnect cleanup. These extra fields are needed for synchronized starts, replay isolation and presence.
- Only members subscribe to a known room document. No public room search/query is exposed. The native Share sheet lets the player select WhatsApp.
- Host starts a 90-second same-seed race. A server clock sample adjusts countdown timing for the device clock. Slow loading shortens that client's remaining race time; scores are not simulated retroactively.
- Each active player sends their own progress at most once per **1.5 seconds**, with a single request in flight. The live leaderboard uses one room listener. Screen exits clean up intervals, AppState subscriptions and snapshot listeners.
- Host can replay a finished room; other players follow back to the lobby. Leaving marks the player `left`; host departure closes the room. A scheduled trusted cleanup marks unresponsive unfinished players left after a **65-second heartbeat timeout**, checked once per minute. Force-kill detection can therefore take about two minutes; it is not instantaneous.
- Backgrounding an online race marks it left. Lobby/results heartbeat pauses in the background so opening WhatsApp to share does not immediately destroy the room; the server expires a prolonged disconnect. Solo background/pause behavior remains unchanged. Finished players keep their submitted result while waiting for others.

**MANUAL deployment** (choose your project explicitly; nothing is deployed by the local tests):

```powershell
npx firebase login
npm --prefix functions run build
npx firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes,functions
```

Functions deploy to `asia-south1` on Node 22. **MANUAL:** Cloud Functions deployment requires a Blaze project; configure billing alerts. Reads/writes are throttled, but the Firestore free quota is not guaranteed for unlimited races. See [Functions deployment requirements](https://firebase.google.com/docs/functions/get-started). A four-player full 90-second race uses roughly 240 progress writes and up to about 960 delivered leaderboard document reads, plus transactions, lobby and lifecycle operations.

Test on two or four accounts: unique code/share, invalid code, simultaneous joins, full room, non-host Start rejection, countdown, shared seed, leaderboard, finish, replay, leave, host exit and force-kill timeout. Verify both original asynchronous friend challenges and solo gameplay still work. A bounded client-reported score is **not** a server-replayed anti-cheat result; use the existing verified challenge service where replay verification is required.

## 4. Rules and App Check

`firestore.rules` denies public room listing and access to private indexes. Users can get only their own profile. Profile coins/creation time cannot be updated by clients. Players can update only their own progress/heartbeat, with fixed membership/name, bounded integer scores/distances, monotonic progress and one-way completion. Host start/replay is enforced in callable code, not a permissive direct document write.

Admin Functions bypass rules, so their code explicitly checks authentication, membership, host identity, room state and capacity. Only trusted lifecycle triggers/scheduled cleanup may close a room when everyone finishes or a host disconnects. See [rules field validation](https://firebase.google.com/docs/firestore/security/rules-fields) and [authenticated callable functions](https://firebase.google.com/docs/functions/callable).

**MANUAL:** Register the Android app under Firebase App Check with **Play Integrity**, link the Play project and register signing SHA-256. Monitor valid requests, then enable enforcement for Firestore and supported Authentication protection. All callables already use `enforceAppCheck: true`. Verify production attestation through Play Internal Testing; a locally sideloaded build may not satisfy your Play Integrity settings. See [Play Integrity setup](https://firebase.google.com/docs/app-check/android/play-integrity-provider).

Debug builds use the debug provider. **MANUAL:** Register a locally generated debug token in App Check Console, set it only in local `.env`, rebuild, and never use that token/provider in production. Release code always selects Play Integrity. See [React Native Firebase App Check](https://rnfirebase.io/app-check/usage).

Local security tests (JDK 21+; no Firebase credentials required):

```powershell
npm run typecheck
npm run test:firebase
```

The test command uses a **demo** project and a local Firestore emulator. Callable handler transaction tests do not emulate actual Google OAuth or Play Integrity attestation. Console setup/device tests remain necessary.

## 5. Test ads

AdMob was already installed. `src/constants/adUnits.ts` now holds only Google's Android test IDs; `adService.ts` no longer reads a production unit override from the environment. Native test application ID remains in `app.json`/AndroidManifest. `adPolicy.ts` offers one interstitial after every **three** new completed solo games, on results; retry/exit cannot repeat that same interval. Reviving does not count another completed run.

Rewarded drone and revive paths continue to grant only after the SDK's `EARNED_REWARD` event. Closing/failing/loading an ad grants nothing. Test ads earn no revenue. Cloud coins are not granted from a client-generated receipt.

Test: dismiss/complete rewarded drone, use saved passes, resume after ads, third/sixth solo result interstitial, no duplicate on Retry, and no interstitial inside a live room race. **MANUAL:** A future live-ad change must update the central unit IDs and native application ID together and configure server verification before using rewards as trusted cloud currency.

## 6. Release configuration

React Native Firebase modules are pinned together to `26.0.0`, using their matching Android SDK set. The newest Auth 25 SDK metadata needs Kotlin 2.4, while this Expo toolchain uses Kotlin 2.2; keep the matched packages when reproducing the build and retest when upgrading.

Package remains `com.anujpandey.neondash`, version `0.3.0`, **versionCode 5**. Existing launcher icons and approved character assets are retained. R8 remains enabled and existing Expo GL/WorkManager keep rules remain; verbose/debug/info Android logs are removed in optimized builds. No runtime `runnerTest` globals or preview/test imports are added to the app entry point.

**MANUAL:** Create/store an upload keystore outside this repository. Set these environment variables or values in your user-level `~/.gradle/gradle.properties` (do not commit passwords):

```properties
ROOFTOP_UPLOAD_STORE_FILE=C:/private/rooftop-upload.jks
ROOFTOP_UPLOAD_STORE_PASSWORD=YOUR_LOCAL_VALUE
ROOFTOP_UPLOAD_KEY_ALIAS=YOUR_ALIAS
ROOFTOP_UPLOAD_KEY_PASSWORD=YOUR_LOCAL_VALUE
```

```powershell
npm run android:aab
npm run android:apk
npm run android:verify
```

A production assemble/bundle fails clearly if signing credentials or Google Services JSON are missing. **MANUAL:** For an explicitly local test APK only, `ROOFTOP_ALLOW_TEST_RELEASE=true` permits debug signing and missing Firebase JSON. Do not upload that artifact to Play. Add a valid Firebase JSON and use Play-signed builds to test actual online login/App Check.

## Character identity correction

The video showed a generic 3D character replacing the approved artwork during cycle/drone modes. `world.ts` now keeps the selected courier's original artwork visible in all modes; `chaseEffects.ts` restores the matching Uncle/Aunty atlas. `simulation.ts` again selects both original chasers. Delayed following, bike wheels/crank, drone model, solo lanes/swipes/scoring and the existing HUD style remain.

The restored artwork uses authored seated/flying poses, not a newly designed skeletal character. Exact skeletal foot/hand IK from the discarded generic 3D rider is no longer a claim about the visible courier. Drone grips are positioned to the authored flight pose. No new character assets or HUD redesign were made for this correction.

Test boy and girl with each outfit while running, cycling and flying; check both Uncle/Aunty runs, pickup/landing and transition back to running. WebGL regression checks assert the approved artwork remains visible in each mode.

## Local handoff validation — 31 October 2026

- App TypeScript and Functions compilation pass.
- Regular suite: 77 passed; 5 emulator-only checks are skipped there and exercised separately. Firebase emulator command: 9 passed, including concurrent capacity, private access, score/currency restrictions, host actions and heartbeat cleanup.
- WebGL checks pass for both approved couriers across run/cycle/drone, both chaser identities, camera framing, low graphics and rendering budgets.
- Native release compilation and R8 pass with the matched Firebase 26 packages. The test artifact is `artifacts/RooftopRush-firebase-character-fix-test.apk` (82,834,466 bytes), explicitly debug-signed using the local test override and built without project credentials.
- APK verification passes: bundled JavaScript, API 33 minimum/API 36 target, 23 ELF64 libraries with 16 KB LOAD alignment, ZIP alignment and existing reflective Expo GL/WorkManager constructor checks.
- No Android device was connected for a launch test. Production signing, real Firebase configuration/deployment, Google/email flows, Play Integrity, two-phone multiplayer and real-device performance remain manual tests.

Visual previews: `artifacts/RooftopRush-same-girl-cycle.png` and `artifacts/RooftopRush-same-girl-drone.png`. These show the 3D scene, not a redesigned HUD.
