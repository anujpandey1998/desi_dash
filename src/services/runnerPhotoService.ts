import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const PHOTO_KEY = 'neon-dash.runner-photo.v1';
const HIGH_SCORE_KEY = 'neon-dash.high-score.v1';
const WALLET_KEY = 'neon-dash.wallet-coins.v1';

export async function loadRunnerPhoto(): Promise<string | null> {
  const uri = await AsyncStorage.getItem(PHOTO_KEY);
  if (!uri) return null;
  const file = await FileSystem.getInfoAsync(uri);
  return file.exists ? uri : null;
}

export async function saveRunnerPhoto(sourceUri: string): Promise<string> {
  const previous = await AsyncStorage.getItem(PHOTO_KEY);
  const destination = `${FileSystem.documentDirectory}runner-face-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  await AsyncStorage.setItem(PHOTO_KEY, destination);
  if (previous) await FileSystem.deleteAsync(previous, { idempotent: true });
  return destination;
}

export async function removeRunnerPhoto(): Promise<void> {
  const uri = await AsyncStorage.getItem(PHOTO_KEY);
  if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  await AsyncStorage.removeItem(PHOTO_KEY);
}

export async function loadHighScore(): Promise<number> {
  const raw = await AsyncStorage.getItem(HIGH_SCORE_KEY);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function saveHighScore(score: number): Promise<number> {
  const next = Math.max(0, Math.floor(score));
  await AsyncStorage.setItem(HIGH_SCORE_KEY, String(next));
  return next;
}

export async function loadWalletCoins(): Promise<number> {
  const raw = await AsyncStorage.getItem(WALLET_KEY);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export async function saveWalletCoins(totalCoins: number): Promise<number> {
  const next = Math.max(0, Math.floor(totalCoins));
  await AsyncStorage.setItem(WALLET_KEY, String(next));
  return next;
}
