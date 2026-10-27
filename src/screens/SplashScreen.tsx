import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

export function SplashScreen({ navigation }: { navigation: any }) {
  const fade = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('MainMenu');
    }, 1500);

    return () => clearTimeout(timer);
  }, [fade, navigation]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.logo, { opacity: fade }]}> 
        <Text style={styles.title}>ROOFTOP RUSH</Text>
        <Text style={styles.subtitle}>The city is waking up...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 5,
  },
  subtitle: {
    marginTop: 12,
    color: '#9FB3FF',
    fontSize: 14,
    letterSpacing: 2,
  },
});
