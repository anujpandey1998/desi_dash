import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/store/authStore';
import { LoginScreen, SignupScreen, ForgotPasswordScreen } from './src/screens/auth/AuthScreens';
import { RoomsScreen, RoomLobbyScreen, RoomResultsScreen } from './src/screens/rooms/RoomScreens';
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

function Routes(){
  const {loading,user,configured}=useAuth();
  if(loading)return <View style={{flex:1,backgroundColor:'#101E38',justifyContent:'center'}}><ActivityIndicator color="#2EC4B6" size="large"/></View>;
  return <Stack.Navigator key={user?.uid||'guest'} initialRouteName={user?'MainMenu':!configured?'Splash':'Login'} screenOptions={{headerShown:false}}>
    <Stack.Screen name="Login" component={LoginScreen}/><Stack.Screen name="Signup" component={SignupScreen}/><Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
    {(user||!configured)&&<>
      <Stack.Screen name="Splash" component={SplashScreen}/><Stack.Screen name="MainMenu" component={MainMenuScreen}/><Stack.Screen name="Game" component={GameScreen}/>
      <Stack.Screen name="Challenges" component={ChallengesScreen}/><Stack.Screen name="Customize" component={CustomizeScreen}/><Stack.Screen name="Settings" component={SettingsScreen}/>
      <Stack.Screen name="Rooms" component={RoomsScreen}/><Stack.Screen name="RoomLobby" component={RoomLobbyScreen}/><Stack.Screen name="RoomResults" component={RoomResultsScreen}/>
    </>}
  </Stack.Navigator>;
}
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AuthProvider><NavigationContainer><Routes/></NavigationContainer></AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
