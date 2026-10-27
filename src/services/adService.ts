import AsyncStorage from '@react-native-async-storage/async-storage';

const AD_CONSENT_KEY = 'neon-dash.ads-consent.v1';

export async function loadAdConsent(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(AD_CONSENT_KEY);
  return raw === 'true';
}

export async function saveAdConsent(consented: boolean): Promise<boolean> {
  const next = Boolean(consented);
  await AsyncStorage.setItem(AD_CONSENT_KEY, String(next));
  return next;
}

export async function initializeAds(): Promise<boolean> {
  const adMob = (() => {
    try {
      return require('expo-ads-admob');
    } catch (error) {
      return null;
    }
  })();

  if (!adMob) return false;

  try {
    if (typeof adMob.initialize === 'function') {
      await adMob.initialize();
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function showBannerAd(): Promise<boolean> {
  const consented = await loadAdConsent();
  if (!consented) return false;

  const adMob = (() => {
    try {
      return require('expo-ads-admob');
    } catch (error) {
      return null;
    }
  })();

  if (!adMob || typeof adMob.showAd === 'undefined') {
    return false;
  }

  try {
    await adMob.showAd();
    return true;
  } catch (error) {
    return false;
  }
}
