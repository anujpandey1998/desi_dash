import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MenuLayout } from '../components/MenuLayout';
import { Button, Card } from '../components/ui';
import { ScreenHeader } from '../components/ScreenHeader';
import { BrandMascot, MascotAvatar } from '../components/BrandMascot';
import { theme as t } from '../theme/theme';
import { MISSIONS, type Challenge, type Entry, type MissionProgress, type WeeklyLeague } from '../game3d/challenges';
import {
  claimMission,
  createChallenge,
  getChallenge,
  loadMissions,
  loadPlayerName,
  loadServer,
  savePlayerName,
  saveServer,
  startChallenge,
} from '../services/socialService';

export function ChallengesScreen({ navigation, route }: { navigation: any; route?: any }) {
  const [tab, setTab] = useState<'missions' | 'friends'>(route?.params?.tab === 'friends' ? 'friends' : 'missions');
  useEffect(() => {
    const next = route?.params?.tab;
    if (next === 'missions' || next === 'friends') setTab(next);
  }, [route?.params?.tab]);
  const [server, setServer] = useState('');
  const [name, setName] = useState('Courier');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [league, setLeague] = useState<WeeklyLeague | null>(null);
  const [missions, setMissions] = useState<MissionProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    loadMissions()
      .then(progress => { if (active) setMissions(progress); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Could not load daily missions.'); });

    if (room?.code) {
      getChallenge(room.code)
        .then(data => {
          if (!active) return;
          setRoom(data.challenge);
          setEntries(data.entries);
          setLeague(data.league);
          setCode(data.challenge.code);
        })
        .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Could not refresh the room.'); });
    }

    return () => { active = false; };
  }, [room?.code]));

  useEffect(() => {
    let active = true;
    Promise.all([loadServer(), loadPlayerName()])
      .then(([savedServer, savedName]) => {
        if (!active) return;
        setServer(savedServer);
        setName(savedName);
      })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Could not load your settings.'); });
    return () => { active = false; };
  }, []);

  const task = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connection failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const configure = async () => {
    await saveServer(server);
    await savePlayerName(name);
  };

  const refresh = async (roomCode = code) => {
    const data = await getChallenge(roomCode);
    setRoom(data.challenge);
    setEntries(data.entries);
    setLeague(data.league);
    setCode(data.challenge.code);
  };

  const joinRoom = (value: string) => {
    setCode(value.toUpperCase());
    setRoom(null);
    setEntries([]);
    setLeague(null);
  };

  const claim = (id: typeof MISSIONS[number]['id']) => task(async () => {
    setMissions(await claimMission(id));
    setMessage('Mission reward added to your wallet.');
  });

  const shareRoom = () => {
    if (!room) return;
    void Share.share({
      message: `Race me in Rooftop Rush! Room ${room.code}. Server: ${server}. Open Friends & goals, join and beat my score.`,
    }).catch(() => Alert.alert('Sharing unavailable'));
  };

  return <MenuLayout>
    <ScreenHeader title="Courier Club" subtitle="Good friends. Great adventures." onBack={() => navigation.goBack()} trailing={<MascotAvatar size={40} />} />
    <View style={styles.tabs}><Button title="Daily Missions" compact tone={tab === 'missions' ? 'blue' : 'panel'} style={styles.flex} onPress={() => setTab('missions')} /><Button title="Friends" compact tone={tab === 'friends' ? 'blue' : 'panel'} style={styles.flex} onPress={() => setTab('friends')} /></View>
    {tab === 'missions' ? <>
      <Card light style={styles.hero}><View style={styles.heroCopy}><Text style={styles.kicker}>LITTLE GOALS. BIG WINS.</Text><Text style={styles.heroTitle}>Make today{'\n'}a good run.</Text><Text style={styles.heroText}>Finish missions. Collect coins. Fresh goals every day.</Text></View><BrandMascot size={190} /></Card>
      <Text style={styles.copy}>Missions reset at midnight UTC. Finish a run to record your progress.</Text>
      {MISSIONS.map((mission,index) => {
        const progress=Math.min(missions?.[mission.id] ?? 0,mission.target),claimed=missions?.claimed.includes(mission.id) ?? false;
        return <Card key={mission.id} style={styles.mission}>
          <View style={styles.row}><View style={styles.missionIcon}><Text style={styles.missionSymbol}>{['⚡','🏆','●'][index % 3]}</Text></View><View style={styles.flex}><Text style={styles.heading}>{mission.title}</Text><Text style={styles.reward}>+{mission.reward} coins</Text></View><Text style={styles.progressLabel}>{progress}/{mission.target}</Text></View>
          <View accessibilityRole="progressbar" accessibilityLabel={mission.title} accessibilityValue={{min:0,max:mission.target,now:progress}} style={styles.track}><View style={[styles.fill,{width:(progress/mission.target*100)+'%'}]} /></View>
          <Button compact title={claimed ? 'Collected ✓' : progress >= mission.target ? 'Claim your coins!' : 'Keep running!'} tone={claimed ? 'teal' : 'green'} disabled={busy || !missions || progress < mission.target || claimed} onPress={() => void claim(mission.id)} />
        </Card>;
      })}
    </> : <>
      <Card light style={styles.versus}><View style={styles.opponent}><MascotAvatar size={66}/><Text style={styles.playerName}>{name || 'You'}</Text></View><Text style={styles.vs}>VS</Text><View style={styles.opponent}><View style={styles.friendAvatar}><Text style={styles.friendMark}>?</Text></View><Text style={styles.playerName}>Your friend</Text></View></Card>
      <Text style={styles.heading}>A little friendly competition?</Text><Text style={styles.copy}>One shared rooftop course. Up to 90 seconds. Share a room code and race whenever you like. Rooms last 7 days.</Text>
      <Card style={styles.form}><Text style={styles.heading}>Set up your courier</Text><Text style={styles.fieldLabel}>Your name</Text><TextInput accessibilityLabel="Player name" placeholder="Courier name" placeholderTextColor={t.colors.muted} value={name} onChangeText={setName} maxLength={20} style={styles.input} />
        <Text style={styles.fieldLabel}>Challenge server</Text><TextInput accessibilityLabel="Challenge server" placeholder="https://your-challenge-server" placeholderTextColor={t.colors.muted} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} /><Text style={styles.copy}>Use the same server as your friend. Solo runs work offline.</Text>
        <Button title={busy ? 'One moment…' : 'Create a friend room'} disabled={busy} tone="purple" onPress={() => void task(async () => { await configure(); const created=await createChallenge(); await refresh(created.code); })} />
      </Card>
      <Card style={styles.form}><Text style={styles.heading}>Got an invite?</Text><TextInput accessibilityLabel="Room code" placeholder="6-character code" placeholderTextColor={t.colors.muted} value={code} onChangeText={joinRoom} maxLength={6} autoCapitalize="characters" autoCorrect={false} style={[styles.input,styles.codeInput]} /><Button title={room ? 'Refresh room' : 'Join your friend'} disabled={busy || code.length !== 6} onPress={() => void task(async () => { await configure(); await refresh(); })} /></Card>
      {room && <Card style={styles.form}><Text style={styles.kicker}>YOU’RE INVITED</Text><Text selectable style={styles.roomCode}>{room.code}</Text><Text style={styles.copy}>Same obstacles for everyone. Chase the room leader’s cyan ghost. No ad revives or score boosts.</Text><Button title="Race this course!" tone="green" disabled={busy} onPress={() => void task(async () => { await configure(); const ticket=await startChallenge(room.code); navigation.navigate('Game',{ticket}); })} /><Button title="Share invite" compact tone="teal" onPress={shareRoom} />
        <Text style={styles.heading}>Room leaderboard</Text>{entries.length === 0 && <Text style={styles.copy}>Your name could be first. Set a score!</Text>}{entries.map((entry,index) => <View key={entry.name+'-'+index} style={styles.leaderRow}><Text style={styles.rank}>{index+1}</Text><Text style={styles.leaderName}>{entry.name}</Text><View><Text style={styles.leaderScore}>{entry.score} pts</Text><Text style={styles.leaderDistance}>{entry.distance} m</Text></View></View>)}
        <Text style={styles.heading}>Weekly friend league</Text><Text style={styles.copy}>Week of {league?.week ?? '…'} (UTC), best verified score per player</Text>{league?.entries.length === 0 && <Text style={styles.copy}>A fresh week, a fresh leaderboard!</Text>}{league?.entries.map((entry,index) => <View key={'league-'+entry.name+'-'+index} style={styles.leaderRow}><Text style={styles.rank}>{entry.badge ? '★' : index+1}</Text><Text style={styles.leaderName}>{entry.name}{entry.badge ? ' · '+entry.badge : ''}</Text><Text style={styles.leaderScore}>{entry.score} pts</Text></View>)}
      </Card>}
    </>}
    {!!message && <Card><Text accessibilityRole="alert" style={styles.message}>{message}</Text></Card>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.copy}>One moment, courier…</Text>}
    <Button title="Back to the rooftops" compact tone="panel" onPress={() => navigation.goBack()} />
  </MenuLayout>;
}
const styles=StyleSheet.create({
  tabs:{flexDirection:'row',gap:12},flex:{flex:1},hero:{flexDirection:'row',alignItems:'center',overflow:'hidden',paddingRight:0},heroCopy:{flex:1},kicker:{color:t.colors.blueShadow,fontFamily:t.font.bold,fontSize:10,fontWeight:'900',letterSpacing:1},heroTitle:{color:t.colors.ink,fontFamily:t.font.bold,fontSize:28,lineHeight:33,fontWeight:'900',marginTop:8},heroText:{color:'#526B8D',fontFamily:t.font.regular,fontSize:12,lineHeight:19,marginTop:10},copy:{color:t.colors.muted,fontFamily:t.font.regular,fontSize:13,lineHeight:21},mission:{gap:14},row:{flexDirection:'row',alignItems:'center',gap:12},missionIcon:{width:44,height:44,borderRadius:15,backgroundColor:t.colors.blueShadow,alignItems:'center',justifyContent:'center'},missionSymbol:{fontSize:24,color:t.colors.gold},heading:{color:t.colors.text,fontFamily:t.font.bold,fontSize:18,fontWeight:'900'},reward:{color:t.colors.gold,fontFamily:t.font.bold,fontSize:12,marginTop:3},progressLabel:{color:t.colors.muted,fontFamily:t.font.bold,fontSize:12},track:{height:13,backgroundColor:t.colors.night,borderRadius:8,overflow:'hidden'},fill:{height:'100%',backgroundColor:t.colors.teal,borderRadius:8,borderTopWidth:3,borderColor:'#8DE6DF'},versus:{flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',paddingVertical:24},opponent:{alignItems:'center',gap:8,flex:1},playerName:{color:t.colors.ink,fontFamily:t.font.bold,fontSize:15,fontWeight:'900',textAlign:'center'},vs:{color:t.colors.purple,fontFamily:t.font.bold,fontWeight:'900',fontSize:27},friendAvatar:{width:66,height:66,borderRadius:23,backgroundColor:'#DBCDFF',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#B399F2'},friendMark:{fontFamily:t.font.bold,fontSize:38,fontWeight:'900',color:t.colors.purpleShadow},form:{gap:12},fieldLabel:{color:t.colors.muted,fontFamily:t.font.bold,fontSize:12},input:{backgroundColor:t.colors.night,color:t.colors.text,borderWidth:2,borderColor:t.colors.outline,borderRadius:16,padding:14,fontFamily:t.font.regular,fontSize:15,minHeight:52},codeInput:{textAlign:'center',fontFamily:t.font.bold,letterSpacing:5,fontSize:22},roomCode:{color:t.colors.gold,fontFamily:t.font.bold,fontWeight:'900',fontSize:36,letterSpacing:7,textAlign:'center'},leaderRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:t.colors.outline},rank:{color:t.colors.gold,fontFamily:t.font.bold,fontWeight:'900',fontSize:19,minWidth:22},leaderName:{flex:1,color:t.colors.text,fontFamily:t.font.bold,fontSize:14},leaderScore:{color:t.colors.teal,fontFamily:t.font.bold,fontWeight:'900',fontSize:13},leaderDistance:{color:t.colors.muted,fontFamily:t.font.regular,fontSize:11,textAlign:'right'},message:{color:t.colors.gold,fontFamily:t.font.regular,fontSize:13,lineHeight:21},
});
