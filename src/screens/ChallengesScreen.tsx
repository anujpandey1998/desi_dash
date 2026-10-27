import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MenuLayout } from '../components/MenuLayout';
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

export function ChallengesScreen({ navigation }: { navigation: any }) {
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

  return (
    <MenuLayout style={styles.page}>
      <Text style={styles.kicker}>COURIER CLUB</Text>
      <Text style={styles.title}>Friends & goals.</Text>
      <Text style={styles.copy}>Daily missions reset at midnight UTC. Finish a run to record progress.</Text>

      {MISSIONS.map(mission => {
        const progress = Math.min(missions?.[mission.id] ?? 0, mission.target);
        const claimed = missions?.claimed.includes(mission.id) ?? false;
        return (
          <View key={mission.id} style={styles.card}>
            <Text style={styles.heading}>{mission.title}</Text>
            <Text style={styles.copy}>{progress} / {mission.target} | +{mission.reward} coins</Text>
            <Pressable
              disabled={busy || !missions || missions[mission.id] < mission.target || claimed}
              onPress={() => void claim(mission.id)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{claimed ? 'CLAIMED' : 'CLAIM REWARD'}</Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.heading}>Race your friends</Text>
      <Text style={styles.copy}>
        One shared course. Up to 90 seconds per run. Share a room code and compete for the highest verified score.
        Rooms last 7 days; play whenever you like.
      </Text>
      <TextInput
        accessibilityLabel="Player name"
        placeholder="Player name"
        placeholderTextColor="#82a0aa"
        value={name}
        onChangeText={setName}
        maxLength={20}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Challenge server"
        placeholder="https://your-challenge-server"
        placeholderTextColor="#82a0aa"
        value={server}
        onChangeText={setServer}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
      />
      <Text style={styles.copy}>Both friends need the same server address. Solo mode works offline.</Text>
      <Pressable
        disabled={busy}
        style={styles.button}
        onPress={() => void task(async () => {
          await configure();
          const created = await createChallenge();
          await refresh(created.code);
        })}
      >
        <Text style={styles.buttonText}>CREATE FRIEND ROOM</Text>
      </Pressable>

      <TextInput
        accessibilityLabel="Room code"
        placeholder="6-character room code"
        placeholderTextColor="#82a0aa"
        value={code}
        onChangeText={joinRoom}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />
      <Pressable
        disabled={busy || code.length !== 6}
        style={styles.button}
        onPress={() => void task(async () => {
          await configure();
          await refresh();
        })}
      >
        <Text style={styles.buttonText}>JOIN / REFRESH ROOM</Text>
      </Pressable>

      {room && (
        <View style={styles.card}>
          <Text style={styles.heading}>ROOM {room.code}</Text>
          <Text style={styles.copy}>
            Same obstacles for everyone. No ad revives or score boosts. Beat the cyan ghost of the room leader.
          </Text>
          <Pressable
            style={styles.button}
            disabled={busy}
            onPress={() => void task(async () => {
              await configure();
              const ticket = await startChallenge(room.code);
              navigation.navigate('Game', { ticket });
            })}
          >
            <Text style={styles.buttonText}>RACE THIS COURSE</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={shareRoom}>
            <Text style={styles.buttonText}>SHARE INVITE</Text>
          </Pressable>
          <Text style={styles.heading}>Room leaderboard</Text>
          {entries.length === 0 && <Text style={styles.copy}>No finished runs yet. Set the first score.</Text>}
          {entries.map((entry, index) => (
            <Text key={`${entry.name}-${index}`} style={styles.copy}>
              {index + 1}. {entry.name} | {entry.score} pts | {entry.distance} m
            </Text>
          ))}
          <Text style={styles.heading}>Weekly friend league</Text>
          <Text style={styles.copy}>Week of {league?.week ?? '...' } (UTC) · best verified score per player</Text>
          {league?.entries.length === 0 && <Text style={styles.copy}>No scores this week yet. Be the first courier on the board.</Text>}
          {league?.entries.map((entry, index) => (
            <Text key={`league-${entry.name}-${index}`} style={styles.copy}>
              {index + 1}. {entry.badge ? `${entry.badge} BADGE · ` : ''}{entry.name} | {entry.score} pts
            </Text>
          ))}
        </View>
      )}

      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      {busy && <Text style={styles.copy}>Please wait...</Text>}
      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>BACK TO ROOFTOPS</Text>
      </Pressable>
    </MenuLayout>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  kicker: { color: '#edbb66', fontSize: 11, letterSpacing: 3, fontWeight: '900' },
  title: { color: '#fff1d9', fontSize: 34, fontWeight: '900', marginVertical: 14 },
  heading: { color: '#ffdb98', fontSize: 17, fontWeight: '800', marginVertical: 10 },
  copy: { color: '#aec6cd', lineHeight: 23, fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: '#193a47', padding: 18, borderRadius: 18, marginVertical: 10 },
  input: { backgroundColor: '#193a47', color: '#fff1d9', borderColor: '#45616c', borderWidth: 1, padding: 15, borderRadius: 12, marginVertical: 8 },
  button: { padding: 15, backgroundColor: '#edbc67', borderRadius: 12, marginVertical: 7, alignItems: 'center' },
  buttonText: { color: '#15343e', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  message: { color: '#ffcf86', paddingVertical: 16, lineHeight: 23 },
});
