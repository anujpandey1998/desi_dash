import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { MainMenuScreen } from './src/screens/MainMenuScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';

import { ChallengesScreen } from './src/screens/ChallengesScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="MainMenu" component={MainMenuScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Challenges" component={ChallengesScreen} />
          <Stack.Screen name="Customize" component={CustomizeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
