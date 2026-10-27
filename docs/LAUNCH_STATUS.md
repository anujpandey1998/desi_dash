# Playtest and launch status

The active deliverable is the 3D Rooftop Rush async-friends game. Stable 0.2.1 remains on main. Product completion work is isolated on release/rooftop-rush-1.0; APK version remains 0.3.0 (internal test build).

## Audit of inherited changes

- 3D engine, rooftop art, collisions, coins, outfits, local progress and seeded replay verification already existed.
- Additional work introduced a guided tutorial, Monday-UTC room leagues, best-single-run distance missions, interstitial ads, clearer challenge UI and an AdMob manifest override.
- The last build failed because app/library DELAY_APP_MEASUREMENT_INIT values conflicted. Both the native override and persistent Expo config are now present.
- The guided tutorial originally advanced text without performing the moves. Practice now runs the real movement/jump/slide physics on a safe, stationary course; resetting it starts a fresh scored run.
- Interstitial requests now acquire the shared ad lock before asynchronous work and record their frequency cap when the SDK actually opens the ad.
- Identical result-upload retries return the existing server result without creating duplicate leaderboard entries. A changed replay cannot reuse that ticket.

## Test setup

- Solo play, missions, outfit unlocks and progress work offline.
- Ads use Google test IDs. No real earnings. A failed ad/consent request grants no bonus and must allow the player to continue.
- Friend rooms need the included Node server. It verifies input replays rather than trusting submitted scores.
- No public server or AdMob account is configured by this repository.
- A public HTTPS endpoint is needed for release APKs. Debug Android builds can use a LAN HTTP server. Install the same app build on friends' phones and use the same server URL.

## Before public launch

1. Host the server behind HTTPS with persistent storage, authenticated player identities, backups and abuse monitoring. Current display names are not verified accounts; JSON storage is for small playtests.
2. Configure real AdMob app/ad-unit IDs, consent messaging and app-ads.txt. Replace native and Expo app IDs together.
3. Create and retain a private production upload key. Internal APKs use the repository's standard Android debug key and are not store release artifacts.
4. Supply a public privacy policy, support contact, Play listing and accurate data disclosures; verify them against the actual services enabled at launch.
5. Test on physical phones, including Redmi Note 14 Pro+, covering install/update, controls, backgrounds, ad failures and poor network conditions.
6. Run closed testing and verify performance/crash reports before expanding distribution.

## Planned extensions

Additional route themes, roof-gap physics, drone/revive systems, Firebase accounts/cloud sync, lucky spin and live multiplayer are separate features. The present test app supports asynchronous room races, replay ghosts and room leagues.
