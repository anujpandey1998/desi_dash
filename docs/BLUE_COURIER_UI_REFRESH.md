# Blue courier UI and branding

This checkpoint applies the user's approved spiky-haired, blue-hoodie character to the app UI and branding. It also removes the in-run movement buttons at the user's request.

## Artwork

- `src/assets/mascot/blue-courier.png`: approved full-body character, real transparent alpha.
- `src/assets/art-direction/blue-courier-approved.png`: approved outfit reference.
- `src/assets/branding/splash-rooftops.png`: portrait rooftop splash key art.
- `src/assets/branding/app-icon.png`: square character icon master.
- `src/assets/branding/feature-banner.png`: wide game banner.
- `src/assets/branding/store/app-icon-512.png`: opaque RGB 512 × 512 PNG.
- `src/assets/branding/store/feature-graphic-1024x500.png`: opaque RGB 1024 × 500 PNG.

These are original generated raster assets. Store files are prepared locally; nothing has been published.

## UI implementation

- `src/theme/theme.ts`: shared blue/teal palette, typography and sizing tokens.
- `src/components/ui/index.tsx`: shared Button, Card, Header, Popup and reduced-motion support.
- `src/components/BrandMascot.tsx`: approved artwork, avatar and focus-aware idle animation. Replaces the earlier geometric mascot. This uses the approved static expression; it does not pretend to animate facial expressions.
- `src/components/ScreenHeader.tsx`, `HoodieSwatch.tsx`, `MenuLayout.tsx`, `RooftopBackdrop.tsx`: consistent navigation, wardrobe illustration, responsive scrolling and background.
- `MainMenuScreen.tsx`: blue character hero, real wallet/best score, green Play, friend challenge, runner wardrobe, daily missions and Settings.
- `SplashScreen.tsx`: responsive rooftop artwork, native text and an activity indicator. No fake download percentage; artwork load failure cannot block entry.
- `CustomizeScreen.tsx`: wardrobe cards and selected/owned/locked states, actual coin prices and existing unlock flow, optional profile photo controls.
- `ChallengesScreen.tsx`: separate Daily Missions and Friends tabs, real mission progress/claims, setup/join/share/race and leaderboards.
- `SettingsScreen.tsx`: accessible switches, graphics choice, ad privacy and swipe-only help.
- `GameScreen.tsx`: compact readable HUD, shared pause/results/error popups, approved avatar, existing ad/score/retry actions. Left/Jump/Slide/Right buttons are removed during runs. Existing swipe/tap input handling is preserved. Tutorial text no longer directs users to removed controls.

The game's underlying simulation, wallet, mission rewards, ads and network service implementations remain unchanged in this UI checkpoint. The approved raster character is integrated into the UI; it is not an automatically generated replacement for the animated 3D gameplay mesh. Existing in-game outfit selections continue to use their actual saved colors.

## Android branding

- Launcher PNG resources replaced the old launcher WebP resources at all five densities.
- Native Android launch background/icon and colors updated; the full illustration appears in the React Native splash screen.
- `app.json` points to the new icon master.
- `scripts/prepare-brand-assets.cjs` / `npm run branding:prepare` rebuild launcher density variants and store-size exports using Expo's image utilities. Rerun after native prebuild if resources are regenerated.

## Checks

- TypeScript compilation passed.
- Gameplay regression: 11 checks passed.
- Social/reward/ad-policy regression: 10 checks passed.
- Confirmed mascot alpha and store image dimensions / opaque RGB encoding.
- Android build and visual verification results follow below.

## Final verification

- Final ARM32 / ARM64 / x86_64 release build succeeded.
- Final package: `artifacts/RooftopRush-blue-courier.apk`.
- Package structural verification checks min/target SDK, embedded JS, native 16 KB alignment and ZIP alignment.
- Final TypeScript check passed after compact-button, shared pause-button and challenge-tab navigation fixes.
- Native screenshot verification could not be completed: the Pixel 6 emulator's Android System UI became unresponsive and system services restarted. Logs also showed system-app/ART crashes. A successful visual smoke test of the final UI is not claimed; physical-phone review is pending. The unsuccessful screenshot was removed rather than presented as an app preview.

The user's approved artwork and the full source implementation are saved in the workspace. No store publication or external deployment was performed.
