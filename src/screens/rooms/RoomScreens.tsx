import React, { useEffect, useRef, useState } from 'react';
import { AppState, Share, Text, TextInput } from 'react-native';
import { MenuLayout } from '../../components/MenuLayout';
import { Button, Card, Header } from '../../components/ui';
import { authStyles as s } from '../auth/AuthScreens';
import { useAuth } from '../../store/authStore';
import { createRoom, joinRoom, roomAction, watchRoom, heartbeat, raceClockOffset, rankPlayers, type Room } from '../../services/firebase/roomService';
import { firebaseMessage } from '../../services/firebase/errors';

export function RoomsScreen({navigation}:{navigation:any}) {
  const {user,profile,error:profileError,retry}=useAuth();const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
  async function enter(join:boolean){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await(join?joinRoom(code):createRoom());navigation.navigate('RoomLobby',result);}catch(e){setError(firebaseMessage(e));}finally{lock.current=false;setBusy(false);}}
  return <MenuLayout><Header title="Race your friends" subtitle="Same rooftops. Up to 4 couriers."/>
    {!user?<Card style={s.card}><Text style={s.copy}>Online rooms ke liye login chahiye.</Text><Button title="Login" onPress={()=>navigation.navigate('Login')}/></Card>:<Card style={s.card}>
      <Text style={s.copy}>90-second race. Room code friends ko share karo.</Text>
      {!!profileError&&<><Text style={s.message}>{profileError}</Text><Button title="Retry profile" compact onPress={retry}/></>}
      <Button title="Create Room" tone="green" disabled={busy||!profile} onPress={()=>void enter(false)}/>
      <TextInput style={s.input} value={code} onChangeText={v=>setCode(v.replace(/[^a-z]/gi,'').toUpperCase())} autoCapitalize="characters" maxLength={6} placeholder="ABCDEF" placeholderTextColor="#BAC8E5" accessibilityLabel="Six-letter room code" editable={!busy}/>
      <Button title={busy?'Connecting...':'Join Room'} tone="teal" disabled={busy||!profile} onPress={()=>void enter(true)}/>
      {!!error&&<Text accessibilityLiveRegion="polite" style={s.message}>{error}</Text>}
    </Card>}<Button title="Back home" tone="panel" onPress={()=>navigation.goBack()}/></MenuLayout>;
}
export function useRoomPresence(roomId:string) {
  useEffect(()=>{
    let active=true;const ping=()=>{if(active&&AppState.currentState==='active')void heartbeat(roomId).catch(()=>{});};ping();const timer=setInterval(ping,20000);
    // Share/WhatsApp backgrounds the lobby too. Let the server lease expire on a real disconnect.
    const sub=AppState.addEventListener('change',state=>{if(state==='active')ping();});
    return()=>{active=false;clearInterval(timer);sub.remove();};
  },[roomId]);
}
export function RoomLobbyScreen({navigation,route}:{navigation:any;route:any}) {
  const roomId=String(route.params.roomId),{user}=useAuth();const [room,setRoom]=useState<Room|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const moved=useRef(false),exiting=useRef(false);
  useRoomPresence(roomId);
  const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function launch(next:Room){
    if(moved.current)return;moved.current=true;
    try{const offset=await raceClockOffset(roomId);if(active.current&&!exiting.current)navigation.replace('Game',{roomRace:{roomId,seed:next.seed,round:next.round,startsAt:next.startsAt-offset,duration:next.duration}});}
    catch(e){moved.current=false;if(active.current)setError(firebaseMessage(e));}
  }
  useEffect(()=>watchRoom(roomId,next=>{
    setRoom(next);
    if(next.players[user?.uid||'']?.left&&!exiting.current){exiting.current=true;navigation.replace('Rooms');return;}
    if(next.status==='playing'&&!moved.current){void launch(next);}
    else if(next.status==='finished'&&!moved.current){moved.current=true;navigation.replace('RoomResults',{roomId});}
  },e=>setError(firebaseMessage(e))),[roomId,user?.uid,navigation]);
  useEffect(()=>navigation.addListener('beforeRemove',()=>{if(!moved.current)void roomAction('leaveRoom',{roomId}).catch(()=>{});}),[navigation,roomId]);
  async function action(start:boolean){if(busy)return;setBusy(true);setError('');try{if(start)await roomAction('startRace',{roomId});else{await roomAction('leaveRoom',{roomId});exiting.current=true;navigation.replace('Rooms');}}catch(e){setError(firebaseMessage(e));}finally{setBusy(false);}}
  return <MenuLayout><Header title="Rooftop lobby" subtitle="Host starts when everyone is ready."/><Card style={s.card}>
    <Text selectable style={[s.message,{fontSize:36,textAlign:'center'}]}>{room?.code||'...'}</Text>
    <Button title="Share room code" tone="teal" disabled={!room} onPress={()=>{if(room)void Share.share({message:'Join my Rooftop Rush race! Code: '+room.code+' (open Rooftop Rush > Race your friends > Join Room).'}).catch(e=>setError(firebaseMessage(e)));}}/>
    {room&&Object.entries(room.players).map(([uid,p])=><Text key={uid} style={s.copy}>{p.name}{uid===room.hostId?' (Host)':''}{p.left?' - left':' - ready'}</Text>)}
    {room?.hostId===user?.uid&&<Button title={busy?'Please wait...':'Start Race'} tone="green" disabled={busy} onPress={()=>void action(true)}/>}
    {!!error&&<Text accessibilityLiveRegion="polite" style={s.message}>{error}</Text>}
    {room?.status==='playing'&&!!error&&<Button title="Retry race connection" onPress={()=>void launch(room)}/>}
    <Button title="Leave Room" tone="panel" disabled={busy} onPress={()=>void action(false)}/>
  </Card></MenuLayout>;
}
export function RoomResultsScreen({navigation,route}:{navigation:any;route:any}) {
  const roomId=String(route.params.roomId),{user}=useAuth();const [room,setRoom]=useState<Room|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const moved=useRef(false);
  useRoomPresence(roomId);
  useEffect(()=>watchRoom(roomId,next=>{setRoom(next);if(next.status==='waiting'&&!moved.current){moved.current=true;navigation.replace('RoomLobby',{roomId});}},e=>setError(firebaseMessage(e))),[roomId,navigation]);
  useEffect(()=>navigation.addListener('beforeRemove',()=>{if(!moved.current)void roomAction('leaveRoom',{roomId}).catch(()=>{});}),[navigation,roomId]);
  async function action(replay:boolean){if(busy)return;setBusy(true);try{await roomAction(replay?'replayRoom':'leaveRoom',{roomId});if(!replay){moved.current=true;navigation.replace('Rooms');}}catch(e){setError(firebaseMessage(e));}finally{setBusy(false);}}
  const rankings=room?rankPlayers(room):[],winner=room?.status==='finished'?rankings.find(([,p])=>!p.left&&p.finished):undefined;
  return <MenuLayout><Header title={winner?winner[1].name+' wins!':'Race results'} subtitle={room?.status==='finished'?'What a rooftop rush!':'Waiting for the other couriers...'}/><Card style={s.card}>
    {rankings.map(([uid,p],i)=><Text key={uid} style={s.copy}>{i+1}. {p.name} - {p.score} pts / {p.distance} m {p.left?'(left)':p.finished?'(finished)':'(racing)'}</Text>)}
    {room?.hostId===user?.uid&&<Button title="Play Again" tone="green" disabled={busy||room?.status!=='finished'} onPress={()=>void action(true)}/>}
    {room?.hostId!==user?.uid&&<Text style={s.copy}>Host can start Play Again.</Text>}
    <Button title="Leave Room" tone="panel" disabled={busy} onPress={()=>void action(false)}/>
    {!!error&&<Text style={s.message}>{error}</Text>}
  </Card></MenuLayout>;
}
