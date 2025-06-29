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
} from 'react-native';
import { Cloud, Smartphone, Check, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { StorageMode } from '@/utils/storageManager';
import * as Updates from 'expo-updates';

interface StorageModeSelectorProps {
  visible: boolean;
  currentMode: StorageMode;
  onSelect: (mode: StorageMode) => Promise<void>;
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
  const [selectedMode, setSelectedMode] = useState<StorageMode>(currentMode);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset selected mode when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedMode(currentMode);
      setIsProcessing(false);
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

    // Show warning when switching from local to cloud
    if (currentMode === 'local' && mode === 'cloud') {
      const confirmMessage = `${t('storage.mode.warning.title')}\n\n${t('storage.mode.warning.message')}\n\nYou'll be able to select your cloud provider next.`;
      
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed) {
          await handleModeChange(mode);
        }
      } else {
        Alert.alert(
          t('storage.mode.warning.title'),
          `${t('storage.mode.warning.message')}\n\nYou'll be able to select your cloud provider next.`,
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
              text: t('storage.mode.warning.confirm'),
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
      // Apply the storage mode change
      await onSelect(mode);
      
      // If switching to local mode, reload immediately
      if (mode === 'local') {
        const successMessage = 'Switched to local storage. The app will now reload.';
        
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

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selectedMode === 'cloud' && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => handleSelect('cloud')}
              disabled={isProcessing || loading}
            >
              <View style={styles.optionHeader}>
                <Cloud size={24} color={colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('storage.mode.cloud.title')}
                </Text>
                <View style={styles.badges}>
                  {selectedMode === 'cloud' && (
                    <Check size={20} color={colors.accent} />
                  )}
                </View>
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('storage.mode.cloud.description')}
              </Text>
              <View style={styles.features}>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature1')}
                </Text>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature2')}
                </Text>
                <Text style={[styles.feature, { color: colors.success }]}>
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
              onPress={() => handleSelect('local')}
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

          {/* Warning about app reload - only show for local mode */}
          {selectedMode === 'local' && (
            <View style={[styles.warningContainer, { backgroundColor: colors.backgroundLight }]}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                Switching to local storage will reload the app to ensure all settings are properly applied.
              </Text>
            </View>
          )}

          {/* Info about cloud provider selection */}
          {selectedMode === 'cloud' && currentMode === 'local' && (
            <View style={[styles.warningContainer, { backgroundColor: colors.backgroundLight }]}>
              <Cloud size={16} color={colors.accent} />
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                After switching to cloud storage, you'll be able to select your preferred cloud provider (Apple iCloud or Google Drive).
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.closeButton, 
              { backgroundColor: colors.backgroundMedium },
              (isProcessing || loading) && styles.disabledButton
            ]}
            onPress={handleClose}
            disabled={isProcessing || loading}
          >
            {(isProcessing || loading) ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
                {t('common.buttons.close')}
              </Text>
            )}
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
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
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