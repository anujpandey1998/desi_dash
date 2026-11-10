import React, { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { RooftopBackdrop } from './RooftopBackdrop';
import { theme as t } from '../theme/theme';

export function MenuLayout({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={styles.root}><StatusBar style="light" /><RooftopBackdrop /><SafeAreaView style={{ flex: 1 }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
    </KeyboardAvoidingView></SafeAreaView></View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.night },
  content: { flexGrow: 1, width: '100%', maxWidth: t.layout.maxWidth, alignSelf: 'center', padding: t.layout.gutter, gap: t.space.lg, paddingBottom: t.space.xxl },
});
