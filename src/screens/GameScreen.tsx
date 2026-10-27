import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RunnerScene } from '../game3d/RunnerScene';
import { createRunner, jump, pause, resetRunner, resume, slide, snapshot, steer, type RunEvent } from '../game3d/simulation';
import { loadOutfit } from '../game3d/profile';
import { loadHighScore, loadRunnerPhoto, loadWalletCoins, saveHighScore, saveWalletCoins } from '../services/runnerPhotoService';
import { loadVibrationSetting, loadSoundSetting, pauseMusic, playButtonTap, playCoin, playCrash, playJump, resumeAudioIfNeeded, triggerImpact } from '../services/audioService';

import { type InputAction, type RunInput, type Ticket } from '../game3d/challenges';
import { localTransaction, saveCompletedRun, startChallenge, submitChallenge, trackEvent } from '../services/socialService';
import { showCoinReward, showInterstitialIfDue, TEST_ADS } from '../services/adService';
import { loadTutorialComplete, saveTutorialComplete } from '../services/tutorialService';

export function GameScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const ticket = useRef<Ticket | undefined>(route?.params?.ticket);
  const inputs = useRef<RunInput[]>([]);
  const submitted = useRef(false), uploading = useRef(false), adLock = useRef(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [adBusy, setAdBusy] = useState(false), [doubled, setDoubled] = useState(false);
  const [tutorialReady, setTutorialReady] = useState(Boolean(ticket.current));
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tutorialSaving, setTutorialSaving] = useState(false);
  const runner = useMemo(() => {
    const created = createRunner(ticket.current?.challenge.seed, ticket.current?.challenge.limit || 0);
    if (!ticket.current) pause(created);
    return created;
  }, []);
  const [hud, setHud] = useState(() => snapshot(runner));
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [best, setBest] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [outfit, setOutfit] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);
  const banked = useRef(false), saveTask = useRef<Promise<void> | null>(null);
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoinSound = useRef(0);
  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 1800);
  }, []);
  const bank = useCallback(() => {
    if (saveTask.current) return saveTask.current;
    if (banked.current) return Promise.resolve();
    const finalScore = runner.score, collected = runner.coins;
    setSaving(true);
    saveTask.current = localTransaction(async () => {
      const saved = await saveCompletedRun(finalScore, runner.distance, collected, runner.status === 'gameover');
      setBest(saved.best); setWallet(saved.wallet); banked.current = true;
    }).catch(() => { showNotice('Progress could not be saved. Try again.'); }).finally(() => { setSaving(false); saveTask.current = null; });
    return saveTask.current;
  }, [runner, showNotice]);
  useEffect(() => {
    if (ticket.current) return;
    let active = true;
    loadTutorialComplete().then(complete => {
      if (!active) return;
      setTutorialStep(complete ? null : 0);
      setTutorialReady(true);
      if (!complete) { runner.training = true; runner.status = 'running'; runner.countdown = 0; for (const entity of runner.entities) entity.active = false; }
      else resume(runner);
      setHud(snapshot(runner));
    }).catch(error => {
      if (!active) return;
      setTutorialReady(true);
      setTutorialStep(null);
      resetRunner(runner);
      resume(runner);
      setHud(snapshot(runner));
      showNotice(error instanceof Error ? error.message : 'Tutorial could not be loaded.');
    });
    return () => { active = false; };
  }, [runner, showNotice]);
  useEffect(() => {
    loadHighScore().then(setBest).catch(() => {});
    loadWalletCoins().then(setWallet).catch(() => {});
    loadRunnerPhoto().then(setPhoto).catch(() => {});
    loadOutfit().then(setOutfit).catch(() => {});
    void loadVibrationSetting().catch(() => {});
    loadSoundSetting().then(() => { if (AppState.currentState === 'active') void resumeAudioIfNeeded().catch(() => {}); }).catch(() => {});
    return () => { if (tutorialTimer.current) clearTimeout(tutorialTimer.current); if (noticeTimer.current) clearTimeout(noticeTimer.current); void pauseMusic().catch(() => {}); };
  }, []);
  const maybeShowInterstitial = useCallback(async () => {
    if (ticket.current || runner.status !== 'gameover') return;
    adLock.current = true;
    setAdBusy(true);
    try { await showInterstitialIfDue(); }
    catch { showNotice('The ad could not be loaded. You can continue playing.'); }
    finally { adLock.current = false; setAdBusy(false); }
  }, [runner, showNotice]);
  const goHome = useCallback(async () => {
    if (leaving.current || adLock.current) return;
    const finishedSoloRun = runner.status === 'gameover' && !ticket.current;
    leaving.current = true; pause(runner); await bank();
    if (finishedSoloRun) await maybeShowInterstitial();
    if (banked.current) navigation.goBack(); else leaving.current = false;
  }, [runner, bank, navigation, maybeShowInterstitial]);
  const togglePause = useCallback(() => {
    if (runner.status === 'paused') { resume(runner); void resumeAudioIfNeeded().catch(() => {}); }
    else { pause(runner); void pauseMusic().catch(() => {}); }
    setHud(snapshot(runner));
  }, [runner]);
  useEffect(() => {
    const app = AppState.addEventListener('change', state => {
      if (state === 'active' && runner.training) { resume(runner); setHud(snapshot(runner)); }
      if (state !== 'active') { pause(runner); setHud(snapshot(runner)); void pauseMusic().catch(() => {}); }
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (runner.training) { void goHome(); return true; }
      if (runner.status === 'running' || runner.status === 'ready') togglePause(); else void goHome();
      return true;
    });
    return () => { app.remove(); back.remove(); };
  }, [runner, togglePause, goHome]);
  const upload = useCallback(async () => {
    if (!ticket.current || submitted.current || uploading.current) return;
    uploading.current = true;
    setUploadStatus('Verifying your run...');
    try { await submitChallenge(ticket.current, runner.tick, inputs.current); submitted.current = true; setUploadStatus('Verified score posted! Refresh your room leaderboard.'); }
    catch { setUploadStatus('Score upload failed. Tap RETRY UPLOAD before leaving.'); }
    finally { uploading.current = false; }
  }, [runner]);
  const input = useCallback((action: InputAction) => {
    if (runner.status !== 'running') return;
    if (ticket.current) inputs.current.push({ tick: runner.tick, action });
    if (action === 'jump') jump(runner); else if (action === 'slide') slide(runner); else steer(runner, action === 'left' ? -1 : 1);
  }, [runner]);
  const doubleCoins = async () => {
    if (adLock.current || adBusy || doubled || ticket.current || runner.coins < 1) return;
    adLock.current = true;
    setAdBusy(true);
    try {
      await bank(); if (!banked.current) return;
      const earned = await showCoinReward();
      if (!earned) { showNotice('No reward earned. Ad unavailable or closed early.'); return; }
      await localTransaction(async () => { const next = await loadWalletCoins() + runner.coins; await saveWalletCoins(next); setWallet(next); });
      setDoubled(true); showNotice('BONUS COINS ADDED');
    } catch { showNotice('Reward could not be saved.'); } finally { adLock.current = false; setAdBusy(false); }
  };
  const onEvent = useCallback((event: RunEvent) => {
    if (event === 'jump') void playJump().catch(() => {});
    if (event === 'coin' && Date.now() - lastCoinSound.current > 80) { lastCoinSound.current = Date.now(); void playCoin().catch(() => {}); }
    if (event === 'shield') showNotice('SHIELD READY');
    if (event === 'milestone') showNotice(`${runner.milestone - 500} m CHECKPOINT`);
    if (event === 'impact') { void triggerImpact().catch(() => {}); if (runner.status !== 'gameover') showNotice('SHIELD SAVED YOU'); }
    if (event === 'gameover') { void playCrash().catch(() => {}); void pauseMusic().catch(() => {}); setHud(snapshot(runner)); void bank(); void upload(); if (!ticket.current) void trackEvent('runs_finished').catch(() => {}); }
  }, [runner, bank, showNotice, upload]);
  const handled = useRef(false);
  const applySwipe = useCallback((dx: number, dy: number) => {
    if (Math.abs(dx) > Math.abs(dy)) input(dx < 0 ? 'left' : 'right');
    else if (dy < 0) input('jump'); else input('slide');
  }, [input]);
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => runner.status === 'running',
    onMoveShouldSetPanResponder: () => runner.status === 'running',
    onPanResponderGrant: () => { handled.current = false; },
    onPanResponderMove: (_, g) => { if (!handled.current && Math.max(Math.abs(g.dx), Math.abs(g.dy)) > 32) { applySwipe(g.dx, g.dy); handled.current = true; } },
    onPanResponderRelease: (_, g) => { if (!handled.current) { if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) < 14) input('jump'); else applySwipe(g.dx, g.dy); } },
  }), [runner, applySwipe, input]);
  const retry = async () => {
    if (adLock.current || uploading.current) return;
    await bank(); if (!banked.current) return;
    await maybeShowInterstitial();
    if (adLock.current) return;
    if (ticket.current) { try { ticket.current = await startChallenge(ticket.current.challenge.code); } catch { showNotice('Cannot start challenge. Check your connection.'); return; } }
    inputs.current = []; submitted.current = false; setUploadStatus(''); setDoubled(false);
    banked.current = false; resetRunner(runner, ticket.current?.challenge.seed); setHud(snapshot(runner)); setNotice('');
    void playButtonTap().catch(() => {}); void resumeAudioIfNeeded().catch(() => {});
  };
  const tutorialActions: InputAction[] = ['left', 'jump', 'slide'];
  const tutorialCopy = [
    { title: 'Switch lanes', detail: 'Swipe left or right, or use the lane buttons to dodge rooftop obstacles.', label: 'TRY LEFT LANE' },
    { title: 'Jump barriers', detail: 'Swipe up or tap JUMP to clear low barriers.', label: 'TRY JUMP' },
    { title: 'Slide under lines', detail: 'Swipe down or tap SLIDE to duck beneath clotheslines.', label: 'TRY SLIDE' },
  ];
  const practiceTutorial = async (action: InputAction) => {
    if (tutorialStep === null || tutorialSaving) return;
    if (action !== tutorialActions[tutorialStep]) {
      showNotice('Try the highlighted control to continue.');
      return;
    }
    input(action);
    setTutorialSaving(true);
    tutorialTimer.current = setTimeout(() => {
    if (tutorialStep < tutorialActions.length - 1) {
      setTutorialStep(tutorialStep + 1);
      setTutorialSaving(false);
      return;
    }
    setTutorialSaving(true);
    void finishTutorial();
    }, 850);
  };
  const finishTutorial = async () => {
    try { await saveTutorialComplete(); }
    catch { showNotice('Tutorial progress could not be saved.'); }
    finally {
      setTutorialSaving(false);
      setTutorialStep(null);
      resume(runner);
      setHud(snapshot(runner));
    }
  };
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setRenderError(true), []);
  const progress = Math.min(100, hud.distance % 500 / 5);
  return <View style={styles.root}>
    <StatusBar hidden />
    <RunnerScene runner={runner} ghost={ticket.current?.ghost} outfit={outfit} onSnapshot={setHud} onEvent={onEvent} onReady={onReady} onError={onError} />
    <View style={StyleSheet.absoluteFill} {...gesture.panHandlers} />
    <View pointerEvents="box-none" style={[styles.hud, { top: insets.top + 12, left: insets.left + 18, right: insets.right + 18 }]}>
      <View style={styles.topRow}>
        <View style={styles.coinPill}>{photo && <Image source={{ uri: photo }} style={styles.avatar} />}<Text style={styles.coinSymbol}>●</Text><Text style={styles.coinValue}>{hud.coins}</Text></View>
        <View pointerEvents="none" style={styles.scoreBox}><Text style={[styles.small, { color: '#3b5b65' }]}>SCORE</Text><Text style={styles.score}>{hud.score.toLocaleString()}</Text></View>
        <Pressable accessibilityLabel="Pause game" disabled={!tutorialReady || tutorialStep !== null} onPress={togglePause} style={styles.pause}><Text style={styles.pauseText}>Ⅱ</Text></Pressable>
      </View>
      <View pointerEvents="none" style={styles.metrics}><Text style={styles.metric}>{hud.distance} m</Text><Text style={styles.metric}>{hud.shield ? 'SHIELD ON' : `${hud.speed} km/h`}</Text></View>
      <View pointerEvents="none" style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      <Text pointerEvents="none" style={styles.target}>{ticket.current ? 'FRIEND RACE - ' + Math.max(0, Math.ceil(90 - runner.elapsed)) + 's LEFT' : 'NEXT DELIVERY  ' + hud.milestone + ' m'}</Text>
    </View>
    {!!notice && <View pointerEvents="none" style={[styles.notice, { top: insets.top + 155 }]}><Text style={styles.noticeText}>{notice}</Text></View>}
    {hud.status === 'running' && <View style={[styles.controls, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
      {(['left', 'jump', 'slide', 'right'] as const).map((action, i) => <Pressable key={action} accessibilityLabel={action} onPress={() => input(action)} style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}><Text style={styles.controlIcon}>{['‹', '↑', '↓', '›'][i]}</Text><Text style={styles.controlLabel}>{action.toUpperCase()}</Text></Pressable>)}
    </View>}
    {!ready && !renderError && <View style={styles.veil}><ActivityIndicator color="#f1bd5b" size="large" /><Text style={styles.loading}>Preparing the city...</Text></View>}
    {ready && !tutorialReady && <View style={styles.veil}><ActivityIndicator color="#f1bd5b" size="large" /><Text style={styles.loading}>Getting your controls ready...</Text></View>}
    {ready && tutorialStep !== null && <View style={[styles.veil, { backgroundColor: 'transparent', justifyContent: 'flex-end', paddingBottom: Math.max(insets.bottom, 12) + 12 }]}><View style={[styles.card, { padding: 20 }]}><Text style={styles.eyebrow}>FIRST DELIVERY · {tutorialStep + 1}/3</Text><Text style={styles.title}>{tutorialCopy[tutorialStep].title}</Text><Text style={styles.description}>{tutorialCopy[tutorialStep].detail}</Text><Pressable disabled={tutorialSaving} style={styles.primary} onPress={() => void practiceTutorial(tutorialActions[tutorialStep])}><Text style={styles.primaryText}>{tutorialSaving ? 'SAVING...' : tutorialCopy[tutorialStep].label}</Text></Pressable><Text style={styles.instructions}>You can use swipes or the on-screen controls once the run begins.</Text></View></View>}
    {ready && hud.status === 'ready' && <View pointerEvents="none" style={styles.countdown}><Text style={styles.eyebrow}>YOUR RUN STARTS IN</Text><Text style={styles.count}>{hud.countdown || 'GO'}</Text><Text style={styles.instructions}>Swipe to change lanes · Up to jump · Down to slide</Text></View>}
    {hud.status === 'paused' && tutorialStep === null && tutorialReady && <View style={styles.veil}><ScrollView style={styles.card} contentContainerStyle={{ padding: 27 }}><Text style={styles.eyebrow}>TAKE A BREATHER</Text><Text style={styles.title}>Run paused.</Text><Text style={styles.description}>The city will wait for you.</Text><Pressable style={styles.primary} onPress={togglePause}><Text style={styles.primaryText}>CONTINUE RUN</Text></Pressable><Pressable style={styles.secondary} disabled={saving || adBusy} onPress={() => void goHome()}><Text style={styles.secondaryText}>BACK TO CITY</Text></Pressable></ScrollView></View>}
    {hud.status === 'gameover' && <View style={styles.veil}><ScrollView style={styles.card} contentContainerStyle={{ padding: 27 }}><Text style={styles.eyebrow}>UNTIL THE NEXT RUN</Text><Text style={styles.title}>What a run.</Text><View style={styles.resultRow}><View><Text style={styles.small}>FINAL SCORE</Text><Text style={styles.resultScore}>{hud.score.toLocaleString()}</Text></View><View><Text style={styles.small}>DISTANCE</Text><Text style={styles.resultDistance}>{hud.distance} m</Text></View></View><Text style={styles.description}>Best {Math.max(best, hud.score).toLocaleString()}   ·   +{hud.coins} coins   ·   Wallet {wallet}</Text>{!!ticket.current && <><Text style={styles.description}>{uploadStatus}</Text>{!submitted.current && <Pressable style={styles.secondary} onPress={() => void upload()}><Text style={styles.secondaryText}>RETRY UPLOAD</Text></Pressable>}</>}{!ticket.current && hud.coins > 0 && <Pressable disabled={saving || adBusy || doubled} style={[styles.secondary, { paddingBottom: 20 }]} onPress={() => void doubleCoins()}><Text style={styles.secondaryText}>{doubled ? 'BONUS CLAIMED' : adBusy ? 'LOADING AD...' : 'WATCH ' + (TEST_ADS ? 'TEST ' : '') + 'AD - DOUBLE COINS'}</Text></Pressable>}<Pressable disabled={saving || adBusy} style={styles.primary} onPress={() => void retry()}><Text style={styles.primaryText}>{saving ? 'SAVING RUN...' : 'RUN AGAIN'}</Text></Pressable><Pressable disabled={saving} style={styles.secondary} onPress={() => void goHome()}><Text style={styles.secondaryText}>BACK TO CITY</Text></Pressable></ScrollView></View>}
    {renderError && <View style={styles.veil}><ScrollView style={styles.card} contentContainerStyle={{ padding: 27 }}><Text style={styles.title}>3D could not start.</Text><Text style={styles.description}>Close and reopen the updated APK. The game needs a working OpenGL graphics context.</Text><Pressable style={styles.primary} onPress={() => navigation.goBack()}><Text style={styles.primaryText}>BACK TO CITY</Text></Pressable></ScrollView></View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#9bc3cc' }, hud: { position: 'absolute' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coinPill: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#102c39e8', borderRadius: 22, paddingHorizontal: 12, paddingVertical: 9, minWidth: 80 },
  coinSymbol: { color: '#f6c350', fontSize: 19 }, coinValue: { color: '#fff5dc', fontSize: 19, fontWeight: '900' }, avatar: { width: 24, height: 24, borderRadius: 12 },
  scoreBox: { alignItems: 'center' }, small: { color: '#9facb3', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  score: { color: '#142e3a', fontSize: 31, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pause: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102c39e8', borderRadius: 15 }, pauseText: { color: '#fff5dc', fontSize: 23, fontWeight: '900' },
  metrics: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' }, metric: { color: '#183a48', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  progressTrack: { height: 4, backgroundColor: '#1a3e4830', borderRadius: 3, marginTop: 8, overflow: 'hidden' }, progressFill: { height: 4, backgroundColor: '#df813f' }, target: { color: '#31535c', fontSize: 8, fontWeight: '800', letterSpacing: 1.6, marginTop: 6 },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  control: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#ffffff45', backgroundColor: '#153340cc' }, controlPressed: { backgroundColor: '#de833f' },
  controlIcon: { color: '#fff6e8', fontSize: 30, lineHeight: 34, fontWeight: '700' }, controlLabel: { color: '#d5e1df', fontSize: 8, letterSpacing: 1.3, fontWeight: '800' },
  veil: { ...StyleSheet.absoluteFill, backgroundColor: '#071d2c88', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 390, backgroundColor: '#102a36', borderRadius: 28, flexGrow: 0, maxHeight: '100%', borderWidth: 1, borderColor: '#ffffff20' },
  eyebrow: { color: '#eab75e', letterSpacing: 2.5, fontSize: 10, fontWeight: '900' }, title: { color: '#fff3d9', fontWeight: '900', fontSize: 34, marginTop: 12, letterSpacing: -1 },
  description: { color: '#adc3c6', fontSize: 12, lineHeight: 21, marginTop: 14, marginBottom: 22 },
  primary: { backgroundColor: '#f3bc5a', borderRadius: 15, paddingVertical: 18, alignItems: 'center' }, primaryText: { color: '#21313a', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  secondary: { alignItems: 'center', paddingTop: 20, paddingBottom: 5 }, secondaryText: { color: '#b6cacb', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  resultRow: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultScore: { color: '#fff3d9', fontSize: 38, fontWeight: '900', marginTop: 7 }, resultDistance: { color: '#eab75e', fontSize: 23, fontWeight: '800', marginTop: 7 },
  countdown: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 24 }, count: { color: '#fff7e7', fontSize: 110, fontWeight: '900', textShadowColor: '#20333c', textShadowRadius: 12 }, instructions: { color: '#173747', backgroundColor: '#fff2d9e8', padding: 14, borderRadius: 13, fontSize: 11, textAlign: 'center', fontWeight: '700' },
  loading: { color: '#fff1d3', fontSize: 14, marginTop: 18 }, notice: { position: 'absolute', alignSelf: 'center', zIndex: 20, padding: 12, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#163b47eb' }, noticeText: { color: '#f8cf76', fontWeight: '900', fontSize: 11, letterSpacing: 1.4 },
});
