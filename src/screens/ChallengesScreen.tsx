import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MenuLayout } from '../components/MenuLayout';
import { MISSIONS, type Challenge, type Entry, type MissionProgress } from '../game3d/challenges';
import { claimMission, createChallenge, getChallenge, loadMissions, loadPlayerName, loadServer, localTransaction, saveMissions, savePlayerName, saveServer, startChallenge } from '../services/socialService';
import { loadWalletCoins, saveWalletCoins } from '../services/runnerPhotoService';
export function ChallengesScreen({ navigation }: { navigation: any }) {
 const [server,setServer]=useState(''),[name,setName]=useState('Courier'),[code,setCode]=useState(''),[room,setRoom]=useState<Challenge|null>(null),[entries,setEntries]=useState<Entry[]>([]),[missions,setMissions]=useState<MissionProgress|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useFocusEffect(useCallback(() => { loadMissions().then(setMissions).catch(() => {}); }, []));
 useEffect(()=>{loadServer().then(setServer).catch(()=>{});loadPlayerName().then(setName).catch(()=>{});loadMissions().then(setMissions).catch(()=>{});},[]);
 const task=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Connection failed. Try again.');}finally{setBusy(false);}};
 const configure=async()=>{await saveServer(server);await savePlayerName(name);};
 const refresh=async(c=code)=>{const data=await getChallenge(c);setRoom(data.challenge);setEntries(data.entries);setCode(data.challenge.code);};
 const claim=(id:typeof MISSIONS[number]['id'])=>task(async()=>{setMissions(await claimMission(id));setMessage('Mission reward added to your wallet.');});
 return <MenuLayout style={s.page}>
  <Text style={s.kicker}>COURIER CLUB</Text><Text style={s.title}>Friends & goals.</Text>
  <Text style={s.copy}>Daily missions reset at midnight UTC. Finish a run to record progress.</Text>
  {MISSIONS.map(m=><View key={m.id} style={s.card}><Text style={s.heading}>{m.title}</Text><Text style={s.copy}>{Math.min(missions?.[m.id]||0,m.target)} / {m.target} � +{m.reward} coins</Text><Pressable disabled={busy||!missions||missions[m.id]<m.target||missions.claimed.includes(m.id)} onPress={()=>void claim(m.id)} style={s.button}><Text style={s.buttonText}>{missions?.claimed.includes(m.id)?'CLAIMED':'CLAIM REWARD'}</Text></Pressable></View>)}
  <Text style={s.heading}>Race your friends</Text><Text style={s.copy}>One shared course. Up to 90 seconds per run. Share a room code and compete for the highest verified score. Rooms last 7 days; play whenever you like.</Text>
  <TextInput accessibilityLabel="Player name" placeholder="Player name" placeholderTextColor="#82a0aa" value={name} onChangeText={setName} maxLength={20} style={s.input}/>
  <TextInput accessibilityLabel="Challenge server" placeholder="https://your-challenge-server" placeholderTextColor="#82a0aa" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={s.input}/>
  <Text style={s.copy}>Both friends need the same server address. Solo mode works offline.</Text>
  <Pressable disabled={busy} style={s.button} onPress={()=>void task(async()=>{await configure();const c=await createChallenge();await refresh(c.code);})}><Text style={s.buttonText}>CREATE FRIEND ROOM</Text></Pressable>
  <TextInput accessibilityLabel="Room code" placeholder="6-character room code" placeholderTextColor="#82a0aa" value={code} onChangeText={v=>setCode(v.toUpperCase())} maxLength={6} autoCapitalize="characters" autoCorrect={false} style={s.input}/>
  <Pressable disabled={busy||code.length!==6} style={s.button} onPress={()=>void task(async()=>{await configure();await refresh();})}><Text style={s.buttonText}>JOIN / REFRESH ROOM</Text></Pressable>
  {room&&<View style={s.card}><Text style={s.heading}>ROOM {room.code}</Text><Text style={s.copy}>Same obstacles for everyone. No ad revives or score boosts. Beat the cyan ghost of the room leader.</Text><Pressable style={s.button} disabled={busy} onPress={()=>void task(async()=>{await configure();const ticket=await startChallenge(room.code);navigation.navigate('Game',{ticket});})}><Text style={s.buttonText}>RACE THIS COURSE</Text></Pressable><Pressable style={s.button} onPress={()=>void Share.share({message:`Race me in Rooftop Rush! Room ${room.code}. Server: ${server}. Open Friends & goals, join and beat my score.`}).catch(()=>Alert.alert('Sharing unavailable'))}><Text style={s.buttonText}>SHARE INVITE</Text></Pressable><Text style={s.heading}>Room leaderboard</Text>{entries.length===0&&<Text style={s.copy}>No finished runs yet. Set the first score.</Text>}{entries.map((e,i)=><Text key={i} style={s.copy}>{i+1}. {e.name} � {e.score} pts � {e.distance} m</Text>)}</View>}
  {!!message&&<Text accessibilityRole="alert" style={s.message}>{message}</Text>}{busy&&<Text style={s.copy}>Please wait...</Text>}
  <Pressable style={s.button} onPress={()=>navigation.goBack()}><Text style={s.buttonText}>BACK TO ROOFTOPS</Text></Pressable>
 </MenuLayout>;
}
const s=StyleSheet.create({page:{padding:24},kicker:{color:'#edbb66',fontSize:11,letterSpacing:3,fontWeight:'900'},title:{color:'#fff1d9',fontSize:34,fontWeight:'900',marginVertical:14},heading:{color:'#ffdb98',fontSize:17,fontWeight:'800',marginVertical:10},copy:{color:'#aec6cd',lineHeight:23,fontSize:13,marginBottom:12},card:{backgroundColor:'#193a47',padding:18,borderRadius:18,marginVertical:10},input:{backgroundColor:'#193a47',color:'#fff1d9',borderColor:'#45616c',borderWidth:1,padding:15,borderRadius:12,marginVertical:8},button:{padding:15,backgroundColor:'#edbc67',borderRadius:12,marginVertical:7,alignItems:'center'},buttonText:{color:'#15343e',fontWeight:'900',fontSize:12,letterSpacing:1},message:{color:'#ffcf86',paddingVertical:16,lineHeight:23}});
