import React, { useState, useEffect } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import { Check, Cloud, TriangleAlert as AlertTriangle, Copy } from 'lucide-react-native';
import { CloudStorageProvider, CloudStorage } from 'react-native-cloud-storage';
import { useTheme } from '@/hooks/useTheme';
import { logError, logInfo, logWarning } from '@/utils/debugManager';
import { storageManager } from '@/utils/storageManager';
import * as Updates from 'expo-updates';

WebBrowser.maybeCompleteAuthSession();

interface CloudProviderSelectorProps {
  visible: boolean;
  currentProvider: CloudStorageProvider;
  onSelect: (provider: CloudStorageProvider, shouldMigrateData?: boolean) => Promise<void>;
  onClose: () => void;
  shouldReloadAfterSelection?: boolean; // New prop to control reload behavior
}

export default function CloudProviderSelector({
  visible,
  currentProvider,
  onSelect,
  onClose,
  shouldReloadAfterSelection = false, // Default to false for backward compatibility
}: CloudProviderSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<CloudStorageProvider>(currentProvider);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [iCloudAvailable, setICloudAvailable] = useState<boolean | null>(null);
  const [iCloudError, setICloudError] = useState<string | null>(null);
  const [shouldMigrateData, setShouldMigrateData] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: [
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/drive.file'
    ],
    // Request offline access to get refresh token
    extraParams: {
      access_type: 'offline',
      prompt: 'consent', // Force consent to ensure refresh token
    },
  });

  // Check for existing token on mount
  useEffect(() => {
    const checkExistingToken = async () => {
      try {
        const existingToken = await storageManager.getAccessToken();
        if (existingToken) {
          setAccessToken(existingToken);
          logInfo('Existing Google Drive token found', 'Token loaded from storage', 'CloudProviderSelector');
        }
      } catch (error) {
        logError('Failed to load existing token', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      }
    };

    if (visible) {
      checkExistingToken();
      checkICloudAvailability();
      setSelected(currentProvider);
      setShouldMigrateData(true); // Default to true
    }
  }, [visible, currentProvider]);

  // Check iCloud availability
  const checkICloudAvailability = async () => {
    if (Platform.OS !== 'ios') {
      setICloudAvailable(false);
      setICloudError('iCloud is only available on iOS devices');
      return;
    }

    try {
      logInfo('Checking iCloud availability', '', 'CloudProviderSelector');
      
      // Create a temporary CloudStorage instance to test iCloud
      const testCloudStorage = new CloudStorage(CloudStorageProvider.ICloud);
      
      // Try to check if iCloud is available by testing a simple operation
      try {
        await testCloudStorage.exists('test-availability-check.txt');
        setICloudAvailable(true);
        setICloudError(null);
        logInfo('iCloud is available', '', 'CloudProviderSelector');
      } catch (error: any) {
        logWarning('iCloud availability check failed', error.message, 'CloudProviderSelector');
        
        // Parse the error to provide a user-friendly message
        if (error.message?.includes('not signed in') || error.message?.includes('account')) {
          setICloudError('Please sign in to iCloud in your device settings');
        } else if (error.message?.includes('disabled') || error.message?.includes('restricted')) {
          setICloudError('iCloud Drive is disabled. Please enable it in Settings');
        } else if (error.message?.includes('network') || error.message?.includes('connection')) {
          setICloudError('No internet connection. Please check your network');
        } else {
          setICloudError('iCloud is not available on this device');
        }
        
        setICloudAvailable(false);
      }
    } catch (error) {
      logError('Failed to check iCloud availability', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      setICloudAvailable(false);
      setICloudError('Unable to check iCloud availability');
    }
  };

  useEffect(() => {
    logInfo('Google auth response received', JSON.stringify(response), 'CloudProviderSelector');
    
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      const refreshToken = response.authentication?.refreshToken;
      const expiresIn = response.authentication?.expiresIn;
      
      logInfo('Google auth successful', `Token: ${!!token}, Refresh: ${!!refreshToken}, Expires: ${expiresIn}`, 'CloudProviderSelector');
      
      if (token) {
        handleTokenReceived(token, refreshToken, expiresIn);
      } else {
        logError('Google auth success but no access token', 'Authentication succeeded but no access token was provided', 'CloudProviderSelector');
        setIsAuthenticating(false);
        
        if (Platform.OS === 'web') {
          alert('Authentication failed: No access token received');
        } else {
          Alert.alert(
            'Authentication Failed',
            'No access token received from Google',
            [{ text: 'OK' }]
          );
        }
      }
    } else if (response?.type === 'error') {
      logError('Google auth error', response.error?.message || 'Unknown error', 'CloudProviderSelector', response);
      setIsAuthenticating(false);
      
      if (Platform.OS === 'web') {
        alert(`Authentication failed: ${response.error?.message || 'Unknown error'}`);
      } else {
        Alert.alert(
          'Authentication Failed',
          response.error?.message || 'Unknown error occurred',
          [{ text: 'OK' }]
        );
      }
    } else if (response?.type === 'cancel') {
      logInfo('Google auth cancelled by user', '', 'CloudProviderSelector');
      setIsAuthenticating(false);
    }
  }, [response]);

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
            'Please close and reopen the app to complete the setup.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Failed to reload app:', error);
      // Fallback: show manual restart message
      Alert.alert(
        'Restart Required',
        'Please close and reopen the app to complete the setup.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTokenReceived = async (token: string, refreshToken?: string, expiresIn?: number) => {
    try {
      setIsAuthenticating(true);
      
      setAccessToken(token);
      
      // Store the token with enhanced data including refresh token
      await storageManager.setAccessToken(token, refreshToken, expiresIn);
      
      // Show success message
      if (Platform.OS === 'web') {
        alert('Successfully authenticated with Google Drive!');
      } else {
        Alert.alert(
          'Success',
          'Successfully authenticated with Google Drive!',
          [{ text: 'OK' }]
        );
      }
      
      logInfo('Google Drive authentication completed successfully', `Refresh token: ${!!refreshToken}, Expires in: ${expiresIn}s`, 'CloudProviderSelector');
    } catch (error) {
      logError('Failed to handle token', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      setAccessToken(null);
      
      if (Platform.OS === 'web') {
        alert('Failed to set up Google Drive access. Please try again.');
      } else {
        Alert.alert(
          'Setup Failed',
          'Failed to set up Google Drive access. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    logInfo('Starting Google authentication', '', 'CloudProviderSelector');
    
    if (!request) {
      logError('Google auth request not ready', 'Auth request is null', 'CloudProviderSelector');
      
      if (Platform.OS === 'web') {
        alert('Authentication not ready. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'Authentication not ready. Please try again.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    try {
      setIsAuthenticating(true);
      logInfo('Prompting Google auth', '', 'CloudProviderSelector');
      
      const result = await promptAsync();
      logInfo('Google auth prompt result', JSON.stringify(result), 'CloudProviderSelector');
      
      // The useEffect will handle the response
    } catch (error) {
      logError('Google auth prompt failed', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      setIsAuthenticating(false);
      
      if (Platform.OS === 'web') {
        alert(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        Alert.alert(
          'Authentication Failed',
          error instanceof Error ? error.message : 'Unknown error occurred',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleICloudSelect = () => {
    if (!iCloudAvailable) {
      // Show error message when trying to select unavailable iCloud
      if (Platform.OS === 'web') {
        alert(`iCloud Unavailable: ${iCloudError}`);
      } else {
        Alert.alert(
          'iCloud Unavailable',
          iCloudError || 'iCloud is not available on this device',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                // On iOS, we could potentially open Settings app
                if (Platform.OS === 'ios') {
                  // This would require additional setup to open Settings
                  Alert.alert(
                    'Open Settings',
                    'Please go to Settings > [Your Name] > iCloud > iCloud Drive and make sure it\'s enabled.',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          ]
        );
      }
      return;
    }
    
    setSelected(CloudStorageProvider.ICloud);
  };

  const handleConfirm = async () => {
    logInfo('Confirming provider selection', `Provider: ${selected}, Has token: ${!!accessToken}, Should reload: ${shouldReloadAfterSelection}, Should migrate: ${shouldMigrateData}`, 'CloudProviderSelector');
    
    // Check if Google Drive is selected but not authenticated
    if (selected === CloudStorageProvider.GoogleDrive && !accessToken) {
      if (Platform.OS === 'web') {
        alert('Please authenticate with Google Drive first.');
      } else {
        Alert.alert(
          'Authentication Required',
          'Please authenticate with Google Drive first.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Check if iCloud is selected but not available
    if (selected === CloudStorageProvider.ICloud && !iCloudAvailable) {
      if (Platform.OS === 'web') {
        alert(`iCloud Unavailable: ${iCloudError}`);
      } else {
        Alert.alert(
          'iCloud Unavailable',
          iCloudError || 'iCloud is not available on this device',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    setIsProcessing(true);

    try {
      await onSelect(selected, shouldMigrateData);
      logInfo('Provider selection confirmed successfully', `Provider: ${selected}, Migration: ${shouldMigrateData}`, 'CloudProviderSelector');
      
      // If we should reload after selection (e.g., when switching from local to cloud)
      if (shouldReloadAfterSelection) {
        const migrationText = shouldMigrateData ? ' and migrated your data' : '';
        const successMessage = `Successfully set up ${selected === CloudStorageProvider.ICloud ? 'iCloud' : 'Google Drive'} storage${migrationText}. The app will now reload.`;
        
        if (Platform.OS === 'web') {
          alert(successMessage);
          await reloadApp();
        } else {
          Alert.alert(
            'Setup Complete',
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
        // Just close the modal without reloading
        onClose();
      }
    } catch (error) {
      logError('Failed to confirm provider selection', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      
      if (Platform.OS === 'web') {
        alert('Failed to set provider. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to set provider. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Debug: Log environment variables (without exposing sensitive data)
  useEffect(() => {
    logInfo('Google Client IDs configured', 
      `Android: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID}, iOS: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS}, Web: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB}`, 
      'CloudProviderSelector'
    );
  }, []);

  const showMigrationOption = selected !== currentProvider;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('storage.provider.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('storage.provider.subtitle')}
          </Text>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selected === CloudStorageProvider.ICloud && {
                  borderColor: colors.accent,
                  borderWidth: 2,
                },
                !iCloudAvailable && styles.disabledOption,
              ]}
              onPress={handleICloudSelect}
              disabled={isAuthenticating || isProcessing}
            >
              <View style={styles.optionHeader}>
                <Cloud size={24} color={!iCloudAvailable ? colors.textHint : colors.textPrimary} />
                <Text style={[
                  styles.optionTitle, 
                  { color: !iCloudAvailable ? colors.textHint : colors.textPrimary }
                ]}>
                  {t('storage.provider.icloud.title')}
                </Text>
                <View style={styles.badges}>
                  {iCloudAvailable === null && (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                  {iCloudAvailable === false && (
                    <View style={[styles.errorBadge, { backgroundColor: colors.error }]}>
                      <AlertTriangle size={12} color={colors.textPrimary} />
                      <Text style={[styles.errorText, { color: colors.textPrimary }]}>
                        Unavailable
                      </Text>
                    </View>
                  )}
                  {iCloudAvailable === true && (
                    <View style={[styles.recommendedBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.recommendedText, { color: colors.textPrimary }]}>
                        {t('storage.mode.recommended')}
                      </Text>
                    </View>
                  )}
                  {selected === CloudStorageProvider.ICloud && iCloudAvailable && (
                    <Check size={20} color={colors.accent} />
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.optionDescription, 
                  { color: !iCloudAvailable ? colors.textHint : colors.textSecondary }
                ]}
              >
                {iCloudAvailable === false && iCloudError 
                  ? iCloudError 
                  : t('storage.provider.icloud.description')
                }
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: colors.backgroundMedium },
              selected === CloudStorageProvider.GoogleDrive && {
                borderColor: colors.accent,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelected(CloudStorageProvider.GoogleDrive)}
            disabled={isAuthenticating || isProcessing}
          >
            <View style={styles.optionHeader}>
              <Cloud size={24} color={colors.textPrimary} />
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                {t('storage.provider.googledrive.title')}
              </Text>
              <View style={styles.badges}>
                {accessToken && (
                  <View
                    style={[
                      styles.authenticatedBadge,
                      { backgroundColor: colors.success },
                    ]}
                  >
                    <Text
                      style={[styles.authenticatedText, { color: colors.textPrimary }]}
                    >
                      Authenticated
                    </Text>
                  </View>
                )}
                {selected === CloudStorageProvider.GoogleDrive && (
                  <Check size={20} color={colors.accent} />
                )}
              </View>
            </View>
            <Text
              style={[styles.optionDescription, { color: colors.textSecondary }]}
            >
              {t('storage.provider.googledrive.description')} {t('storage.provider.googledrive.slow_warning')}
            </Text>
            {selected === CloudStorageProvider.GoogleDrive && !accessToken && (
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: colors.accent },
                  isAuthenticating && styles.loginButtonDisabled
                ]}
                onPress={handleGoogleLogin}
                disabled={!request || isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={[styles.loginButtonText, { color: colors.textPrimary }]}>
                    {t('storage.provider.googledrive.login')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>

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
                    {`Copy data from ${currentProvider === CloudStorageProvider.ICloud ? 'iCloud' : 'Google Drive'} to ${selected === CloudStorageProvider.ICloud ? 'iCloud' : 'Google Drive'}`}
                  </Text>
                  <Text style={[styles.migrationDescription, { color: colors.textSecondary }]}>
                    Your existing cards will be transferred to the new cloud provider
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
                    You will start with empty storage on the new provider. Your existing cards will remain on the current provider only.
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.closeButton, 
              { backgroundColor: colors.accent },
              (
                (selected === CloudStorageProvider.GoogleDrive && !accessToken) ||
                (selected === CloudStorageProvider.ICloud && !iCloudAvailable)
              ) && styles.closeButtonDisabled,
              (isAuthenticating || isProcessing) && styles.closeButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={
              (selected === CloudStorageProvider.GoogleDrive && !accessToken) || 
              (selected === CloudStorageProvider.ICloud && !iCloudAvailable) ||
              isAuthenticating || 
              isProcessing
            }
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={[
                styles.closeButtonText, 
                { color: colors.textPrimary },
                (
                  (selected === CloudStorageProvider.GoogleDrive && !accessToken) ||
                  (selected === CloudStorageProvider.ICloud && !iCloudAvailable)
                ) && { opacity: 0.5 }
              ]}>
                {shouldReloadAfterSelection ? 'Complete Setup' : t('common.buttons.confirm')}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.backgroundMedium }]}
            onPress={onClose}
            disabled={isAuthenticating || isProcessing}
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
  option: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 16,
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
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  authenticatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  authenticatedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  errorText: {
    fontSize: 10,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonDisabled: {
    opacity: 0.6,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});