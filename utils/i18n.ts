import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/i18n/locales/en.json';
import sk from '@/i18n/locales/sk.json';

const LANGUAGE_KEY = 'user_language';

export const getStoredLanguage = async () => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error getting stored language:', error);
    return null;
  }
};

export const setStoredLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error setting stored language:', error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      sk: { translation: sk },
    },
    lng: Localization.locale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  await setStoredLanguage(language);
};

export const initializeLanguage = async () => {
  const storedLanguage = await getStoredLanguage();
  if (storedLanguage) {
    await i18n.changeLanguage(storedLanguage);
  } else {
    const deviceLanguage = Localization.locale.split('-')[0];
    await i18n.changeLanguage(deviceLanguage);
    await setStoredLanguage(deviceLanguage);
  }
};

export default i18n;