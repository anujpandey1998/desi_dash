import AsyncStorage from '@react-native-async-storage/async-storage';
export const OUTFITS = [
  { name: 'Sunset', color: '#ef6c35' },
  { name: 'Ocean', color: '#2ba6a0' },
  { name: 'Night', color: '#6963ba' },
] as const;
export async function loadOutfit() {
  const index = Number(await AsyncStorage.getItem('neon-dash.outfit.v2'));
  return Number.isInteger(index) && index >= 0 && index < OUTFITS.length ? index : 0;
}
export async function saveOutfit(index: number) {
  if (index >= 0 && index < OUTFITS.length) await AsyncStorage.setItem('neon-dash.outfit.v2', String(index));
}
