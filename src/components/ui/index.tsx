import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { playButtonTap, triggerSelection } from '../../services/audioService';
import { theme as t } from '../../theme/theme';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  return reduced;
}

type ButtonProps = {
  title: string; onPress: () => void; subtitle?: string; icon?: React.ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'teal' | 'purple' | 'panel'; disabled?: boolean; compact?: boolean;
  accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
};
const shadows = { blue: t.colors.blueShadow, green: t.colors.greenShadow, orange: t.colors.orangeShadow, teal: t.colors.tealShadow, purple: t.colors.purpleShadow, panel: t.colors.night };
export function Button({ title, subtitle, icon, onPress, tone = 'blue', disabled, compact, accessibilityLabel, style }: ButtonProps) {
  const foreground = tone === 'green' || tone === 'orange' || tone === 'teal' ? t.colors.ink : t.colors.text;
  const press = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const move = (toValue: number) => Animated.timing(press, { toValue, duration: reduced ? 0 : t.motion.press, useNativeDriver: true }).start();
  return <View style={[styles.buttonBase, { backgroundColor: shadows[tone], opacity: disabled ? 0.5 : 1 }, style]}>
    <Animated.View style={{ transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: !!disabled }} disabled={disabled}
        onPressIn={() => move(1)} onPressOut={() => move(0)} onPress={() => { void playButtonTap().catch(() => {}); void triggerSelection().catch(() => {}); onPress(); }}
        style={[styles.buttonFace, compact && { minHeight: t.layout.minTouch, paddingVertical: 8 }, { backgroundColor: t.colors[tone] }]}>
        {icon}<View style={styles.buttonCopy}><Text style={[styles.buttonTitle, tone === 'green' && !compact && styles.playTitle, compact && { fontSize: t.size.body }, { color: foreground }]}>{title}</Text>{subtitle && <Text style={[styles.buttonSubtitle, { color: foreground }]}>{subtitle}</Text>}</View>
      </Pressable>
    </Animated.View>
  </View>;
}

export function Card({ children, style, light }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; light?: boolean }>) {
  return <View style={[styles.card, light && { backgroundColor: t.colors.paleBlue, borderColor: '#C5DFFF' }, style]}>{children}</View>;
}

export function Header({ title, subtitle, leading, trailing }: { title: string; subtitle?: string; leading?: React.ReactNode; trailing?: React.ReactNode }) {
  return <View style={styles.header}>{leading}<View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>{subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}</View>{trailing}</View>;
}

export function Popup({ visible, title, children, onClose, footer }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void; footer?: React.ReactNode }>) {
  const reduced = useReducedMotion();
  return <Modal transparent visible={visible} animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
    <SafeAreaView style={styles.scrim}><ScrollView contentContainerStyle={styles.popupScroll}><Card style={styles.popup}>
      <Text accessibilityRole="header" style={styles.popupTitle}>{title}</Text>{children}{footer ?? <Button title="Got it!" onPress={onClose} tone="teal" />}
    </Card></ScrollView></SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  buttonBase: { borderRadius: t.radius.button, paddingBottom: 5 },
  buttonFace: { borderRadius: t.radius.button, minHeight: 64, paddingHorizontal: t.space.lg, paddingVertical: t.space.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: t.space.md, borderWidth: 2, borderColor: '#FFFFFF26' },
  buttonCopy: { alignItems: 'center', flexShrink: 1 },
  buttonTitle: { color: t.colors.text, fontFamily: t.font.bold, fontSize: t.size.label, fontWeight: '900', textAlign: 'center' },
  playTitle: { fontSize: t.size.heading, letterSpacing: 1 },
  buttonSubtitle: { color: t.colors.text, fontFamily: t.font.regular, fontSize: t.size.caption, textAlign: 'center', marginTop: 2 },
  card: { backgroundColor: t.colors.panel, borderRadius: t.radius.card, padding: t.space.lg, borderWidth: 2, borderColor: t.colors.outline, shadowColor: t.colors.night, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  headerTitle: { fontFamily: t.font.bold, fontWeight: '900', color: t.colors.text, fontSize: t.size.label },
  headerSubtitle: { color: t.colors.muted, fontFamily: t.font.regular, fontSize: t.size.caption },
  scrim: { flex: 1, backgroundColor: t.colors.scrim }, popupScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: t.space.xl },
  popup: { width: '100%', maxWidth: 440, gap: t.space.lg }, popupTitle: { color: t.colors.text, fontFamily: t.font.bold, fontSize: t.size.heading, textAlign: 'center' },
});
