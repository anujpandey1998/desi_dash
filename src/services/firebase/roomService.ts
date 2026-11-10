import { doc, onSnapshot, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { auth, database, functions, initializeFirebase } from './client';
export type RoomPlayer={name:string;score:number;distance:number;finished:boolean;left:boolean;lastSeen:{toMillis():number}};
export type Room={code:string;hostId:string;status:'waiting'|'playing'|'finished';maxPlayers:4;createdAt:unknown;players:Record<string,RoomPlayer>;seed:number;round:number;startsAt:number;duration:number};
export async function roomAction(action:'createRoom'|'joinRoom'|'startRace'|'replayRoom'|'leaveRoom'|'finishRoom',data:Record<string,unknown>={}) {
  await initializeFirebase();if(!auth().currentUser)throw Error('Pehle login karo.');
  return (await httpsCallable<Record<string,unknown>,{roomId:string}>(functions(),action)(data)).data;
}
export function validateRoomCode(code:string) {
  const clean=code.trim().toUpperCase();if(!/^[A-Z]{6}$/.test(clean))throw Error('Room code exactly 6 letters ka hona chahiye.');return clean;
}
export const createRoom=()=>roomAction('createRoom');
export const joinRoom=(code:string)=>roomAction('joinRoom',{code:validateRoomCode(code)});
export function watchRoom(id:string,next:(room:Room)=>void,error:(error:Error)=>void) {
  return onSnapshot(doc(database(),'rooms',id),snap=>{if(snap.exists())next(snap.data() as Room);else error(Error('Room ab available nahi hai.'));},error);
}
export async function updateRaceProgress(roomId:string,round:number,score:number,distance:number,finished=false) {
  const uid=auth().currentUser?.uid;if(!uid)throw Error('Login required.');
  if(!Number.isSafeInteger(score)||score<0||score>10000000||!Number.isFinite(distance)||distance<0||distance>5000)throw Error('Invalid race progress.');
  // Round is checked in the transaction to prevent an old race writing into a replay.
  const {runTransaction}=await import('@react-native-firebase/firestore');
  await runTransaction(database(),async tx=>{
    const ref=doc(database(),'rooms',roomId),snap=await tx.get(ref),room=snap.data() as Room|undefined;
    if(!room||room.round!==round||room.status!=='playing'||room.players[uid]?.finished||room.players[uid]?.left)return;
    tx.update(ref,{['players.'+uid+'.score']:score,['players.'+uid+'.distance']:Math.floor(distance),['players.'+uid+'.finished']:finished,['players.'+uid+'.lastSeen']:serverTimestamp()});
  });
}
export async function heartbeat(roomId:string) {
  const uid=auth().currentUser?.uid;if(uid)await updateDoc(doc(database(),'rooms',roomId),{['players.'+uid+'.lastSeen']:serverTimestamp()});
}
export function rankPlayers(room:Room) {
  return Object.entries(room.players).sort((a,b)=>Number(a[1].left)-Number(b[1].left)||b[1].score-a[1].score||b[1].distance-a[1].distance||a[0].localeCompare(b[0]));
}

export async function raceClockOffset(roomId:string){
  const before=Date.now();
  const response=await httpsCallable<{roomId:string},{serverNow:number}>(functions(),'raceClock')({roomId});
  return response.data.serverNow-(before+Date.now())/2;
}
