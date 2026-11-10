import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { randomInt, randomUUID } from 'node:crypto';
import { ROOM_DURATION, cleanName, validCode, markAbsent, allDone, type Player } from './domain.js';
initializeApp();const db=getFirestore();
const region='asia-south1';
const options={region,enforceAppCheck:true,maxInstances:10};
function uidOf(request:CallableRequest) {if(!request.auth)throw new HttpsError('unauthenticated','Pehle login karo.');return request.auth.uid;}
function idOf(request:CallableRequest) {const id=request.data?.roomId;if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(id))throw new HttpsError('invalid-argument','Invalid room.');return id;}
function newPlayer(name:string) {return {name,score:0,distance:0,finished:false,left:false,lastSeen:Timestamp.now()};}
function assertHost(room:FirebaseFirestore.DocumentData,uid:string) {if(room.hostId!==uid||room.players[uid]?.left)throw new HttpsError('permission-denied','Sirf host yeh kar sakta hai.');}
async function profileName(tx:FirebaseFirestore.Transaction,uid:string) {const p=await tx.get(db.doc('users/'+uid));if(!p.exists)throw new HttpsError('failed-precondition','Profile ready nahi hai. Retry karo.');return cleanName(p.data()?.displayName)||'Courier';}
async function checkSession(tx:FirebaseFirestore.Transaction,uid:string,roomId:string) {
  const ref=db.doc('roomSessions/'+uid),session=await tx.get(ref);
  const previous=session.data()?.roomId;
  if(previous&&previous!==roomId){const old=await tx.get(db.doc('rooms/'+previous));if(old.exists&&old.data()?.status!=='finished'&&!old.data()?.players[uid]?.left)throw new HttpsError('failed-precondition','Pehle current room leave karo.');}
  return ref;
}
export const createRoom=onCall(options,async request=>{
  const uid=uidOf(request),roomId=randomUUID();
  for(let attempt=0;attempt<8;attempt++){
    const code=Array.from({length:6},()=>String.fromCharCode(65+randomInt(26))).join('');
    try{return await db.runTransaction(async tx=>{
      const codeRef=db.doc('roomCodes/'+code);if((await tx.get(codeRef)).exists)throw new HttpsError('already-exists','Code collision');
      const session=await checkSession(tx,uid,roomId),name=await profileName(tx,uid);
      tx.create(db.doc('rooms/'+roomId),{code,hostId:uid,status:'waiting',maxPlayers:4,createdAt:FieldValue.serverTimestamp(),players:{[uid]:newPlayer(name)},seed:randomInt(2147483647),round:1,startsAt:0,duration:ROOM_DURATION});
      tx.create(codeRef,{roomId});tx.set(session,{roomId});return {roomId};
    });}catch(error){if(error instanceof HttpsError&&error.code==='already-exists')continue;throw error;}
  }throw new HttpsError('resource-exhausted','Room code nahi mila. Retry karo.');
});
export const joinRoom=onCall(options,async request=>{
  const uid=uidOf(request),code=request.data?.code;
  if(!validCode(code))throw new HttpsError('invalid-argument','Code 6 uppercase letters ka hona chahiye.');
  return db.runTransaction(async tx=>{
    const mapping=await tx.get(db.doc('roomCodes/'+code)),roomId=mapping.data()?.roomId;
    if(!roomId)throw new HttpsError('not-found','Room nahi mila. Code check karo.');
    const ref=db.doc('rooms/'+roomId),snapshot=await tx.get(ref),room=snapshot.data();
    if(!room||room.status!=='waiting')throw new HttpsError('failed-precondition','Race start ho chuki hai ya room band hai.');
    const session=await checkSession(tx,uid,roomId),name=await profileName(tx,uid);
    const players=Object.fromEntries(Object.entries(room.players as Record<string,Player>).filter(([,p])=>!p.left));
    if(!players[uid]&&Object.keys(players).length>=4)throw new HttpsError('resource-exhausted','Room full hai (4 players).');
    players[uid]=newPlayer(name);tx.update(ref,{players});tx.set(session,{roomId});return {roomId};
  });
});
export const startRace=onCall(options,async request=>{
  const uid=uidOf(request),roomId=idOf(request);
  return db.runTransaction(async tx=>{
    const ref=db.doc('rooms/'+roomId),room=(await tx.get(ref)).data();
    if(!room)throw new HttpsError('not-found','Room nahi mila.');assertHost(room,uid);
    if(room.status!=='waiting')throw new HttpsError('failed-precondition','Room waiting nahi hai.');
    if(Object.values(room.players as Record<string,Player>).filter(p=>!p.left).length<2)throw new HttpsError('failed-precondition','Kam se kam 2 players chahiye.');
    tx.update(ref,{status:'playing',startsAt:Date.now()+3000});return {roomId};
  });
});
export const replayRoom=onCall(options,async request=>{
  const uid=uidOf(request),roomId=idOf(request);
  return db.runTransaction(async tx=>{
    const ref=db.doc('rooms/'+roomId),room=(await tx.get(ref)).data();
    if(!room)throw new HttpsError('not-found','Room nahi mila.');assertHost(room,uid);
    if(room.status!=='finished')throw new HttpsError('failed-precondition','Race abhi chal rahi hai.');
    const players=Object.fromEntries(Object.entries(room.players as Record<string,Player>).filter(([,p])=>!p.left).map(([id,p])=>[id,newPlayer(p.name)]));
    tx.update(ref,{status:'waiting',players,startsAt:0,round:room.round+1,seed:randomInt(2147483647)});return {roomId};
  });
});
export const leaveRoom=onCall(options,async request=>{
  const uid=uidOf(request),roomId=idOf(request);
  await db.runTransaction(async tx=>{
    const ref=db.doc('rooms/'+roomId),room=(await tx.get(ref)).data();
    const session=db.doc('roomSessions/'+uid),current=await tx.get(session);
    if(!room?.players[uid])return;
    const players={...room.players,[uid]:{...room.players[uid],left:true}};
    const close=room.hostId===uid||allDone(players);
    tx.update(ref,{players,...(close?{status:'finished'}:{})});
    if(current.data()?.roomId===roomId)tx.delete(session);
  });return {roomId};
});
export const finishRoom=onCall(options,async request=>{
  const uid=uidOf(request),roomId=idOf(request);
  await db.runTransaction(async tx=>{
    const ref=db.doc('rooms/'+roomId),room=(await tx.get(ref)).data();
    if(!room)throw new HttpsError('not-found','Room nahi mila.');assertHost(room,uid);
    if(room.status==='playing'&&allDone(room.players))tx.update(ref,{status:'finished'});
  });return {roomId};
});
// Trusted lifecycle cleanup only. Clients cannot finalize other players or mint currency.
export const finishCompletedRace=onDocumentUpdated({document:'rooms/{roomId}',region,maxInstances:10},async event=>{
  if(event.data?.after.data()?.status!=='playing')return;
  await db.runTransaction(async tx=>{const ref=event.data!.after.ref,room=(await tx.get(ref)).data();if(room?.status==='playing'&&allDone(room.players))tx.update(ref,{status:'finished'});});
});
export const expireDisconnectedPlayers=onSchedule({schedule:'every 1 minutes',region,maxInstances:1},async()=>{
  let cursor:FirebaseFirestore.QueryDocumentSnapshot|undefined;
  do{
    let query=db.collection('rooms').where('status','in',['waiting','playing']).orderBy('__name__').limit(100);
    if(cursor)query=query.startAfter(cursor);
    const batch=await query.get();if(batch.empty)break;
    for(const item of batch.docs)await db.runTransaction(async tx=>{
      const room=(await tx.get(item.ref)).data();if(!room||room.status==='finished')return;
      const players=markAbsent(room.players,Date.now());
      const expired=room.status==='playing'&&Date.now()>room.startsAt+(room.duration+15)*1000;
      if(expired)for(const p of Object.values(players))if(!p.finished)p.left=true;
      const done=allDone(players)||players[room.hostId]?.left;
      if(done||JSON.stringify(players)!==JSON.stringify(room.players))tx.update(item.ref,{players,...(done?{status:'finished'}:{})});
    });
    cursor=batch.docs.length===100?batch.docs[99]:undefined;
  }while(cursor);
});

export const raceClock=onCall(options,async request=>{
  const uid=uidOf(request),roomId=idOf(request),room=(await db.doc('rooms/'+roomId).get()).data();
  if(!room?.players[uid]||room.players[uid].left)throw new HttpsError('permission-denied','Room access nahi hai.');
  return {serverNow:Date.now()};
});
