import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useAuth } from '../../store/authStore';
import { rankPlayers, roomAction, updateRaceProgress, watchRoom, type Room } from '../../services/firebase/roomService';
import type { Runner } from '../../game3d/simulation';
import { pause } from '../../game3d/simulation';
import { firebaseMessage } from '../../services/firebase/errors';
import { theme as t } from '../../theme/theme';
export type RaceParams={roomId:string;round:number;seed:number;startsAt:number;duration:number};
export function useRoomRace(race:RaceParams|undefined,runner:Runner,navigation:any) {
  const {user}=useAuth();const [room,setRoom]=useState<Room|null>(null),[error,setError]=useState('');
  const finalSent=useRef(false);
  useEffect(()=>{
    if(!race||!user)return;
    let active=true,inFlight=false,moved=false;
    const stop=watchRoom(race.roomId,next=>{
      if(!active)return;setRoom(next);
      if(next.players[user.uid]?.left){pause(runner);moved=true;navigation.replace('RoomResults',{roomId:race.roomId});}
      else if(next.status==='finished'){pause(runner);moved=true;navigation.replace('RoomResults',{roomId:race.roomId});}
    },e=>{if(active)setError(firebaseMessage(e));});
    const flush=async()=>{
      if(active&&Date.now()>=race.startsAt+race.duration*1000&&runner.status!=='gameover'){runner.status='gameover';runner.events.push('gameover');}
      if(inFlight||!active||runner.status==='ready'||finalSent.current||AppState.currentState!=='active')return;
      inFlight=true;
      try{const finished=runner.status==='gameover';await updateRaceProgress(race.roomId,race.round,runner.score,runner.distance,finished);if(active){setError('');if(finished)finalSent.current=true;}}
      catch(e){if(active)setError(firebaseMessage(e));}finally{inFlight=false;}
    };
    const interval=setInterval(()=>void flush(),1500);void flush();
    const sub=AppState.addEventListener('change',state=>{if(state!=='active'){pause(runner);void roomAction('leaveRoom',{roomId:race.roomId}).catch(()=>{});}});
    const remove=navigation.addListener('beforeRemove',()=>{if(!moved)void roomAction('leaveRoom',{roomId:race.roomId}).catch(()=>{});});
    return()=>{active=false;clearInterval(interval);sub.remove();stop();remove();};
  },[race,runner,navigation,user?.uid]);
  return {room,error};
}
export function RaceLeaderboard({room,error}:{room:Room|null;error:string}) {
  return <View pointerEvents="none" style={{position:'absolute',left:12,bottom:22,padding:10,borderRadius:16,backgroundColor:'#101E38DD',maxWidth:'65%'}}>
    <Text style={{fontFamily:t.font.bold,color:t.colors.gold}}>LIVE RACE</Text>
    {room&&rankPlayers(room).map(([uid,p],i)=><Text key={uid} numberOfLines={1} style={{fontFamily:t.font.bold,color:t.colors.text,fontSize:12}}>{i+1}. {p.name}: {p.score}{p.left?' (left)':p.finished?' (done)':''}</Text>)}
    {!!error&&<Text style={{fontFamily:t.font.bold,color:t.colors.gold,fontSize:11}}>{error}</Text>}
  </View>;
}
