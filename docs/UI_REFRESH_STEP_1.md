# UI refresh — step 1

The app uses React Native / Expo with a Three.js game scene. This checkpoint changes the home screen and introduces the shared UI foundation; gameplay, persistence, social rewards and advertising implementations are unchanged.

## Files

- `src/theme/theme.ts`: palette, font families, type sizes, spacing, radii, layout and motion tokens.
- `src/components/ui/index.tsx`: one shared Button, Card, Header and Popup; button sound/haptics use existing settings-aware services. Motion respects Android's reduced-motion preference.
- `src/components/CourierMascot.tsx`: scalable native courier illustration, six expression options, breathing/bobbing and blinking; animation stops when home loses focus.
- `src/components/RooftopBackdrop.tsx`: decorative night/sunset sky, skyline and rooftop illustration.
- `src/screens/MainMenuScreen.tsx`: home redesign with real wallet/best score, PLAY, friend challenge, Shop (existing Customize), Daily Missions (existing Challenges) and Settings. Scrollable on short screens and two columns on wide screens.
- `android/app/src/main/assets/fonts/`: bundled Nunito regular/extra-bold and SIL Open Font License. A native rebuild is required to include these assets.

## Scope

Only the home screen has migrated to the new components in this checkpoint. Popup is ready for subsequent screen migrations. Other screens retain their current UI. Home does not introduce a gem balance, daily login streak, drone revive or email authentication; these are not implemented in the existing game. Existing mission rewards remain on the Challenges screen.

## Validation

- `npm run typecheck`
- `npm test` — 11 gameplay regression checks.
- `npm run test:social` — 10 social, reward and ad-policy checks.

Native visual verification and build results are recorded below after checking the emulator.

Native release build and APK structural verification passed for the initial home checkpoint. The updated home was exercised on the Android emulator. Gameplay-world changes and the final package are tracked in `WORLD_VISUAL_REFRESH.md`.
