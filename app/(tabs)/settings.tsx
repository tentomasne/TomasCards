import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Info, Circle as HelpCircle, HeartPulse as HeartPulseIcon, Database, Bug } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AppSettings, ThemeMode } from '@/utils/types';
import { loadSettings, saveSettings, saveCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import LanguageSelector from '@/components/LanguageSelector';
import { lightHaptic } from '@/utils/feedback';
import ThemeSelector from '@/components/ThemeSelector';
import StorageModeSelector from '@/components/StorageModeSelector';
import CloudProviderSelector from '@/components/CloudProviderSelector';
import { CloudStorageProvider } from 'react-native-cloud-storage';
import { storageManager } from '@/utils/storageManager';
import { debugManager } from '@/utils/debugManager';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showStorageSelector, setShowStorageSelector] = useState(false);
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');
  const [storageModeLoaded, setStorageModeLoaded] = useState(false);
  const [storageModeChanging, setStorageModeChanging] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [provider, setProvider] = useState<CloudStorageProvider>(CloudStorageProvider.ICloud);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>({
    sortOption: 'alphabetical',
    hapticFeedback: true,
    secureWithBiometrics: false,
    themeMode: 'system',
  });

  // Initialize storage mode
  useEffect(() => {
    const initializeStorageMode = async () => {
      try {
        await storageManager.initialize();
        const currentMode = storageManager.getStorageMode();
        const currentProvider = storageManager.getProvider();
        setStorageMode(currentMode);
        setProvider(currentProvider);
        setStorageModeLoaded(true);
      } catch (error) {
        console.error('Failed to initialize storage mode:', error);
        setStorageModeLoaded(true);
      }
    };
    initializeStorageMode();
  }, []);

  // Load settings and debug status once
  useEffect(() => {
    (async () => {
      const userSettings = await loadSettings();
      setSettings(userSettings);
      setIsDebugEnabled(debugManager.isDebugEnabled());
    })();
  }, []);

  // Reset tap count after 2 seconds of inactivity
  useEffect(() => {
    if (versionTapCount > 0) {
      const timer = setTimeout(() => {
        setVersionTapCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [versionTapCount]);

  // Helper to update both local state and persistent storage
  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleStorageModeChange = async (mode: 'local' | 'cloud') => {
    setStorageModeChanging(true);
    try {
      await storageManager.setStorageMode(mode);
      setStorageMode(mode);
      setShowStorageSelector(false);
      if (mode === 'cloud') {
        setShowProviderSelector(true);
      }
    } catch (error) {
      console.error('Failed to change storage mode:', error);
      
      // Show error message
      if (Platform.OS === 'web') {
        window.alert('Failed to change storage mode. Please try again.');
      } else {
        Alert.alert(
          t('common.labels.error'),
          'Failed to change storage mode. Please try again.',
          [{ text: t('common.buttons.ok') }]
        );
      }
    } finally {
      setStorageModeChanging(false);
    }
  };

  const handleProviderSelect = async (prov: CloudStorageProvider) => {
    setProvider(prov);
    await storageManager.setProvider(prov);
    setShowProviderSelector(false);
  };

  const handleDebugLogs = () => {
    router.push('/debug-logs' as any);
  };

  const handleVersionTap = async () => {
    const newTapCount = versionTapCount + 1;
    setVersionTapCount(newTapCount);

    if (newTapCount === 5) {
      // Toggle debug mode
      const newDebugState = await debugManager.toggleDebugMode();
      setIsDebugEnabled(newDebugState);
      setVersionTapCount(0);

      // Provide haptic feedback
      await lightHaptic();

      // Show confirmation message
      const message = newDebugState 
        ? t('debug.mode.enabled') 
        : t('debug.mode.disabled');

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(
          t('debug.title'),
          message,
          [{ text: t('common.buttons.ok') }]
        );
      }
    }
  };

  const logCounts = debugManager.getLogCount();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
      contentContainerStyle={styles.content}
    >
      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.data')}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => setShowStorageSelector(true)}
          disabled={!storageModeLoaded || storageModeChanging}
        >
          <View style={styles.settingLeft}>
            <Database size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('storage.mode.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {storageModeLoaded ? (
                  storageMode === 'cloud' 
                    ? t('storage.mode.cloud.title')
                    : t('storage.mode.local.title')
                ) : (
                  t('common.labels.loading')
                )}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {storageMode === 'cloud' && (
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
            onPress={() => setShowProviderSelector(true)}
          >
            <View style={styles.settingLeft}>
              <Database size={24} color={colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}> 
                  {t('storage.provider.title')}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}> 
                  {t(`storage.provider.${provider}.title`)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.appearance')}
        </Text>

      
        {/* Language Selector */}
        <LanguageSelector />

        {/* Theme Selector */}
        <ThemeSelector />

        {/* Haptic Option */}
        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => {
            const newValue = !settings.hapticFeedback;
            updateSettings({ ...settings, hapticFeedback: newValue });
            if (newValue) lightHaptic();
          }}
        >
          <View style={styles.settingLeft}>
            <HeartPulseIcon size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.haptic.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.haptic.description')}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(value) => {
              updateSettings({ ...settings, hapticFeedback: value });
              if (value) lightHaptic();
            }}
          />
        </TouchableOpacity>

      </View>

      {/* Debug Section - Only show if debug mode is enabled */}
      {isDebugEnabled && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('debug.title')}
          </Text>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
            onPress={handleDebugLogs}
          >
            <View style={styles.settingLeft}>
              <Bug size={24} color={colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {t('debug.logs.title')}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {t('debug.logs.description', { 
                    total: logCounts.total,
                    errors: logCounts.errors 
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.about')}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => Linking.openURL('mailto:help@tomascards.eu')}
        >
          <View style={styles.settingLeft}>
            <HelpCircle size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.csupport.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.csupport.description')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={handleVersionTap}
        >
          <View style={styles.settingLeft}>
            <Info size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.version', { version: '1.0.0 ALPHA' })}
              </Text>
              {isDebugEnabled && (
                <Text style={[styles.settingDescription, { color: colors.warning }]}>
                  {t('debug.mode.enabled')}
                </Text>
              )}
              {versionTapCount > 0 && versionTapCount < 5 && (
                <Text style={[styles.settingDescription, { color: colors.accent }]}>
                  {5 - versionTapCount} more taps to toggle debug mode
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {storageModeLoaded && (
        <StorageModeSelector
          visible={showStorageSelector}
          currentMode={storageMode}
          onSelect={handleStorageModeChange}
          onClose={() => setShowStorageSelector(false)}
          loading={storageModeChanging}
        />
      )}

      {storageModeLoaded && (
        <CloudProviderSelector
          visible={showProviderSelector}
          currentProvider={provider}
          onSelect={handleProviderSelect}
          onClose={() => setShowProviderSelector(false)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});