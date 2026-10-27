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
const effectSources = {
  button: require('../assets/audio/button-click.wav'),
  jump: require('../assets/audio/jump.wav'),
  coin: require('../assets/audio/coin.wav'),
  crash: require('../assets/audio/crash.wav'),
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
  await ensureAudioMode();
  music = createAudioPlayer(require('../assets/audio/bg-loop.wav'));
  music.loop = true;
  music.volume = 0.4;
  music.play();
}

export async function startMusic(): Promise<void> {
  if (!soundEnabled) return;
  if (music) {
    music.play();
    return;
  }
  await ensureMusic();
}

export async function stopMusic(): Promise<void> {
  if (!music) return;
  music.pause();
  await music.seekTo(0);
}

export async function pauseMusic(): Promise<void> {
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
