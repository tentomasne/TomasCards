import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { changeLanguage, getStoredLanguage } from '@/utils/i18n';
import { lightHaptic } from '@/utils/feedback';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'sk', name: 'Slovenčina', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'cs', name: 'Čeština', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'uk', name: 'Українська', nativeName: 'Українська', flag: '🇺🇦' },
];

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLanguageCode, setCurrentLanguageCode] = useState(i18n.language);

  // Update current language when i18n language changes
  useEffect(() => {
    const updateLanguage = () => {
      setCurrentLanguageCode(i18n.language);
    };

    // Listen for language changes
    i18n.on('languageChanged', updateLanguage);
    
    // Set initial language
    updateLanguage();

    return () => {
      i18n.off('languageChanged', updateLanguage);
    };
  }, [i18n]);

  // Also sync with stored language on component mount
  useEffect(() => {
    const syncStoredLanguage = async () => {
      try {
        const storedLang = await getStoredLanguage();
        if (storedLang && storedLang !== i18n.language) {
          // If stored language differs from current, update i18n
          await i18n.changeLanguage(storedLang);
          setCurrentLanguageCode(storedLang);
        }
      } catch (error) {
        console.error('Error syncing stored language:', error);
      }
    };

    syncStoredLanguage();
  }, [i18n]);

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLanguageCode) {
      setModalVisible(false);
      return;
    }

    setLoading(true);
    await lightHaptic();

    try {
      await changeLanguage(langCode);
      setCurrentLanguageCode(langCode);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
      setModalVisible(false);
    }
  };

  const currentLanguage = LANGUAGES.find(
    lang => lang.code === currentLanguageCode
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.backgroundMedium }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Globe size={24} color={colors.textSecondary} />
          <View style={styles.selectorText}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.language.title')}
            </Text>
            <View style={styles.currentLanguageContainer}>
              <Text style={[styles.currentLanguage, { color: colors.textSecondary }]}>
                {currentLanguage?.name || 'English'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundDark }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('settings.language.available')}
            </Text>

            <ScrollView style={styles.languageList}>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    { backgroundColor: colors.backgroundMedium }
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                  disabled={loading}
                >
                  <View style={styles.languageInfo}>
                    <View style={styles.languageHeader}>
                      <Text style={styles.flag}>{language.flag}</Text>
                      <View style={styles.languageTextContainer}>
                        <Text style={[styles.languageName, { color: colors.textPrimary }]}>
                          {language.name}
                        </Text>
                        {language.nativeName !== language.name && (
                          <Text style={[styles.nativeName, { color: colors.textSecondary }]}>
                            {language.nativeName}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {currentLanguageCode === language.code && (
                    <Check size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading && (
              <ActivityIndicator
                size="large"
                color={colors.accent}
                style={styles.loader}
              />
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={() => setModalVisible(false)}
              disabled={loading}
            >
              <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
                {t('common.buttons.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    marginLeft: 16,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentLanguageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  flag: {
    fontSize: 16,
    marginRight: 8,
  },
  currentLanguage: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  languageList: {
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageInfo: {
    flex: 1,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
  },
  nativeName: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
});