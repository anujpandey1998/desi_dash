import { doc, runTransaction, serverTimestamp, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';
import { database } from './client';
import { normalizeCourierName, saveCourierName, loadCharacter } from '../../game3d/profile';

export type UserProfile={displayName:string;avatarId:'boy'|'girl';coins:number;highScore:number;createdAt:unknown};
export async function ensureProfile(user:User) {
  const ref=doc(database(),'users',user.uid),avatarId=await loadCharacter();
  await runTransaction(database(),async tx=>{
    const existing=await tx.get(ref);if(existing.exists())return;
    tx.set(ref,{displayName:normalizeCourierName(user.displayName||'Courier'),avatarId,coins:0,highScore:0,createdAt:serverTimestamp()});
  });
}
export function watchProfile(uid:string,next:(profile:UserProfile)=>void,error:(error:Error)=>void) {
  return onSnapshot(doc(database(),'users',uid),snapshot=>{if(snapshot.exists())next(snapshot.data() as UserProfile);},error);
}
export async function renameUser(uid:string,value:string) {
  const displayName=normalizeCourierName(value);if(!displayName)throw Error('Courier ka naam daalo.');
  await updateDoc(doc(database(),'users',uid),{displayName});await saveCourierName(displayName);
}
export async function saveCloudHighScore(uid:string,score:number) {
  if(!Number.isSafeInteger(score)||score<0||score>10000000)return;
  const ref=doc(database(),'users',uid);
  await runTransaction(database(),async tx=>{const old=await tx.get(ref);if(old.exists()&&score>(old.data()?.highScore||0))tx.update(ref,{highScore:score});});
}
// Cloud coins are server-owned. Never upload the device wallet as an authoritative balance.
