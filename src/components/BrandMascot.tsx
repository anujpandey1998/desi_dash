import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { theme as t } from '../theme/theme';
import { useReducedMotion } from './ui';
import {CharacterPortrait} from './CharacterPortrait';
import type {CharacterId} from '../game3d/profile';

export const COURIER_ART = require('../assets/mascot/blue-courier.png');
export const BRAND_ICON = require('../assets/branding/app-icon.png');
export const SPLASH_ART = require('../assets/branding/splash-rooftops.png');
export const FEATURE_ART = require('../assets/branding/feature-banner.png');

/** Approved artwork is kept intact; idle motion stops off-screen. */
export function BrandMascot({ size = 230, active = true,character='boy' }: { size?: number; active?: boolean;character?:CharacterId }) {
  const focused = useIsFocused(), reduced = useReducedMotion();
  const idle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    idle.setValue(0);
    if (reduced || !active || !focused) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: t.motion.idle, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(idle, { toValue: 0, duration: t.motion.idle, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [active, focused, idle, reduced]);
  return <Animated.View style={{ width: size * 0.72, height: size, transform: [{ translateY: idle.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
    {character==='girl'?<CharacterPortrait character="girl" width={size*.72} height={size}/>:<Image source={COURIER_ART} resizeMode="contain" accessibilityLabel="Your blue-hoodie courier" style={{ width: '100%', height: '100%' }} />}
  </Animated.View>;
}

export function MascotAvatar({ size = 48 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.35, overflow: 'hidden', borderWidth: 2, borderColor: '#8EB8FF' }}>
    <Image source={BRAND_ICON} style={{ width: '100%', height: '100%' }} accessibilityLabel="Courier avatar" />
  </View>;
}
