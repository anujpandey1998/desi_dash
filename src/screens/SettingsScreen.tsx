import { AccountCard } from './auth/AccountCard';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { MenuLayout } from '../components/MenuLayout';
import { ScreenHeader } from '../components/ScreenHeader';
import { MascotAvatar } from '../components/BrandMascot';
import { Button, Card } from '../components/ui';
import { theme as t } from '../theme/theme';
import { loadSoundSetting, loadVibrationSetting, setSoundEnabled, setVibrationEnabled } from '../services/audioService';
import { showAdsPrivacyOptions, TEST_ADS } from '../services/adService';
import { loadGraphicsQuality, saveGraphicsQuality } from '../game3d/profile';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const [quality, setQuality] = useState<'low' | 'standard'>('standard');
  const [sound, setSound] = useState(true), [vibration, setVibration] = useState(true);
  useEffect(() => { loadGraphicsQuality().then(setQuality).catch(() => {}); loadSoundSetting().then(setSound).catch(() => {}); loadVibrationSetting().then(setVibration).catch(() => {}); }, []);
  return <MenuLayout>
    <ScreenHeader title="Settings" subtitle="Your rush, your rules." onBack={() => navigation.goBack()} />
    <AccountCard/>
    <Card light style={s.intro}><MascotAvatar size={64} /><View style={{ flex: 1 }}><Text style={s.introTitle}>Make yourself at home.</Text><Text style={s.introCopy}>Little tweaks for your perfect run.</Text></View></Card>
    <Card style={s.stack}>
      <View style={s.row}><View style={s.rowCopy}><Text style={s.label}>♫  City sounds</Text><Text style={s.hint}>Music & game effects</Text></View><Switch accessibilityLabel="City sounds" value={sound} trackColor={{ false: t.colors.outline, true: t.colors.blue }} thumbColor="#FFF" onValueChange={value => { setSound(value); void setSoundEnabled(value).catch(() => {}); }} /></View>
      <View style={s.divider} />
      <View style={s.row}><View style={s.rowCopy}><Text style={s.label}>✦  Haptic feedback</Text><Text style={s.hint}>Feel the little moments</Text></View><Switch accessibilityLabel="Vibration" value={vibration} trackColor={{ false: t.colors.outline, true: t.colors.blue }} thumbColor="#FFF" onValueChange={value => { setVibration(value); void setVibrationEnabled(value).catch(() => {}); }} /></View>
    </Card>
    <Card style={s.stack}><Text style={s.label}>Scenery detail</Text><Text style={s.hint}>Low uses less distant scenery and turns off shadows.</Text><View style={s.qualityRow}>{(['standard','low'] as const).map(value => <Button key={value} title={(value === 'standard' ? 'Standard' : 'Low') + (quality === value ? ' ✓' : '')} compact tone={quality === value ? 'blue' : 'panel'} style={{ flex: 1 }} accessibilityLabel={`${value} graphics, ${quality === value ? 'selected' : 'not selected'}`} onPress={() => { setQuality(value); void saveGraphicsQuality(value).catch(() => {}); }} />)}</View></Card>
    <Card style={s.stack}><Text style={s.label}>Privacy & ads</Text><Text style={s.hint}>{TEST_ADS ? 'Test ads are enabled in this build.' : 'You choose your ad privacy preferences.'}</Text><Button title="Ad privacy choices" compact tone="panel" onPress={() => void showAdsPrivacyOptions().catch(() => Alert.alert('Ad privacy', 'Privacy options are unavailable or not required in your region.'))} /></Card>
    <Card style={s.stack}><Text style={s.label}>A quick rooftop refresher</Text>{[['↔','Swipe left or right','Change lanes'],['↑','Swipe up','Jump over barriers'],['↓','Swipe down','Slide under low gates'],['✦','Grab a blue shield','Absorb one crash']].map(([icon,title,hint]) => <View key={title} style={s.guideRow}><Text style={s.gesture}>{icon}</Text><View style={s.rowCopy}><Text style={s.guideTitle}>{title}</Text><Text style={s.hint}>{hint}</Text></View></View>)}<Text style={s.hint}>Dodge water tanks. Your run pauses when you leave the app.</Text></Card>
    <Button title="Back to the rooftops" tone="green" onPress={() => navigation.goBack()} />
  </MenuLayout>;
}
const s=StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14 }, introTitle: { color: t.colors.ink, fontFamily: t.font.bold, fontWeight: '900', fontSize: 20 }, introCopy: { color: '#526B8D', fontFamily: t.font.regular, fontSize: 12, marginTop: 4 }, stack: { gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' }, rowCopy: { flex: 1 }, label: { color: t.colors.text, fontFamily: t.font.bold, fontSize: 18, fontWeight: '900' }, hint: { color: t.colors.muted, fontFamily: t.font.regular, fontSize: 12, lineHeight: 19, marginTop: 3 }, divider: { height: 1, backgroundColor: t.colors.outline }, qualityRow: { flexDirection: 'row', gap: 12 }, guideRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, gesture: { color: t.colors.gold, fontSize: 24, textAlign: 'center', width: 36 }, guideTitle: { color: t.colors.text, fontFamily: t.font.bold, fontWeight: '800', fontSize: 14 },
});
