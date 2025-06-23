import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Button,
  Platform,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import { Check, Cloud } from 'lucide-react-native';
import { CloudStorage, CloudStorageProvider } from 'react-native-cloud-storage';
import { useTheme } from '@/hooks/useTheme';
import { logError, logInfo, logWarning } from '@/utils/debugManager';

WebBrowser.maybeCompleteAuthSession();

interface CloudProviderSelectorProps {
  visible: boolean;
  currentProvider: CloudStorageProvider;
  onSelect: (provider: CloudStorageProvider) => Promise<void>;
  onClose: () => void;
}

export default function CloudProviderSelector({
  visible,
  currentProvider,
  onSelect,
  onClose,
}: CloudProviderSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<CloudStorageProvider>(currentProvider);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });

  useEffect(() => {
    logInfo('Google auth response received', JSON.stringify(response), 'CloudProviderSelector');
    
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      logInfo('Google auth successful, token received', token ? 'Token present' : 'No token', 'CloudProviderSelector');
      
      if (token) {
        setAccessToken(token);
        setIsAuthenticating(false);
        
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

  useEffect(() => {
    if (selected === CloudStorageProvider.GoogleDrive && accessToken) {
      logInfo('Setting Google Drive provider options with token', '', 'CloudProviderSelector');
      try {
        CloudStorage.setProviderOptions({ accessToken });
      } catch (error) {
        logError('Failed to set Google Drive provider options', error instanceof Error ? error.message : String(error), 'CloudProviderSelector');
      }
    }
  }, [accessToken, selected]);

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

  const handleConfirm = async () => {
    logInfo('Confirming provider selection', `Provider: ${selected}, Has token: ${!!accessToken}`, 'CloudProviderSelector');
    
    // Check if Google Drive is selected but not authenticated
    if (selected === CloudStorageProvider.GoogleDrive && !accessToken) {
      logWarning('Google Drive selected but not authenticated', '', 'CloudProviderSelector');
      
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

    try {
      await onSelect(selected);
      logInfo('Provider selection confirmed successfully', `Provider: ${selected}`, 'CloudProviderSelector');
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
    }
  };

  // Debug: Log environment variables (without exposing sensitive data)
  useEffect(() => {
    logInfo('Google Client IDs configured', 
      `Android: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID}, iOS: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS}, Web: ${!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB}`, 
      'CloudProviderSelector'
    );
  }, []);

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
              ]}
              onPress={() => setSelected(CloudStorageProvider.ICloud)}
            >
              <View style={styles.optionHeader}>
                <Cloud size={24} color={colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('storage.provider.icloud.title')}
                </Text>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.recommendedBadge,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[styles.recommendedText, { color: colors.textPrimary }]}
                    >
                      {t('storage.mode.recommended')}
                    </Text>
                  </View>
                  {selected === CloudStorageProvider.ICloud && (
                    <Check size={20} color={colors.accent} />
                  )}
                </View>
              </View>
              <Text
                style={[styles.optionDescription, { color: colors.textSecondary }]}
              >
                {t('storage.provider.icloud.description')}
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
              {t('storage.provider.googledrive.description')}
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
                <Text style={[styles.loginButtonText, { color: colors.textPrimary }]}>
                  {isAuthenticating 
                    ? 'Authenticating...' 
                    : t('storage.provider.googledrive.login')
                  }
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.closeButton, 
              { backgroundColor: colors.backgroundMedium },
              (selected === CloudStorageProvider.GoogleDrive && !accessToken) && styles.closeButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={selected === CloudStorageProvider.GoogleDrive && !accessToken}
          >
            <Text style={[
              styles.closeButtonText, 
              { color: colors.textPrimary },
              (selected === CloudStorageProvider.GoogleDrive && !accessToken) && { opacity: 0.5 }
            ]}>
              {t('common.buttons.confirm')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.backgroundMedium }]}
            onPress={onClose}
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