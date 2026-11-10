# Real 3D characters and rooftop cycling

## Current limitation

`spriteCourier.ts` and `chaseEffects.ts` display camera-facing textured planes. The courier run atlas changes frames; the chaser's run pose only bounces/scales. Neither is a volumetric, rigged character. Turning these planes cannot reveal a correct side/back view. The repository contains no GLB, GLTF, FBX or Blender character assets. More generated PNG poses do not solve this requirement.

Recommended direction: custom stylized rigged 3D characters matching the approved blue-hoodie courier and Aunty/Uncle designs. Keep the approved PNG art for menus. Do not substitute primitive robot-like bodies or describe sprites as real 3D.

## Art delivery contract

- Three self-contained GLB files: courier, Aunty, Uncle. Supply original Blender source and texture sources with documented rights.
- Courier: approved face/hair proportions, blue hoodie, full navy trousers, sneakers and teal backpack. Model complete front, sides and back; do not bake a front-view face onto a flat plane.
- Chasers: articulated hips, knees, ankles, shoulders, elbows and wrists; separate movable slipper/umbrella prop. Running must show foot planting and counter-swinging arms. Cloth silhouette should follow the body without excessively expensive cloth simulation.
- Consistent metre scale, ground origin and documented forward axis. Use a floor/contact test to avoid floating feet. Keep root motion off for gameplay clips; the simulation owns movement.
- Suggested starting budget, to validate on the target phone: courier 8–12k triangles; each chaser 6–10k; 35–55 bones; one 1024-pixel texture atlas and as few material slots as practical. These are targets, not measured performance guarantees.
- No external texture URLs or decoder-dependent compression in the first Android integration. Preserve the single native Three resolution fix in `metro.config.js`.

Required courier clips: Idle, Run, JumpAnticipation, JumpRise, JumpFall, Land, SlideEnter, SlideLoop, SlideExit, Stumble, DroneGrab, DroneHang, Caught, BikeMount, BikePedal, BikeJump, BikeLand, BikeDismount. Chasers: Run, Shout, Confused, CaughtCelebrate. Preview every clip from the actual behind-player gameplay camera and both sides before acceptance.

## Slide and turning

Replace the current single slide sprite with a three-part animation: crouch/enter, low moving slide, recover. Keep the slide collision height and visual head height aligned. Separate root controller from a visual pivot, so animation blending cannot change collision position. Blend by normalized clip phase, keep feet above the roof, and make recovery interruptible when gameplay allows it. Lane changes should turn/lean the complete model briefly, then return to forward facing. Show a freely rotatable full model in Customize so side-view quality can be reviewed.

## Bicycle sequence

Build a coherent mode: run -> cycle pickup/mount -> pedal -> ramp approach -> takeoff -> controlled trick -> landing -> pedal/dismount. The bike needs real wheels, cranks and pedals; synchronize the pedal clip/foot targets to crank angle, with hands attached to handlebar targets. Spinning wheels beneath a standing courier sprite is not an acceptable finished implementation.

Start with solo play and a finite 15–20 second ride. Keep lane controls familiar. Up triggers a bunny hop on the roof; at a ramp it launches a longer jump. Down tucks under a gate. In the air, one optional swipe triggers a modest tabletop/no-hander animation, then auto-recovers before contact. Start with controlled animations rather than unrestricted flips or a full bicycle physics simulator.

Ramps must be actual sloped geometry with matching elevation/collision data, not decorative boxes. Place them in telegraphed, reachable lanes with a safe alternative. Use a clear takeoff marker, a coin arc and a visible landing zone. Check roof gaps and head clearance across the full trajectory. A smooth landing grants a small boost or style meter; specify scoring separately before changing wallet coins. Crashes should dismount into a protected stumble and return to running.

Drone activation and cycling must be mutually exclusive with a defined transition; a queued offer must not consume a paid pass if it cannot launch. Pause/background freezes bicycle timers and motion. Preserve existing ad-receipt and wallet transactions. Do not include new cycling physics in verified friend races until both server replay and challenge versioning support it.

## High-impact game ideas, in order

1. Fix the courier/chaser model and movement first; review a 10-second run-turn-slide clip before making more screens.
2. Add one polished cycle/ramp sequence with dependable landing feedback before adding many stunt types.
3. Delivery objectives: fragile parcel (clean run), express parcel (time target), food parcel (smooth landing). Reward existing progression through a clearly defined economy.
4. Distinct neighbourhood routes: old-city terraces, market rooftops, monsoon evening. Use readable landmark silhouettes and fair obstacle spacing.
5. Short trick chains and clean-run combos with restrained camera feedback; avoid blocking the view with notices.
6. Personality through occasional contextual chaser lines and delivery reactions; throttle repetitions.

## Integration and review gates

Implement a GLB character adapter behind the existing world API using Three AnimationMixer; reuse the current simulation, input handlers, ads, coins and theme. Add a bicycle model/controller module rather than rewriting screens. Validate Android asset loading, clip bounds, model disposal, slide clearance, pedal alignment, pause/resume, drone exclusions, deterministic ramp flight, safe lane generation and landing collisions. Profile on the Redmi at standard and low graphics; do not infer 60 FPS from browser draw-call limits.

This document is a design/asset brief. No full-3D replacement or bicycle gameplay is claimed as implemented by this brief. Asset direction must be selected before dependent character/rider work proceeds.
