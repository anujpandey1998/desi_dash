import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useLayoutEffect } from 'react';
import type { PerspectiveCamera } from 'three';
import { StyleSheet, Text, View } from 'react-native';
import { advanceRunner, snapshot, type Runner, type RunEvent, type RunSnapshot } from './simulation';
import { createRunnerWorld } from './world';

const CAMERA = { position: [0, 5.2, 10.5] as [number, number, number], fov: 65, near: 0.1, far: 220 };
const GRAPHICS = { antialias: false, powerPreference: 'high-performance' as const };

type Props = { runner: Runner; preview?: boolean; outfit?: number; onSnapshot?: (s: RunSnapshot) => void; onEvent?: (e: RunEvent) => void; onReady?: () => void; onError?: () => void };
function World({ runner, preview = false, outfit = 0, onSnapshot, onEvent, onReady }: Props) {
  const { scene, camera } = useThree();
  const world = useMemo(() => createRunnerWorld(), []);
  const reportTimer = useRef(0);
  useEffect(() => { world.configure(scene, camera as PerspectiveCamera); onReady?.(); return () => world.dispose(); }, [world, scene, camera]);
  useEffect(() => world.setOutfit(outfit), [world, outfit]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (preview) { runner.distance += dt * 3.5; runner.elapsed += dt; }
    else advanceRunner(runner, dt);
    world.update(runner, dt, camera as PerspectiveCamera, preview);
    for (const event of runner.events) onEvent?.(event);
    runner.events.length = 0;
    reportTimer.current += dt;
    if (reportTimer.current >= 0.1) { onSnapshot?.(snapshot(runner)); reportTimer.current = 0; }
  });
  return <primitive object={world.root} dispose={null} />;
}
class RenderBoundary extends React.Component<{ children: React.ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  componentDidCatch() { this.props.onError?.(); }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={styles.error}><Text style={styles.errorTitle}>3D renderer could not start</Text><Text style={styles.errorText}>Close and reopen the game. Use the updated APK with OpenGL support.</Text></View>;
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
