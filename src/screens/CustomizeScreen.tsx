import { loadOutfit, OUTFITS, saveOutfit } from '../game3d/profile';
import { MenuLayout } from '../components/MenuLayout';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { loadRunnerPhoto, removeRunnerPhoto, saveRunnerPhoto } from '../services/runnerPhotoService';

export function CustomizeScreen({ navigation }: { navigation: any }) {
  const [faceUri, setFaceUri] = useState<string | null>(null);

  const [outfit, setOutfit] = useState(0);

  useEffect(() => {
    loadOutfit().then(setOutfit).catch(() => {});
    loadRunnerPhoto().then(setFaceUri).catch(() => {});
  }, []);

  const chooseFace = async (camera: boolean) => {
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow Neon Dash to open the camera for your runner face.');
          return;
        }
      }

      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });

      if (!result.canceled && result.assets[0]?.uri) {
        const savedUri = await saveRunnerPhoto(result.assets[0].uri);
        setFaceUri(savedUri);
      }
    } catch (error) {
      Alert.alert('Photo could not be saved', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const handleReset = async () => {
    await removeRunnerPhoto();
    setFaceUri(null);
  };

  return (
    <MenuLayout style={styles.root}>
      <Text style={styles.title}>YOUR RUNNER</Text>

      <Text style={{ color: '#a8c3c9', marginBottom: 14 }}>Choose your 3D runner's hoodie</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {OUTFITS.map((item, index) => <Pressable accessibilityLabel={item.name + ' outfit'} key={item.name} onPress={() => { setOutfit(index); void saveOutfit(index); }} style={{ flex: 1, backgroundColor: item.color, borderRadius: 14, paddingVertical: 22, alignItems: 'center', borderWidth: 3, borderColor: outfit === index ? '#fff1ce' : 'transparent' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{item.name}{outfit === index ? ' ?' : ''}</Text></Pressable>)}
      </View>
      <Text style={{ color: '#a8c3c9', marginBottom: 10 }}>Optional profile photo (shown in your HUD)</Text>
      <View style={styles.previewArea}>
        {faceUri ? (
          <Image source={{ uri: faceUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <Text style={styles.previewText}>No photo selected</Text>
        )}
      </View>

      <Pressable style={styles.actionButton} onPress={() => void chooseFace(true)}>
        <Text style={styles.buttonText}>TAKE SELFIE</Text>
      </Pressable>

      <Pressable style={styles.actionButton} onPress={() => void chooseFace(false)}>
        <Text style={styles.buttonText}>CHOOSE PHOTO</Text>
      </Pressable>

      <Pressable style={styles.actionButton} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>SAVE & BACK</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => void handleReset()}>
        <Text style={styles.buttonText}>REMOVE PHOTO</Text>
      </Pressable>
    </MenuLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: COLORS.sky,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
  },
  previewArea: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    backgroundColor: '#1B2346',
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#39D8FF',
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewText: {
    color: '#B9C4ED',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#23D9C7',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2A335E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
