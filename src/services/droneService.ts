import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECONOMY } from '../constants/economy';
import { localTransaction } from './socialService';

const KEY = 'rooftop.drone-economy.v1', WALLET = 'neon-dash.wallet-coins.v1';
type Inventory = { passes: number; receipts: string[]; coinAdAt: number; reservation?: string };
async function read(): Promise<Inventory> {
  const raw = await AsyncStorage.getItem(KEY), data = raw ? JSON.parse(raw) : {};
  const passes = Number(data.passes), coinAdAt = Number(data.coinAdAt);
  return { passes: Number.isSafeInteger(passes) && passes >= 0 ? passes : 0, receipts: Array.isArray(data.receipts) ? data.receipts.filter((r: unknown) => typeof r === 'string').slice(-64) : [], coinAdAt: Number.isFinite(coinAdAt) && coinAdAt > 0 ? coinAdAt : 0, reservation: data.reservation };
}
async function wallet() { const value = Number(await AsyncStorage.getItem(WALLET)); return Number.isSafeInteger(value) && value >= 0 ? value : 0; }
export function loadDroneInventory() {
  return localTransaction(async () => {
    const data = await read();
    if (data.reservation) { data.passes++; delete data.reservation; await AsyncStorage.setItem(KEY, JSON.stringify(data)); }
    return { passes: data.passes, coins: await wallet(), coinAdAt: data.coinAdAt };
  });
}
export function buyDronePass() {
  return localTransaction(async () => {
    const data = await read(), coins = await wallet();
    if (coins < ECONOMY.dronePrice) throw Error(`You need ${ECONOMY.dronePrice} coins for a drone.`);
    data.passes++;
    await AsyncStorage.multiSet([[WALLET, String(coins - ECONOMY.dronePrice)], [KEY, JSON.stringify(data)]]);
    return { passes: data.passes, coins: coins - ECONOMY.dronePrice };
  });
}
/** Only pass receipts issued after the SDK's EARNED_REWARD event. */
export function grantAdBenefit(receipt: string | null, benefit: 'coins' | 'drone' | 'revive', now = Date.now()) {
  return localTransaction(async () => {
    if (!receipt) throw Error('Complete the rewarded ad to claim this reward.');
    const data = await read(), coins = await wallet();
    if (data.receipts.includes(receipt)) return { passes: data.passes, coins, coinAdAt: data.coinAdAt, granted:false };
    if (benefit === 'coins' && data.coinAdAt && now - data.coinAdAt < ECONOMY.coinAdCooldownMs) throw Error('Your coin bonus is cooling down. Try again shortly.');
    const nextCoins = coins + (benefit === 'coins' ? ECONOMY.adCoins : 0);
    if (benefit === 'coins') data.coinAdAt = now; else if(benefit==='drone') data.passes++;
    data.receipts = [...data.receipts.slice(-63), receipt];
    await AsyncStorage.multiSet([[WALLET, String(nextCoins)], [KEY, JSON.stringify(data)]]);
    return { passes: data.passes, coins: nextCoins, coinAdAt: data.coinAdAt, granted:true };
  });
}
export function useDronePass(canStart: () => boolean, start: () => boolean) {
  return localTransaction(async () => {
    const data = await read();
    if (!canStart()) throw Error('Start a solo run and let your drone cool down first.');
    if (!data.passes || data.reservation) throw Error('Get a drone pass first.');
    data.passes--; data.reservation = `flight-${Date.now()}`;
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    if (!canStart() || !start()) {
      data.passes++; delete data.reservation; await AsyncStorage.setItem(KEY, JSON.stringify(data));
      throw Error('Flight could not start. Your pass is saved.');
    }
    delete data.reservation;
    await AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
    return data.passes;
  });
}
