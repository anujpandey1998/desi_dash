# Rooftop Rush

A portrait Android 13+ runner built with React Native, Expo native modules and Three.js. The working Neon Dash 0.2.1 release is preserved on `main`; `feature/rooftop-friends` contains Rooftop Rush 0.3.0.

## Included on this branch

- Original rooftop setting: tiled roofs, water tanks, solar panels, clotheslines and an animated courier. No trains or railway assets.
- Offline endless runs with swipe/button controls, shields, pause/resume and saved scores/coins.
- Daily distance/coin/run missions (UTC reset) with claim-once coin rewards.
- Existing three outfits remain free; two additional outfits unlock with earned coins.
- Standard/Low scenery detail in Settings.
- Friend rooms with six-character codes, native invite sharing, seven-day expiry, leaderboards and matching seeded 90-second courses.
- A cyan replay ghost of the room's highest verified run, when a previous result exists.
- Server-side physics replay validation, opaque single-use run tickets, bounded requests and persistent room data.
- Optional rewarded ads to double solo-run coins. Only the SDK's earned-reward event grants a bonus. Challenge scores cannot be boosted by ads.
- Local counters for finished runs and rewarded requests/completions. These are device-local diagnostics, not a hosted analytics dashboard or revenue reporting.

This is asynchronous friend competition. Players do not need to be online together. Live 2–4 player racing, public matchmaking, accounts/cloud saves, global weekly leagues, rooftop gap physics and additional biomes are future work.

## Run and test

```sh
npm ci
npm run typecheck
npm test
npm run test:social
npm run test:render
npm run android:apk
npm run android:verify
```

Android builds use JDK 21 (Android Studio's bundled JDK is auto-detected on Windows). `android/local.properties` points at your local SDK and is intentionally ignored. Native Android sources are checked in; retain their version/manifest/ProGuard configuration when changing Expo config. Phone APKs include ARM32 and ARM64, minimum API 33 and target API 36. APKs and caches stay out of Git.

`npm run preview:3d` opens the shared world in a browser. This verifies shaders and animation; it does not replace testing the native release APK.

## Friends server

```sh
npm ci
npm run server
```

The Node server listens on port 8787. `GET /health` returns its protocol version. Set `PORT` and `CHALLENGE_DATA` to override the port and persistent JSON file location. Keep that data file on a persistent disk; it contains private run tokens and is ignored by Git. The server needs the checked-in physics source and `typescript` from devDependencies, so do not install with `--omit=dev`.

For friends on separate phones, host this service behind an HTTPS reverse proxy. Enter that HTTPS address and your player name in **Friends + Daily Missions** on each phone. Create a room, share the code, join, race, then refresh the room leaderboard. Scores are replayed on the server rather than trusted from a client score field. A failed upload can be retried from the results screen before leaving it. Unsubmitted tickets expire after one hour.

No public server is deployed by this repository. The release Android manifest requires HTTPS; plain HTTP LAN URLs will not work in a release build. A debug build permits local HTTP for development. Use a managed HTTPS endpoint or TLS reverse proxy for a phone release test.

This backend is suitable for small friend playtests. Before a broad public launch, add authenticated player identities, durable database transactions/backups, abuse monitoring and scaled replay workers. Replay validation rejects fabricated scores but is not a complete bot/cheat prevention system. Display names are not verified accounts. Room standings currently list the best 50 attempts, including multiple attempts from one name.

## Ads setup

The checked-in Android app ID and default rewarded unit are Google's test IDs. Test ads produce **no revenue**. The first voluntary reward request gathers UMP consent before SDK initialization. Ads are never forced during a run. Settings exposes ad privacy options.

To enable monetization, replace the test Android app ID in `app.json` (both the config plugin and `react-native-google-mobile-ads` block) and `android/app/src/main/AndroidManifest.xml`. Set `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` to your rewarded unit before building. Rebuild the native APK after an app ID change. Configure consent messaging/privacy disclosures and app-ads.txt for your published app in AdMob. Development/testing should continue using test IDs or registered test devices. Actual ad serving and earnings require your AdMob account configuration.

The implementation follows the [Google Mobile Ads integration](https://docs.page/invertase/react-native-google-mobile-ads) and [rewarded ads guide](https://developers.google.com/admob/android/rewarded).

## Native crash regression

Preserve the targeted ProGuard rules for `expo.modules.gl.GLView` (reflective constructor) and `expo.modules.gl.GLContext` (JNI `flush()` callback). The APK verifier checks both in the release mapping, plus SDK/version, embedded JS, ARM64 ELF 16 KB alignment and ZIP alignment. The scene synchronously guards native GL calls during unmount so delayed renderer cleanup cannot access an already destroyed GLView.

The previous 0.2.1 APK passed Android 15 emulator launch, rendered menu/gameplay, pause/resume and game-to-menu regression checks. The test emulator required ARM translation; physical Redmi testing is performed by the owner.
