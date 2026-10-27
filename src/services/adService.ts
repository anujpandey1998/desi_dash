import mobileAds, { AdsConsent, AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { trackEvent } from './socialService';
export const TEST_ADS = !process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;
let initialized: Promise<boolean> | null = null, showing = false;
export async function initializeAds(): Promise<boolean> {
 if (!initialized) initialized = (async () => {
  try { const { canRequestAds } = await AdsConsent.gatherConsent(); if (!canRequestAds) return false; await mobileAds().initialize(); return true; }
  catch { return false; }
 })();
 const ready = await initialized; if (!ready) initialized = null; return ready;
}
export async function showAdsPrivacyOptions() { await AdsConsent.showPrivacyOptionsForm(); }
// Only a real EARNED_REWARD event grants coins. A load failure or dismissal grants nothing.
export async function showCoinReward(): Promise<boolean> {
 if (showing) return false; showing = true;
 try {
  if (!await initializeAds()) return false;
  const ad = RewardedAd.createForAdRequest(process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || TestIds.REWARDED);
  return await new Promise<boolean>(resolve => {
   let earned = false, finished = false;
   const listeners: (() => void)[] = [];
   const finish = () => { if (finished) return; finished = true; clearTimeout(timer); listeners.forEach(unsubscribe => unsubscribe()); resolve(earned); };
   // Timeout applies only to loading, never to an ad already being watched.
   const timer = setTimeout(finish, 25000);
   listeners.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => { clearTimeout(timer); void ad.show().catch(finish); }));
   listeners.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; void trackEvent('rewarded_completed').catch(() => {}); }));
   listeners.push(ad.addAdEventListener(AdEventType.CLOSED, finish));
   listeners.push(ad.addAdEventListener(AdEventType.ERROR, finish));
   ad.load(); void trackEvent('rewarded_requested').catch(() => {});
  });
 } finally { showing = false; }
}
