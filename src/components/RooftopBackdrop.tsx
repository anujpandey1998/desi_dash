import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme as t } from '../theme/theme';

export function RooftopBackdrop() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: t.colors.night }]}>
    {Array.from({ length: 32 }, (_, i) => {
      const mix = Math.max(0, 1 - Math.abs(i / 31 - 0.45) / 0.55);
      const color = `rgb(${Math.round(16 + 19 * mix)},${Math.round(30 + 39 * mix)},${Math.round(56 + 66 * mix)})`;
      return <View key={i} style={{ position: 'absolute', top: `${i * 100 / 32}%`, height: '3.2%', width: '100%', backgroundColor: color }} />;
    })}
    <View style={s.glow} /><View style={s.sun} />
    {[10, 29, 66, 87].map((x, i) => <View key={x} style={[s.star, { left: `${x}%`, top: 100 + i % 3 * 55 }]} />)}
    <View style={s.skyline}>{[64, 106, 78, 130, 92, 60, 115, 82, 140, 70, 95].map((height, i) => <View key={i} style={[s.building, { height }]}><View style={s.window} /><View style={[s.window, { marginTop: 12 }]} /></View>)}</View>
    <View style={s.roof}><View style={s.roofEdge} />{Array.from({ length: 10 }, (_, i) => <View key={i} style={[s.roofLine, { left: `${i * 12}%` }]} />)}</View>
  </View>;
}
const s = StyleSheet.create({
  glow: { position: 'absolute', width: 310, height: 310, borderRadius: 160, backgroundColor: '#FF8A3D0D', top: 110, alignSelf: 'center' },
  sun: { position: 'absolute', width: 145, height: 145, borderRadius: 80, backgroundColor: '#FFA36926', top: 185, right: '8%' },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF4DCAA' },
  skyline: { position: 'absolute', top: 278, height: 140, left: -10, right: -10, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  building: { flex: 1, backgroundColor: '#252D50', borderTopLeftRadius: 5, borderTopRightRadius: 5, paddingTop: 16, alignItems: 'center' },
  window: { width: 7, height: 10, borderRadius: 2, backgroundColor: '#E9B16B55' },
  roof: { position: 'absolute', top: 398, height: 85, left: -5, right: -5, backgroundColor: '#39415F' },
  roofEdge: { height: 11, backgroundColor: '#7E7188', borderBottomWidth: 4, borderColor: '#242D4C' },
  roofLine: { position: 'absolute', width: 2, height: 75, top: 11, backgroundColor: '#4B5271', transform: [{ rotate: '25deg' }] },
});
