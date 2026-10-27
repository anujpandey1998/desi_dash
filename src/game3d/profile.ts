import AsyncStorage from '@react-native-async-storage/async-storage';
import { localTransaction } from '../services/socialService';
export const OUTFITS = [
  { name: 'Sunset', color: '#ef6c35' },
  { name: 'Ocean', color: '#2ba6a0' },
  { name: 'Night', color: '#6963ba' },
  { name: 'Marigold', color: '#e8ae35' },
  { name: 'Rose', color: '#cf668b' },
] as const;
export async function loadOutfit() {
  const index = Number(await AsyncStorage.getItem('neon-dash.outfit.v2'));
  return Number.isInteger(index) && index >= 0 && index < OUTFITS.length ? index : 0;
}
export async function saveOutfit(index: number) {
  if (index >= 0 && index < OUTFITS.length) await AsyncStorage.setItem('neon-dash.outfit.v2', String(index));
}

export const OUTFIT_PRICES = [0, 0, 0, 250, 500];
export async function loadOwnedOutfits(): Promise<number[]> { return [0, 1, 2, ...JSON.parse((await AsyncStorage.getItem('rooftop.outfits')) || '[]')]; }
export async function unlockOutfit(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= OUTFITS.length) throw Error('Unknown outfit.');
  return localTransaction(async () => {
    const owned = await loadOwnedOutfits();
    if (!owned.includes(index)) {
      const coins = Number(await AsyncStorage.getItem('neon-dash.wallet-coins.v1')) || 0;
      if (coins < OUTFIT_PRICES[index]) throw Error('Collect more coins or claim daily missions to unlock this outfit.');
      owned.push(index);
      await AsyncStorage.multiSet([['neon-dash.wallet-coins.v1', String(coins - OUTFIT_PRICES[index])], ['rooftop.outfits', JSON.stringify(owned)]]);
    }
    await saveOutfit(index); return owned;
  });
}

export async function loadGraphicsQuality(): Promise<'low' | 'standard'> { return await AsyncStorage.getItem('rooftop.graphics') === 'low' ? 'low' : 'standard'; }
export async function saveGraphicsQuality(value: 'low' | 'standard') { await AsyncStorage.setItem('rooftop.graphics', value); }
