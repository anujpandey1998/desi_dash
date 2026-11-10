import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, { AdsConsent, AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { trackEvent } from './socialService';
import { isInterstitialDue } from './adPolicy';
import { AD_UNITS } from '../constants/adUnits';
export { TEST_ADS } from '../constants/adUnits';
let initialized: Promise<boolean> | null = null, showing = false;
export async function initializeAds(): Promise<boolean> {
 if (!initialized) initialized = (async () => {
  try { const { canRequestAds } = await AdsConsent.gatherConsent(); if (!canRequestAds) return false; await mobileAds().initialize(); return true; }
  catch { return false; }
 })();
 const ready = await initialized; if (!ready) initialized = null; return ready;
}
export async function showAdsPrivacyOptions() { await AdsConsent.showPrivacyOptionsForm(); }
export async function showInterstitialIfDue(): Promise<boolean> {
 if (showing) return false;
 showing = true;
 try {
 const metricsKey = 'rooftop.v1.metrics';
 const metrics = JSON.parse((await AsyncStorage.getItem(metricsKey)) || '{}');
 const completedRuns = Number(metrics.runs_finished) || 0;
 const lastShownRun = Number(await AsyncStorage.getItem('rooftop.v1.interstitial-last-run')) || 0;
 const lastShownAt = Number(await AsyncStorage.getItem('rooftop.v1.interstitial-last-time')) || 0;
 const now = Date.now();
 if (!isInterstitialDue(completedRuns, lastShownRun, lastShownAt, now)) return false;
  if (!await initializeAds()) return false;
  const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial);
  return await new Promise<boolean>(resolve => {
   let finished = false, loaded = false;
   const listeners: (() => void)[] = [];
   const finish = (shown: boolean) => {
    if (finished) return;
    finished = true; clearTimeout(timer); listeners.forEach(unsubscribe => unsubscribe()); resolve(shown);
   };
   const timer = setTimeout(() => finish(false), 25000);
   listeners.push(ad.addAdEventListener(AdEventType.LOADED, () => {
    if (loaded) return;
    loaded = true;
    clearTimeout(timer);
    void ad.show().catch(() => finish(false));
   }));
   listeners.push(ad.addAdEventListener(AdEventType.OPENED, () => {
    void AsyncStorage.multiSet([
      ['rooftop.v1.interstitial-last-run', String(completedRuns)],
      ['rooftop.v1.interstitial-last-time', String(Date.now())],
    ]).then(() => trackEvent('interstitial_shown')).catch(() => {});
   }));
   listeners.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(true)));
   listeners.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(false)));
   ad.load();
   void trackEvent('interstitial_requested').catch(() => {});
  });
 } finally { showing = false; }
}
// Only a real EARNED_REWARD event grants coins. A load failure or dismissal grants nothing.
export async function showRewardedReceipt(): Promise<string | null> {
 const earned = await showCoinReward();
 return earned ? `earned-${Date.now()}-${Math.random().toString(36).slice(2)}` : null;
}
export async function showCoinReward(): Promise<boolean> {
 if (showing) return false; showing = true;
 try {
  if (!await initializeAds()) return false;
  const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded);
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
