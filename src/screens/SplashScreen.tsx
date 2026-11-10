import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SPLASH_ART } from '../components/BrandMascot';
import { theme as t } from '../theme/theme';
import { useReducedMotion } from '../components/ui';

export function SplashScreen({ navigation }: { navigation: any }) {
  const fade = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  const [artReady, setArtReady] = useState(false);
  useEffect(() => {
    const animation = Animated.timing(fade, { toValue: 1, duration: reduced ? 0 : 450, useNativeDriver: true }); animation.start();
    return () => animation.stop();
  }, [fade, reduced]);
  useEffect(() => {
    // A brief brand introduction, not a fake download percentage. Image errors never block entry.
    const timer = setTimeout(() => navigation.replace('MainMenu'), artReady ? 1800 : 3500);
    return () => clearTimeout(timer);
  }, [artReady, navigation]);
  return <View style={s.root}><StatusBar style="light" /><ImageBackground source={SPLASH_ART} style={StyleSheet.absoluteFill} resizeMode="cover" onLoad={() => setArtReady(true)} onError={() => setArtReady(true)}>
    <SafeAreaView style={s.safe}><Animated.View style={[s.brand, { opacity: fade }]}><Text style={s.rooftop}>ROOFTOP</Text><Text style={s.rush}>RUSH</Text><Text style={s.tag}>Special deliveries. Big adventures.</Text></Animated.View>
      <View style={s.bottom}><View style={s.loading}><ActivityIndicator color={t.colors.gold} /><Text style={s.loadingText}>Your city is calling…</Text></View><Text style={s.tip}>Pro tip: Blue shields save you from one crash!</Text></View>
    </SafeAreaView>
  </ImageBackground></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#063D9F' }, safe: { flex: 1, justifyContent: 'space-between', padding: 24 }, brand: { alignItems: 'center', paddingTop: 8 },
  rooftop: { color: '#FFF', fontFamily: t.font.bold, fontWeight: '900', fontSize: 31, letterSpacing: 3, textShadowColor: '#143470', textShadowRadius: 4, textShadowOffset: { width: 0, height: 3 } },
  rush: { color: t.colors.gold, fontFamily: t.font.bold, fontWeight: '900', fontSize: 54, letterSpacing: 3, lineHeight: 60, textShadowColor: '#143470', textShadowRadius: 4, textShadowOffset: { width: 0, height: 4 } },
  tag: { color: t.colors.text, fontFamily: t.font.bold, fontWeight: '800', fontSize: 12 }, bottom: { alignItems: 'center', paddingBottom: 12, gap: 12 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 22, borderRadius: t.radius.pill, backgroundColor: '#102A58DE', borderWidth: 1, borderColor: '#6B91CA' }, loadingText: { color: t.colors.text, fontFamily: t.font.bold, fontWeight: '800', fontSize: 15 }, tip: { color: t.colors.cream, fontFamily: t.font.regular, fontSize: 12, textAlign: 'center', backgroundColor: '#102A58CC', padding: 8, borderRadius: 10 },
});
