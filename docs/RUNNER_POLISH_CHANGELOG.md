# Rooftop Rush chase, ride and HUD fixes

> Character identity correction (31 October 2026): approved boy/girl artwork now remains visible during cycling and flight; matching Uncle/Aunty artwork is restored. The generic 3D rider and its visible skeletal IK described below are superseded. See [Firebase setup and character correction](FIREBASE_SETUP.md#character-identity-correction) for current behavior and tests. The HUD style is retained.

## Changes

- `src/game3d/simulation.ts`: Uncle starts 5 m behind, recovers to at most 6 m, closes on impacts/stumbles and catches below 1 m. Grounded crank phase belongs to fixed-step simulation; jumping and pause stop pedaling. Drone lift waits briefly for the grab.
- `src/game3d/chaseEffects.ts`: remove lateral offset and compressed distance; follow lane history with a 0.4 s reaction delay and damping. Use articulated Uncle, forward lean, arm swing and a visual caught celebration that continues after physics stops. Existing dust remains pooled.
- `src/game3d/cartoonActor.ts`: articulated ride model, selected girl ponytail, stronger chase swing, torso lean, backpack sway and named limb joints. Approved artwork remains the running character.
- `src/game3d/cycleModel.ts`: retain both wheels, frame, saddle and handlebar; wheels follow travel, opposite pedals share the simulation crank phase.
- `src/game3d/droneModel.ts`: two separate underside grips and fast propellers.
- `src/game3d/rideRig.ts`: reusable two-bone IK with preallocated scratch vectors/quaternion.
- `src/game3d/world.ts`: use the 3D rider for cycling, final pickup and flight; solve hands against handlebars/grips and feet against pedals, ease legs down for landing, pull flight camera back so Uncle remains visible below.
- `src/screens/GameScreen.tsx`: larger score, coin bounce, one fading 2.65 s hint, short battery/cycle indicators, teal Drone and neutral Pause using existing raised/pressable buttons, segmented circular cooldown, floating power-up text, Retry and one rewarded revive per run. Existing Nunito theme retained.
- `src/services/droneService.ts`: revive receipts are recorded once without granting coins or drone passes.
- `src/services/socialService.ts`: optional continuation flag lets revived runs bank only newly earned coins without counting another completed run.
- `scripts/{chase,cycle,drone,social}.test.cjs`, `scripts/check-3d-render.cjs`: chase threshold, airborne pedaling, receipt replay, continuation banking and actual world-space grip/pedal contact coverage.

## Validation

TypeScript and gameplay/economy/replay checks; headless WebGL renders for phone/tablet framing, low graphics, cycling, flight, birds and caught pose. Contact error is below 0.025 m. Current render samples remain below the existing 320 draw-call / 70,000-triangle limits (cycle: 132 / 50,078; flight with visible Uncle: 149 / 58,726; birds: 152 / 59,404).

These are render-budget checks, not measured Android FPS.

Test APK: `artifacts/RooftopRush-runner-polish.apk` (30 October 2026). Release build passed; bundled JavaScript, API 33 minimum/API 36 target, 22 ELF64 libraries with 16 KB LOAD alignment and ZIP alignment verified. Physical-device gameplay, sustained frame rate and real rewarded-ad behavior still need testing.

## Device checklist

1. In all lanes, change direction repeatedly: Uncle reacts late, stays behind, and closes after unshielded hits. Confirm catch below 1 m and the caught gesture.
2. Ride the cycle: check both wheels from a side view, alternating feet, handlebar grip, jump/pedal stop, ramp tricks and recovery. Existing no-hands trick intentionally releases the handlebar.
3. Trigger automatic and paid drone pickup: check grip before lift, lane tilt, altitude swipes, bird hits, feet-first normal/emergency landing and small Uncle below.
4. On a narrow Android phone check large scores, coin bounce, long hints, one-banner replacement, cooldown ring and pause/background/resume.
5. Dismiss a revive ad: remain caught. Complete one: resume with recovery grace. End again: wallet receives only new coins, mission run count increases once. Retry and double-coins ads must still work; verified friend races must offer no revive.
6. Run for 5–10 minutes on a mid-range Android phone in both graphics modes, including cycle and three-bird flight. Profile frame times and thermal behavior before claiming sustained 60 FPS.
