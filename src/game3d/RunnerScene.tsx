import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber/native';
import { useLayoutEffect } from 'react';
import { TextureLoader, type Texture, type PerspectiveCamera } from 'three';
import { StyleSheet, Text, View } from 'react-native';
import { advanceRunner, createRunner, jump, slide, steer, snapshot, type Runner, type RunEvent, type RunSnapshot } from './simulation';
import { createRunnerWorld } from './world';

import {CHARACTER_ART} from './characterArt';
import type {CharacterId} from './profile';
import { loadGraphicsQuality } from './profile';
import type { GhostRun } from './challenges';

const CAMERA = { position: [0, 4.3, 11] as [number, number, number], fov: 65, near: 0.1, far: 220 };
const GRAPHICS = { antialias: false, powerPreference: 'high-performance' as const };

type Props = { character?:CharacterId; runner: Runner; ghost?: GhostRun; preview?: boolean; outfit?: number; onSnapshot?: (s: RunSnapshot) => void; onEvent?: (e: RunEvent) => void; onReady?: () => void; onError?: (error: Error) => void };
function World({ character='boy', runner, ghost, preview = false, outfit = 0, onSnapshot, onEvent, onReady }: Props) {
  const { scene, camera, gl } = useThree();
  const courierTexture=useLoader(TextureLoader,CHARACTER_ART[character].back) as Texture;
  const chaserTexture=useLoader(TextureLoader,require('../assets/runner/matching-chasers-run-v1.png')) as Texture;
  const world = useMemo(() => createRunnerWorld(courierTexture,chaserTexture,character), [courierTexture,chaserTexture,character]);
  const reportTimer = useRef(0);
  const ghostState = useRef<{ runner: Runner; input: number } | null>(null);
  useEffect(() => { world.configure(scene, camera as PerspectiveCamera, gl); onReady?.(); return () => world.dispose(); }, [world, scene, camera, gl]);
  useEffect(() => { let active = true; loadGraphicsQuality().then(q => { if (active) world.setQuality(q === 'low'); }).catch(() => {}); return () => { active = false; }; }, [world]);
  useEffect(() => world.setOutfit(outfit), [world, outfit]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (preview) { runner.distance += dt * 3.5; runner.elapsed += dt; }
    else advanceRunner(runner, dt);
    if (ghost) {
      if (!ghostState.current || ghostState.current.runner.tick > runner.tick) ghostState.current = { runner: createRunner(ghost.seed, 90), input: 0 };
      const replay = ghostState.current;
      while (replay.runner.tick < runner.tick && replay.runner.tick < ghost.ticks && replay.runner.status !== 'gameover') {
        while (ghost.inputs[replay.input]?.tick === replay.runner.tick) {
          const action = ghost.inputs[replay.input++].action;
          if (action === 'jump') jump(replay.runner); else if (action === 'slide') slide(replay.runner); else steer(replay.runner, action === 'left' ? -1 : 1);
        }
        advanceRunner(replay.runner, 1 / 60); replay.runner.events.length = 0;
      }
    }
    world.update(runner, dt, camera as PerspectiveCamera, preview, ghost ? ghostState.current?.runner : undefined);
    for (const event of runner.events) onEvent?.(event);
    runner.events.length = 0;
    reportTimer.current += dt;
    if (reportTimer.current >= 0.1) { onSnapshot?.(snapshot(runner)); reportTimer.current = 0; }
  });
  return <primitive object={world.root} dispose={null} />;
}
class RenderBoundary extends React.Component<{ children: React.ReactNode; onError?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  componentDidCatch(error: Error) { console.error('Rooftop scene startup failed:', error); this.props.onError?.(error); }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={styles.error}><Text style={styles.errorTitle}>The scene could not load</Text><Text style={styles.errorText}>Return to the city and try again.</Text></View>;
    return this.props.children;
  }
}
export const RunnerScene = React.memo(function RunnerScene(props: Props) {
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    // GLView is destroyed during navigation, before R3F's passive disposal.
    return () => { mounted.current = false; };
  }, []);
  return <RenderBoundary onError={props.onError}><Canvas style={StyleSheet.absoluteFill} camera={CAMERA} gl={GRAPHICS} onCreated={({ gl }) => {
    const context = gl.getContext();
    // Expo puts its native functions on the enumerable context prototype.
    for (const key in context) {
      const value = (context as any)[key];
      if (typeof value === 'function') {
        (context as any)[key] = (...args: unknown[]) => mounted.current ? value.apply(context, args) : key === 'getError' ? 0 : undefined;
      }
    }
    const render = gl.render.bind(gl);
    gl.render = (...args) => { if (mounted.current) render(...args); };
  }}><Suspense fallback={null}><World {...props} /></Suspense></Canvas></RenderBoundary>;
});
const styles = StyleSheet.create({
  error: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', backgroundColor: '#10252f', padding: 32 },
  errorTitle: { color: '#fff5df', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  errorText: { color: '#bac8ca', textAlign: 'center', lineHeight: 22 },
});
