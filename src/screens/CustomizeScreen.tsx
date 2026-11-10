import React, { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MenuLayout } from '../components/MenuLayout';
import { ScreenHeader } from '../components/ScreenHeader';
import { MascotAvatar } from '../components/BrandMascot';
import { Button, Card } from '../components/ui';
import { theme as t } from '../theme/theme';
import { HoodieSwatch } from '../components/HoodieSwatch';
import {CharacterViewer} from '../components/CharacterViewer';
import {CHARACTERS,loadCharacter,saveCharacter,loadCourierName,saveCourierName,type CharacterId} from '../game3d/profile';
import { loadOutfit, OUTFITS, OUTFIT_PRICES, loadOwnedOutfits, unlockOutfit } from '../game3d/profile';
import { loadRunnerPhoto, loadWalletCoins, removeRunnerPhoto, saveRunnerPhoto } from '../services/runnerPhotoService';

export function CustomizeScreen({ navigation }: { navigation: any }) {
  const [courierName,setCourierName]=useState(''),[nameReady,setNameReady]=useState(false),[savingName,setSavingName]=useState(false);
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [character,setCharacter]=useState<CharacterId>('boy'),[selecting,setSelecting]=useState(false);
  const [outfit, setOutfit] = useState(0), [owned, setOwned] = useState<number[]>([0, 1, 2]);
  const [buying, setBuying] = useState(false), [wallet, setWallet] = useState<number | null>(null);
  useEffect(() => {
    loadCharacter().then(setCharacter).catch(()=>{});
    loadCourierName().then(setCourierName).catch(()=>{}).finally(()=>setNameReady(true));
    loadOwnedOutfits().then(setOwned).catch(() => {}); loadOutfit().then(setOutfit).catch(() => {});
    loadRunnerPhoto().then(setFaceUri).catch(() => {}); loadWalletCoins().then(setWallet).catch(() => {});
  }, []);
  const chooseFace = async (camera: boolean) => {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { Alert.alert('Camera permission needed', 'Allow Rooftop Rush to take your runner photo.'); return; }
      const options = { mediaTypes: ['images'] as ['images'], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.7 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) setFaceUri(await saveRunnerPhoto(result.assets[0].uri));
    } catch (error) { Alert.alert('Photo could not be saved', error instanceof Error ? error.message : 'Try again.'); }
  };
  const selectOutfit = async (index: number) => {
    if (buying) return;
    setBuying(true);
    try { setOwned(await unlockOutfit(index)); setOutfit(index); setWallet(await loadWalletCoins()); }
    catch (error) { Alert.alert('Your wardrobe', error instanceof Error ? error.message : 'Try again.'); }
    finally { setBuying(false); }
  };
  const resetPhoto = async () => {
    try { await removeRunnerPhoto(); setFaceUri(null); }
    catch { Alert.alert('Could not remove photo', 'Please try again.'); }
  };
  const selectCharacter=async(id:CharacterId)=>{if(selecting)return;setSelecting(true);try{await saveCharacter(id);setCharacter(id);}catch{Alert.alert('Could not save courier','Please try again.');}finally{setSelecting(false);}};
  const saveName=async()=>{if(savingName||!nameReady)return;setSavingName(true);try{setCourierName(await saveCourierName(courierName));Keyboard.dismiss();Alert.alert('Name saved','Your courier is ready to roll!');}catch(error){Alert.alert('Courier name',error instanceof Error?error.message:'Please try again.');}finally{setSavingName(false);}};
  return <MenuLayout>
    <ScreenHeader title="Your Runner" subtitle="A little style. A lot of rush." onBack={() => navigation.goBack()} trailing={<Text style={s.wallet}>● {wallet === null ? '—' : wallet.toLocaleString()}</Text>} />
    <View style={s.row}>{CHARACTERS.map(item=><Button key={item.id} title={item.name+(character===item.id?' - Selected':'')} compact tone={character===item.id?'teal':'panel'} style={s.flex} disabled={selecting} onPress={()=>void selectCharacter(item.id)}/>)}</View>
    <CharacterViewer character={character}/>
    <Card style={s.photoCard}><Text style={s.heading}>Courier name</Text><Text style={s.copy}>Choose a name, up to 20 characters. Saved on this device.</Text><TextInput accessibilityLabel="Courier name" value={courierName} onChangeText={setCourierName} editable={nameReady&&!savingName} placeholder="Your courier name" placeholderTextColor={t.colors.muted} style={s.nameInput} returnKeyType="done" onSubmitEditing={()=>void saveName()}/><Button compact title={savingName?'Saving...':'Save name'} disabled={!nameReady||savingName} onPress={()=>void saveName()}/></Card>
    <Card light><View style={s.profile}>{faceUri?<Image source={{uri:faceUri}} style={s.photo}/>:<MascotAvatar size={40}/>}<Text style={s.profileText}>Your profile photo appears in the run HUD.</Text></View></Card>
    <Text accessibilityRole="header" style={s.heading}>Hoodie collection</Text>
    <Text style={s.copy}>Choose your in-game hoodie. Unlocked outfits are yours to keep.</Text>
    <View style={s.grid}>{OUTFITS.map((item, index) => {
      const selected = outfit === index, unlocked = owned.includes(index);
      return <Card key={item.name} style={[s.outfit, selected && { borderColor: t.colors.teal }]}>
        <View style={[s.swatch, { backgroundColor: item.color }]}><HoodieSwatch /><Text style={s.swatchMark}>{selected ? '✓' : unlocked ? '✦' : '●'}</Text></View>
        <Text style={s.outfitName}>{item.name}</Text><Text style={s.price}>{selected ? 'Equipped' : unlocked ? 'In your wardrobe' : `${OUTFIT_PRICES[index]} coins`}</Text>
        <Button compact title={selected ? 'Selected ✓' : unlocked ? 'Wear it' : 'Unlock'} tone={selected ? 'teal' : 'blue'} disabled={buying || selected} onPress={() => void selectOutfit(index)} accessibilityLabel={`${item.name} outfit, ${selected ? 'selected' : unlocked ? 'owned' : OUTFIT_PRICES[index] + ' coins'}`} />
      </Card>;
    })}</View>
    <Card style={s.photoCard}><Text style={s.heading}>Make it personal</Text><Text style={s.copy}>Your optional profile photo appears in the game HUD.</Text><View style={s.row}><Button title="Take selfie" compact style={s.flex} onPress={() => void chooseFace(true)} /><Button title="Pick photo" compact tone="panel" style={s.flex} onPress={() => void chooseFace(false)} /></View>{faceUri && <Button title="Remove photo" compact tone="panel" onPress={() => void resetPhoto()} />}</Card>
    <Button title="Looking good! Back to city" tone="green" onPress={() => navigation.goBack()} />
  </MenuLayout>;
}
const s=StyleSheet.create({
  nameInput:{color:t.colors.text,fontFamily:t.font.regular,fontSize:18,borderWidth:2,borderColor:t.colors.teal,borderRadius:18,padding:14},
  wallet: { color: t.colors.gold, fontFamily: t.font.bold, fontWeight: '900', fontSize: 16 }, hero: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingRight: 0 }, heroCopy: { flex: 1, zIndex: 1 }, badge: { color: t.colors.blueShadow, fontFamily: t.font.bold, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, heroTitle: { color: t.colors.ink, fontFamily: t.font.bold, fontSize: 27, fontWeight: '900', marginTop: 8, lineHeight: 32 }, heroText: { color: '#526B8D', fontFamily: t.font.regular, fontSize: 12, lineHeight: 18, marginTop: 10 }, profile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 14 }, photo: { width: 40, height: 40, borderRadius: 15 }, profileText: { color: t.colors.ink, fontFamily: t.font.bold, fontSize: 10 }, heading: { color: t.colors.text, fontFamily: t.font.bold, fontWeight: '900', fontSize: 22 }, copy: { color: t.colors.muted, fontFamily: t.font.regular, fontSize: 13, lineHeight: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, outfit: { flexBasis: '46%', flexGrow: 1, maxWidth: '49%', padding: 12, gap: 7 }, swatch: { height: 85, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, hoodie: { color: '#FFFFFFD9', fontSize: 64, lineHeight: 74 }, swatchMark: { position: 'absolute', right: 9, top: 5, color: '#FFF', fontSize: 18, fontWeight: '900' }, outfitName: { color: t.colors.text, fontFamily: t.font.bold, fontSize: 17, fontWeight: '900' }, price: { color: t.colors.muted, fontFamily: t.font.regular, fontSize: 12 }, photoCard: { gap: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, flex: { flex: 1 },
});
