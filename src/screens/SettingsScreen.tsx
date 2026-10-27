import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MenuLayout } from '../components/MenuLayout';
import { loadSoundSetting, loadVibrationSetting, setSoundEnabled, setVibrationEnabled } from '../services/audioService';
export function SettingsScreen({ navigation }: { navigation: any }) {
  const [sound, setSound] = useState(true), [vibration, setVibration] = useState(true);
  useEffect(() => { loadSoundSetting().then(setSound).catch(() => {}); loadVibrationSetting().then(setVibration).catch(() => {}); }, []);
  return <MenuLayout style={styles.root}>
    <Text style={styles.eyebrow}>MAKE IT YOURS</Text><Text style={styles.title}>Settings.</Text>
    <View style={styles.row}><View><Text style={styles.label}>City sounds</Text><Text style={styles.hint}>Music and game effects</Text></View><Pressable accessibilityLabel="Toggle sound" style={[styles.toggle, sound && styles.enabled]} onPress={() => { setSound(!sound); void setSoundEnabled(!sound).catch(() => {}); }}><Text style={styles.toggleText}>{sound ? 'ON' : 'OFF'}</Text></Pressable></View>
    <View style={styles.row}><View><Text style={styles.label}>Vibration</Text><Text style={styles.hint}>Feel collisions and impacts</Text></View><Pressable accessibilityLabel="Toggle vibration" style={[styles.toggle, vibration && styles.enabled]} onPress={() => { setVibration(!vibration); void setVibrationEnabled(!vibration).catch(() => {}); }}><Text style={styles.toggleText}>{vibration ? 'ON' : 'OFF'}</Text></Pressable></View>
    <View style={styles.guide}><Text style={styles.guideTitle}>OWN THE TRACKS</Text><Text style={styles.guideText}>Swipe left / right to change lanes.{ '\n' }Swipe up or tap to jump barriers.{ '\n' }Swipe down to slide under red gates.{ '\n' }Dodge trains. Collect coins and blue shields.{ '\n\n' }Use the on-screen buttons if you prefer. A shield absorbs one crash. Your run pauses automatically when you leave the app.</Text></View>
    <Pressable style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>BACK TO CITY</Text></Pressable>
  </MenuLayout>;
}
const styles=StyleSheet.create({
  root:{padding:25,paddingTop:38},eyebrow:{color:'#ddb268',fontSize:10,letterSpacing:2.5,fontWeight:'900'},title:{color:'#fff3dc',fontSize:40,fontWeight:'900',marginTop:10,marginBottom:30},
  row:{backgroundColor:'#193a47',padding:18,borderRadius:18,marginBottom:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},label:{color:'#e7eeE4',fontSize:16,fontWeight:'800'},hint:{color:'#8bacb6',fontSize:11,marginTop:5},
  toggle:{paddingVertical:11,paddingHorizontal:17,borderRadius:12,backgroundColor:'#61727a'},enabled:{backgroundColor:'#e6b45c'},toggleText:{color:'#152e3b',fontSize:11,fontWeight:'900'},
  guide:{padding:22,borderWidth:1,borderColor:'#31525c',borderRadius:20,marginTop:16},guideTitle:{color:'#efc677',fontSize:11,fontWeight:'900',letterSpacing:2},guideText:{color:'#a4c0c8',lineHeight:26,fontSize:12,marginTop:14},
  back:{backgroundColor:'#e8b65e',borderRadius:15,alignItems:'center',padding:18,marginTop:28},backText:{color:'#17313c',fontSize:12,letterSpacing:1.5,fontWeight:'900'},
});
