import AsyncStorage from '@react-native-async-storage/async-storage';

const tutorialKey = 'rooftop.v1.tutorial-complete';

export async function loadTutorialComplete() {
  return await AsyncStorage.getItem(tutorialKey) === 'true';
}

export async function saveTutorialComplete() {
  await AsyncStorage.setItem(tutorialKey, 'true');
}
