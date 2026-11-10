import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithCredential, GoogleAuthProvider, signOut, updateProfile } from '@react-native-firebase/auth';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { ensureProfile, renameUser } from './userService';
import { auth, initializeFirebase } from './client';
import { normalizeCourierName } from '../../game3d/profile';

function credentials(email:string,password:string) {
  const clean=email.trim();
  if(!/^\S+@\S+\.\S+$/.test(clean))throw Error('Valid email daalo.');
  if(password.length<8)throw Error('Password kam se kam 8 characters ka rakho.');
  return clean;
}
export async function login(email:string,password:string) {
  await initializeFirebase();
  return signInWithEmailAndPassword(auth(),email.trim(),password);
}
export async function signup(email:string,password:string,name:string) {
  const clean=credentials(email,password),displayName=normalizeCourierName(name);
  if(!displayName)throw Error('Courier ka naam daalo.');
  await initializeFirebase();
  const result=await createUserWithEmailAndPassword(auth(),clean,password);
  await updateProfile(result.user,{displayName});
  await ensureProfile(result.user);await renameUser(result.user.uid,displayName);
  await sendEmailVerification(result.user);
  return result;
}
export async function resetPassword(email:string) {
  if(!/^\S+@\S+\.\S+$/.test(email.trim()))throw Error('Valid email daalo.');
  await initializeFirebase();await sendPasswordResetEmail(auth(),email.trim());
}
export async function googleLogin() {
  await initializeFirebase();
  // MANUAL: Web OAuth client ID, not Android client ID. This is public config, not an API secret.
  const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if(!webClientId)throw Error('Google login setup pending. Configure the Web OAuth client ID.');
  GoogleSignin.configure({webClientId});
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
  const result=await GoogleSignin.signIn();
  if(!isSuccessResponse(result))return;
  if(!result.data.idToken)throw Error('Google token nahi mila. OAuth setup check karo.');
  return signInWithCredential(auth(),GoogleAuthProvider.credential(result.data.idToken));
}
export async function logout() {
  await signOut(auth());
  if(GoogleSignin.hasPreviousSignIn())await GoogleSignin.signOut().catch(()=>{});
}
export async function resendVerification() {
  const user=auth().currentUser;if(user&&!user.emailVerified)await sendEmailVerification(user);
}
// MANUAL: Future phone OTP belongs here as a separate provider; no phone data collected now.
