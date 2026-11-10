import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SOUND_KEY = 'neon-dash.sound-enabled.v1';

let soundEnabled = true;
let vibrationEnabled = true;
const VIBRATION_KEY = 'neon-dash.vibration-enabled.v2';
export async function loadVibrationSetting(): Promise<boolean> {
  vibrationEnabled = (await AsyncStorage.getItem(VIBRATION_KEY)) !== 'false';
  return vibrationEnabled;
}
export async function setVibrationEnabled(enabled: boolean): Promise<void> {
  vibrationEnabled = enabled;
  await AsyncStorage.setItem(VIBRATION_KEY, String(enabled));
}
let music: AudioPlayer | null = null;
let musicInit: Promise<void> | null = null;
let musicRequested = false;
const effectSources = {
  button: require('../assets/audio/button-click.wav'),
  jump: require('../assets/audio/jump.wav'),
  coin: require('../assets/audio/coin.wav'),
  crash: require('../assets/audio/crash.wav'),
  drone: require('../assets/audio/drone.wav'),
  footstep: require('../assets/audio/footstep.wav'),
  chaser: require('../assets/audio/chaser-shout.wav'),
  bird: require('../assets/audio/bird-caw.wav'),
  buzz: require('../assets/audio/drone-buzz.wav'),
};
type EffectName = keyof typeof effectSources;
const effectPlayers: Partial<Record<EffectName, AudioPlayer>> = {};
let isAudioModeReady = false;

export async function loadSoundSetting(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SOUND_KEY);
  if (raw == null) return true;
  const parsed = raw === 'true';
  soundEnabled = parsed;
  return parsed;
}

export async function saveSoundSetting(enabled: boolean): Promise<void> {
  soundEnabled = enabled;
  await AsyncStorage.setItem(SOUND_KEY, String(enabled));
  if (!enabled) {
    await setDroneBuzz(false);
    await stopMusic();
  } else {
    await startMusic();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  await saveSoundSetting(enabled);
}

async function ensureAudioMode(): Promise<void> {
  if (isAudioModeReady) return;
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  isAudioModeReady = true;
}

async function ensureMusic() {
  if (music || !soundEnabled) return;
  if (!musicInit) musicInit = (async () => {
    await ensureAudioMode();
    if (!soundEnabled || !musicRequested) return;
    music = createAudioPlayer(require('../assets/audio/rooftop-user-theme.mp3'));
    music.loop = true;
    music.volume = 0.3;
  })().finally(() => { musicInit = null; });
  await musicInit;
}

export async function startMusic(): Promise<void> {
  if (!soundEnabled) return;
  musicRequested = true;
  await ensureMusic();
  if (musicRequested && soundEnabled) music?.play();
}

export async function stopMusic(): Promise<void> {
  musicRequested = false;
  if (!music) return;
  music.pause();
  await music.seekTo(0);
}

export async function pauseMusic(): Promise<void> {
  await setDroneBuzz(false);
  musicRequested = false;
  if (!music) return;
  music.pause();
}

async function playEffect(effect: EffectName): Promise<void> {
  if (!soundEnabled) return;
  await ensureAudioMode();
  let player = effectPlayers[effect];
  if (player) {
    await player.seekTo(0);
  } else {
    player = createAudioPlayer(effectSources[effect]);
    effectPlayers[effect] = player;
  }
  player.play();
}

export function playButtonTap(): Promise<void> {
  return playEffect('button');
}

export function playJump(): Promise<void> {
  return playEffect('jump');
}
export function playDrone(): Promise<void> { return playEffect('drone'); }
export function playFootstep(): Promise<void> { return playEffect('footstep'); }
export function playChaserShout(): Promise<void> { return playEffect('chaser'); }
export function playBirdCaw(): Promise<void> { return playEffect('bird'); }
let buzzRequested=false;
export async function setDroneBuzz(active:boolean):Promise<void>{
  buzzRequested=active&&soundEnabled;
  if(!buzzRequested){effectPlayers.buzz?.pause();return;}
  await ensureAudioMode();if(!buzzRequested||!soundEnabled)return;
  const player=effectPlayers.buzz??(effectPlayers.buzz=createAudioPlayer(effectSources.buzz));
  player.loop=true;player.volume=.3;player.play();
}

export function playCoin(): Promise<void> {
  return playEffect('coin');
}

export function playCrash(): Promise<void> {
  return playEffect('crash');
}

export async function triggerImpact(): Promise<void> {
  if (!vibrationEnabled) return;
  if (typeof Haptics.impactAsync === 'function') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export async function triggerSelection(): Promise<void> {
  if (!vibrationEnabled) return;
  if (typeof Haptics.selectionAsync === 'function') {
    await Haptics.selectionAsync();
  }
}

export async function resumeAudioIfNeeded(): Promise<void> {
  if (soundEnabled) {
    await startMusic();
  }
}

export async function suspendAudio(): Promise<void> {
  await pauseMusic();
}
