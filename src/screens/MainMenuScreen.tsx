import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RunnerScene } from '../game3d/RunnerScene';
import { createRunner } from '../game3d/simulation';
import { loadOutfit } from '../game3d/profile';
import { loadHighScore, loadWalletCoins } from '../services/runnerPhotoService';
import { loadSoundSetting, setSoundEnabled } from '../services/audioService';

export function MainMenuScreen({ navigation }: { navigation: any }) {
  const inset = useSafeAreaInsets(), focused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  const preview = useMemo(() => createRunner(12), []);
  const [best, setBest] = useState(0), [coins, setCoins] = useState(0), [outfit, setOutfit] = useState(0), [sound, setSound] = useState(true);
  useFocusEffect(useCallback(() => {
    loadHighScore().then(setBest).catch(() => {}); loadWalletCoins().then(setCoins).catch(() => {});
    loadOutfit().then(setOutfit).catch(() => {}); loadSoundSetting().then(setSound).catch(() => {});
  }, []));
  return <View style={styles.root}>
    <StatusBar hidden />
    {focused && <RunnerScene runner={preview} outfit={outfit} preview />}
    <View pointerEvents="none" style={styles.topFade} />
    <View style={[styles.topBar, { top: inset.top + 20, left: inset.left + 24, right: inset.right + 24 }]}><Text style={styles.brand}>R / R</Text><View style={styles.coinPill}><Text style={styles.coin}>●</Text><Text style={styles.coinCount}>{coins.toLocaleString()}</Text></View></View>
    <View pointerEvents="none" style={[styles.heading, { top: inset.top + 90 }]}><Text style={styles.overline}>A NEW WAY THROUGH THE CITY</Text><Text style={styles.title}>ROOFTOP<Text style={styles.titleAccent}>{'\n'}RUSH.</Text></Text><Text style={styles.subtitle}>Special deliveries. Above the city.</Text></View>
    <View style={[styles.bottom, wide && { left: width * 0.54, right: inset.right + 18, bottom: inset.bottom + 14, borderRadius: 26 }, { paddingBottom: Math.max(inset.bottom, 20) + 12 }]}>
      <View style={styles.record}><Text style={styles.recordLabel}>YOUR PERSONAL BEST</Text><Text style={styles.recordValue}>{best.toLocaleString()}</Text><Text style={styles.recordUnit}>POINTS</Text></View>
      <Pressable accessibilityLabel="Start 3D run" onPress={() => navigation.navigate('Game')} style={({ pressed }) => [styles.play, pressed && styles.pressed]}><View><Text style={styles.playSmall}>YOUR NEXT DELIVERY AWAITS</Text><Text style={styles.playText}>LET'S RUN</Text></View><Text style={styles.playArrow}>↗</Text></Pressable>
      <Pressable accessibilityLabel="Friends and daily missions" onPress={() => navigation.navigate('Challenges')} style={{ padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#72949c', borderRadius: 12, alignItems: 'center' }}><Text style={styles.linkTitle}>FRIENDS + DAILY MISSIONS ?</Text></Pressable><View style={styles.links}><Pressable style={styles.link} onPress={() => navigation.navigate('Customize')}><Text style={styles.linkTitle}>RUNNER</Text><Text style={styles.linkSub}>Your look</Text></Pressable><Pressable style={styles.link} onPress={() => navigation.navigate('Settings')}><Text style={styles.linkTitle}>SETTINGS</Text><Text style={styles.linkSub}>Make it yours</Text></Pressable><Pressable style={styles.link} onPress={() => { const next = !sound; setSound(next); void setSoundEnabled(next).catch(() => {}); }}><Text style={styles.linkTitle}>{sound ? 'SOUND ON' : 'SOUND OFF'}</Text><Text style={styles.linkSub}>City sounds</Text></Pressable></View>
      <Text style={styles.footer}>SWIPE. JUMP. SLIDE. KEEP MOVING.</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#9bc3cc' }, topFade: { position: 'absolute', left: 0, right: 0, top: 0, height: '42%', backgroundColor: '#0b293b45' },
  topBar: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: '#fff5dd', fontSize: 18, letterSpacing: 4, fontWeight: '900' },
  coinPill: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#102a36e6', borderRadius: 24 }, coin: { color: '#eebc5c', fontSize: 17 }, coinCount: { color: '#fff3d6', fontSize: 16, fontWeight: '800' },
  heading: { position: 'absolute', left: 26, right: 20 }, overline: { color: '#fff4d9', fontSize: 8, fontWeight: '900', letterSpacing: 2.5 },
  title: { color: '#fff7e6', fontSize: 47, lineHeight: 51, fontWeight: '900', letterSpacing: -3, marginTop: 14, textShadowColor: '#12334445', textShadowRadius: 18 }, titleAccent: { color: '#ffcd75' },
  subtitle: { color: '#ecf1df', fontSize: 12, fontWeight: '600', marginTop: 12 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 22, paddingHorizontal: 25, backgroundColor: '#102a36f5', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  record: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 19 }, recordLabel: { color: '#99b7bf', fontSize: 8, letterSpacing: 1.3, fontWeight: '900', flex: 1 }, recordValue: { color: '#fff1d3', fontSize: 23, fontWeight: '900' }, recordUnit: { color: '#6f939f', fontSize: 8, fontWeight: '900', marginLeft: 6 },
  play: { backgroundColor: '#f1bc60', borderRadius: 18, paddingVertical: 17, paddingHorizontal: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pressed: { backgroundColor: '#ffd792', transform: [{ scale: 0.98 }] },
  playSmall: { color: '#655238', fontSize: 8, letterSpacing: 1.5, fontWeight: '800' }, playText: { color: '#17313c', fontSize: 26, fontWeight: '900', letterSpacing: 0.6, marginTop: 4 }, playArrow: { color: '#17313c', fontSize: 35 },
  links: { flexDirection: 'row', marginTop: 22 }, link: { flex: 1, alignItems: 'center', paddingVertical: 6 }, linkTitle: { color: '#d9e7df', fontSize: 10, letterSpacing: 1.2, fontWeight: '900' }, linkSub: { color: '#779ba7', fontSize: 10, marginTop: 6 },
  footer: { color: '#577b89', textAlign: 'center', fontSize: 7, fontWeight: '800', letterSpacing: 2.1, marginTop: 22 },
});
