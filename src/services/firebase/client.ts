import { getApp, getApps } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

export function firebaseStatus(): {configured:boolean;error:string} {
  try {
    // A secondary app does not supply the default app used by Auth/Firestore.
    return {configured:getApps().some(app=>app.name==='[DEFAULT]'),error:''};
  } catch(error) {
    // Native bridge/configuration failures must not crash the offline game during render.
    return {configured:false,error:error instanceof Error?error.message:'Online services could not initialize.'};
  }
}
export const firebaseConfigured = () => firebaseStatus().configured;
export const auth = () => getAuth(getApp());
export const database = () => getFirestore(getApp());
// MANUAL: Deploy Functions in this region, or change EXPO_PUBLIC_FIREBASE_REGION.
export const functions = () => getFunctions(getApp(), process.env.EXPO_PUBLIC_FIREBASE_REGION || 'asia-south1');
let ready: Promise<void> | undefined;
export function initializeFirebase(): Promise<void> {
  if (!firebaseConfigured()) return Promise.reject(Error('Firebase setup pending. Add android/app/google-services.json and rebuild.'));
  if (!ready) ready = (async () => {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({ android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
      // MANUAL: Register this local debug token in Firebase Console; never commit it.
      ...(__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN ? { debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN } : {}),
    }});
    await initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
