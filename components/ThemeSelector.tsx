import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { loadSettings, saveSettings } from '@/utils/storage';
import { AppSettings, ThemeMode } from '@/utils/types';
import { lightHaptic } from '@/utils/feedback';

const THEMES: Array<{ code: ThemeMode; labelKey: string; icon: React.ReactNode }> = [
  {
    code: 'light',
    labelKey: 'settings.theme.light',
    icon: <Sun size={24} />,
  },
  {
    code: 'dark',
    labelKey: 'settings.theme.dark',
    icon: <Moon size={24} />,
  },
  {
    code: 'system',
    labelKey: 'settings.theme.system',
    icon: <Monitor size={24} />,
  },
];

export default function ThemeSelector() {
  const { t } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    sortOption: 'alphabetical',
    hapticFeedback: true,
    secureWithBiometrics: false,
    themeMode: 'system',
  });

  // Load current settings (so we know which theme is active)
  useEffect(() => {
    (async () => {
      const userSettings = await loadSettings();
      setSettings(userSettings);
    })();
  }, []);

  const handleThemeSelect = async (mode: ThemeMode) => {
    setLoading(true);
    if (Platform.OS !== 'web') {
      await lightHaptic();
    }

    try {
      // 1) Update app theme (immediately)
      setThemeMode(mode);

      // 2) Persist to storage
      const updated: AppSettings = { ...settings, themeMode: mode };
      setSettings(updated);
      await saveSettings(updated);
    } catch (err) {
      console.error('Error saving theme:', err);
    } finally {
      setLoading(false);
      setModalVisible(false);
    }
  };

  // Find the current theme entry
  const currentTheme = THEMES.find((tItem) => tItem.code === settings.themeMode);

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.backgroundMedium }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          {/* Display the appropriate icon for the current theme */}
          {currentTheme?.icon &&
            React.cloneElement(
              currentTheme.icon as React.ReactElement<any>,
              { color: colors.textSecondary }
            )}
          <View style={styles.selectorText}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings.sections.appearance')}
            </Text>
            <Text style={[styles.currentValue, { color: colors.textSecondary }]}>
              {currentTheme ? t(currentTheme.labelKey) : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!loading) setModalVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundDark }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('settings.theme.available')} 
              {/* Make sure you have a translation key like "settings.theme.available": "Choose Theme" */}
            </Text>

            <ScrollView style={styles.optionList}>
              {THEMES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.optionRow,
                    { backgroundColor: colors.backgroundMedium },
                  ]}
                  onPress={() => handleThemeSelect(item.code)}
                  disabled={loading}
                >
                  <View style={styles.optionLeft}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, {
                      color: colors.textSecondary,
                    })}
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                        {t(item.labelKey)}
                      </Text>
                    </View>
                  </View>

                  {settings.themeMode === item.code && (
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
  currentValue: {
    fontSize: 14,
    marginTop: 2,
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
  optionList: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
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
});
