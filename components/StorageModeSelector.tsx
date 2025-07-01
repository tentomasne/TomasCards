import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Cloud, Smartphone, Check, TriangleAlert as AlertTriangle, WifiOff, Copy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { StorageMode } from '@/utils/storageManager';
import * as Updates from 'expo-updates';

interface StorageModeSelectorProps {
  visible: boolean;
  currentMode: StorageMode;
  onSelect: (mode: StorageMode, shouldMigrateData?: boolean) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function StorageModeSelector({
  visible,
  currentMode,
  onSelect,
  onClose,
  loading = false,
}: StorageModeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [selectedMode, setSelectedMode] = useState<StorageMode>(currentMode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldMigrateData, setShouldMigrateData] = useState(true);

  // Reset selected mode when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedMode(currentMode);
      setIsProcessing(false);
      setShouldMigrateData(true); // Default to true
    }
  }, [visible, currentMode]);

  const reloadApp = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, reload the page
        window.location.reload();
      } else {
        // For native, try to reload using Expo Updates
        try {
          await Updates.reloadAsync();
        } catch (updateError) {
          // If Updates.reloadAsync fails, show a message to manually restart
          Alert.alert(
            'Restart Required',
            'Please close and reopen the app to complete the storage mode change.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Failed to reload app:', error);
      // Fallback: show manual restart message
      Alert.alert(
        'Restart Required',
        'Please close and reopen the app to complete the storage mode change.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSelect = async (mode: StorageMode) => {
    // Don't allow selection while processing
    if (isProcessing || loading) return;

    // Prevent switching to cloud mode when offline
    if (mode === 'cloud' && !isOnline) {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.message'),
        [{ text: t('common.buttons.ok') }]
      );
      return;
    }

    // If switching modes, show migration confirmation
    if (currentMode !== mode) {
      const migrationMessage = mode === 'cloud' 
        ? `Switch to cloud storage and ${shouldMigrateData ? 'copy your local cards to the cloud' : 'start fresh in the cloud'}?`
        : `Switch to local storage and ${shouldMigrateData ? 'copy your cloud cards locally' : 'start fresh locally'}?`;

      if (Platform.OS === 'web') {
        const confirmed = window.confirm(migrationMessage);
        if (confirmed) {
          await handleModeChange(mode);
        }
      } else {
        Alert.alert(
          t('storage.mode.warning.title'),
          migrationMessage,
          [
            {
              text: t('common.buttons.cancel'),
              style: 'cancel',
              onPress: () => {
                // Reset to current mode if user cancels
                setSelectedMode(currentMode);
              },
            },
            {
              text: 'Switch',
              style: 'destructive',
              onPress: () => handleModeChange(mode),
            },
          ]
        );
      }
    } else {
      await handleModeChange(mode);
    }
  };

  const handleModeChange = async (mode: StorageMode) => {
    setIsProcessing(true);
    setSelectedMode(mode);
    
    try {
      // Apply the storage mode change with migration preference
      await onSelect(mode, shouldMigrateData);
      
      // If switching to local mode, reload immediately
      if (mode === 'local') {
        const successMessage = shouldMigrateData 
          ? 'Switched to local storage and copied your cloud data. The app will now reload.'
          : 'Switched to local storage. The app will now reload.';
        
        if (Platform.OS === 'web') {
          alert(successMessage);
          await reloadApp();
        } else {
          Alert.alert(
            'Storage Mode Changed',
            successMessage,
            [
              {
                text: 'Reload Now',
                onPress: reloadApp,
              }
            ],
            { cancelable: false }
          );
        }
      } else {
        // For cloud mode, just close the modal - provider selector will open next
        // Don't reload yet - wait for provider selection
        setIsProcessing(false);
        // The parent component will handle opening the provider selector
      }
    } catch (error) {
      console.error('Failed to change storage mode:', error);
      // Reset to current mode if operation failed
      setSelectedMode(currentMode);
      
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
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing || loading) return;
    
    // Reset selected mode to current mode when closing
    setSelectedMode(currentMode);
    onClose();
  };

  const showMigrationOption = selectedMode !== currentMode;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('storage.mode.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('storage.mode.subtitle')}
          </Text>

          {/* Offline Warning */}
          {!isOnline && (
            <View style={[styles.offlineWarning, { backgroundColor: colors.backgroundLight }]}>
              <WifiOff size={16} color={colors.error} />
              <Text style={[styles.offlineWarningText, { color: colors.error }]}>
                {t('storage.offline.banner')}
              </Text>
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selectedMode === 'cloud' && { borderColor: colors.accent, borderWidth: 2 },
                !isOnline && styles.disabledOption,
              ]}
              onPress={() => setSelectedMode('cloud')}
              disabled={isProcessing || loading || !isOnline}
            >
              <View style={styles.optionHeader}>
                <Cloud size={24} color={!isOnline ? colors.textHint : colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: !isOnline ? colors.textHint : colors.textPrimary }]}>
                  {t('storage.mode.cloud.title')}
                </Text>
                <View style={styles.badges}>
                  {!isOnline && (
                    <View style={[styles.disabledBadge, { backgroundColor: colors.error }]}>
                      <Text style={[styles.disabledText, { color: colors.textPrimary }]}>
                        Offline
                      </Text>
                    </View>
                  )}
                  {selectedMode === 'cloud' && isOnline && (
                    <Check size={20} color={colors.accent} />
                  )}
                </View>
              </View>
              <Text style={[styles.optionDescription, { color: !isOnline ? colors.textHint : colors.textSecondary }]}>
                {!isOnline 
                  ? t('storage.offline.message')
                  : t('storage.mode.cloud.description')
                }
              </Text>
              <View style={styles.features}>
                <Text style={[styles.feature, { color: !isOnline ? colors.textHint : colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature1')}
                </Text>
                <Text style={[styles.feature, { color: !isOnline ? colors.textHint : colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature2')}
                </Text>
                <Text style={[styles.feature, { color: !isOnline ? colors.textHint : colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature3')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selectedMode === 'local' && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => setSelectedMode('local')}
              disabled={isProcessing || loading}
            >
              <View style={styles.optionHeader}>
                <Smartphone size={24} color={colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('storage.mode.local.title')}
                </Text>
                {selectedMode === 'local' && (
                  <Check size={20} color={colors.accent} />
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('storage.mode.local.description')}
              </Text>
              <View style={styles.features}>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.local.feature1')}
                </Text>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.local.feature2')}
                </Text>
                <Text style={[styles.feature, { color: colors.warning }]}>
                  ⚠ {t('storage.mode.local.limitation')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Data Migration Option */}
          {showMigrationOption && (
            <View style={[styles.migrationContainer, { backgroundColor: colors.backgroundLight }]}>
              <View style={styles.migrationHeader}>
                <Copy size={20} color={colors.accent} />
                <Text style={[styles.migrationTitle, { color: colors.textPrimary }]}>
                  Data Migration
                </Text>
              </View>
              <View style={styles.migrationOption}>
                <View style={styles.migrationTextContainer}>
                  <Text style={[styles.migrationLabel, { color: colors.textPrimary }]}>
                    {selectedMode === 'cloud' 
                      ? 'Copy local cards to cloud storage'
                      : 'Copy cloud cards to local storage'
                    }
                  </Text>
                  <Text style={[styles.migrationDescription, { color: colors.textSecondary }]}>
                    {selectedMode === 'cloud'
                      ? 'Your existing local cards will be uploaded to the cloud'
                      : 'Your existing cloud cards will be downloaded locally'
                    }
                  </Text>
                </View>
                <Switch
                  value={shouldMigrateData}
                  onValueChange={setShouldMigrateData}
                  trackColor={{ false: colors.backgroundMedium, true: colors.accent }}
                  thumbColor={colors.textPrimary}
                />
              </View>
              {!shouldMigrateData && (
                <View style={[styles.warningContainer, { backgroundColor: colors.backgroundMedium }]}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                    {selectedMode === 'cloud'
                      ? 'You will start with an empty cloud storage. Your local cards will remain on this device only.'
                      : 'You will start with empty local storage. Your cloud cards will remain in the cloud only.'
                    }
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.accent },
              (isProcessing || loading) && styles.disabledButton
            ]}
            onPress={() => handleSelect(selectedMode)}
            disabled={isProcessing || loading}
          >
            {(isProcessing || loading) ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.confirmButtonText, { color: colors.textPrimary }]}>
                {showMigrationOption ? 'Switch Storage Mode' : t('common.buttons.confirm')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.closeButton, 
              { backgroundColor: colors.backgroundMedium },
              (isProcessing || loading) && styles.disabledButton
            ]}
            onPress={handleClose}
            disabled={isProcessing || loading}
          >
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
              {t('common.buttons.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offlineWarningText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },
  options: {
    gap: 16,
    marginBottom: 16,
  },
  option: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disabledText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  features: {
    gap: 4,
  },
  feature: {
    fontSize: 12,
    lineHeight: 16,
  },
  migrationContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  migrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  migrationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  migrationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  migrationTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  migrationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  migrationDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  disabledButton: {
    opacity: 0.6,
  },
});