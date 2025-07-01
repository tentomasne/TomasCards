import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '@/i18n/locales/en.json';
import sk from '@/i18n/locales/sk.json';
import cs from '@/i18n/locales/cs.json';
import fr from '@/i18n/locales/fr.json';
import es from '@/i18n/locales/es.json';
import it from '@/i18n/locales/it.json';
import uk from '@/i18n/locales/uk.json';

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

// Initialize i18n with a default language first
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      sk: { translation: sk },
      cs: { translation: cs },
      fr: { translation: fr },
      es: { translation: es },
      it: { translation: it },
      uk: { translation: uk },
    },
    lng: 'en', // Start with English as default
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
  try {
    // First check if user has a stored language preference
    const storedLanguage = await getStoredLanguage();
    
    if (storedLanguage) {
      // User has a stored preference, use it
      await i18n.changeLanguage(storedLanguage);
      console.log('Using stored language:', storedLanguage);
    } else {
      // No stored preference, use device language
      const deviceLanguage = Localization.locale.split('-')[0];
      const supportedLanguages = ['en', 'sk', 'cs', 'fr', 'es', 'it', 'uk'];
      const languageToUse = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
      
      await i18n.changeLanguage(languageToUse);
      await setStoredLanguage(languageToUse);
      console.log('Using device language:', languageToUse);
    }
  } catch (error) {
    console.error('Error initializing language:', error);
    // Fallback to English if there's any error
    await i18n.changeLanguage('en');
    await setStoredLanguage('en');
  }
};

export default i18n;