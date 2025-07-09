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
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { storageManager } from '@/utils/storageManager';
import { logInfo, logError } from '@/utils/debugManager';

WebBrowser.maybeCompleteAuthSession();

interface AuthRequiredModalProps {
  visible: boolean;
  onAuthSuccess: () => void;
}

export default function AuthRequiredModal({
  visible,
  onAuthSuccess,
}: AuthRequiredModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: [
      'https://www.googleapis.com/auth/drive.appdata',
      'https://www.googleapis.com/auth/drive.file'
    ],
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      const refreshToken = response.authentication?.refreshToken;
      const expiresIn = response.authentication?.expiresIn;
      
      if (token) {
        handleTokenReceived(token, refreshToken, expiresIn);
      } else {
        setIsAuthenticating(false);
        if (Platform.OS === 'web') {
          alert('Authentication failed: No access token received');
        } else {
          Alert.alert('Authentication Failed', 'No access token received from Google');
        }
      }
    } else if (response?.type === 'error') {
      setIsAuthenticating(false);
      if (Platform.OS === 'web') {
        alert(`Authentication failed: ${response.error?.message || 'Unknown error'}`);
      } else {
        Alert.alert(
          'Authentication Failed',
          response.error?.message || 'Unknown error occurred'
        );
      }
    } else if (response?.type === 'cancel') {
      setIsAuthenticating(false);
      // Don't show error for cancellation, just allow retry
    }
  }, [response]);

  // Auto-start authentication when modal becomes visible
  useEffect(() => {
    if (visible && request && !isAuthenticating) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        handleGoogleLogin();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [visible, request, isAuthenticating]);

  const handleTokenReceived = async (token: string, refreshToken?: string, expiresIn?: number) => {
    try {
      setIsAuthenticating(true);
      
      // Store the token with enhanced data including refresh token
      await storageManager.setAccessToken(token, refreshToken, expiresIn);
      
      logInfo('Google Drive re-authentication completed successfully', `Refresh token: ${!!refreshToken}, Expires in: ${expiresIn}s`, 'AuthRequiredModal');
      
      // Call success callback
      onAuthSuccess();
      
      if (Platform.OS === 'web') {
        alert('Successfully re-authenticated with Google Drive!');
      } else {
        Alert.alert(
          'Success',
          'Successfully re-authenticated with Google Drive!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logError('Failed to handle re-authentication token', error instanceof Error ? error.message : String(error), 'AuthRequiredModal');
      setIsAuthenticating(false);
      
      if (Platform.OS === 'web') {
        alert('Failed to complete authentication. Please try again.');
      } else {
        Alert.alert(
          'Authentication Failed',
          'Failed to complete authentication. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (!request) {
      logError('Google auth request not ready', 'Auth request is null', 'AuthRequiredModal');
      return;
    }

    try {
      setIsAuthenticating(true);
      logInfo('Starting Google re-authentication', '', 'AuthRequiredModal');
      
      await promptAsync();
    } catch (error) {
      logError('Google auth prompt failed', error instanceof Error ? error.message : String(error), 'AuthRequiredModal');
      setIsAuthenticating(false);
      
      if (Platform.OS === 'web') {
        alert(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        Alert.alert(
          'Authentication Failed',
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }
    }
  };

  const handleRetry = () => {
    if (!isAuthenticating) {
      handleGoogleLogin();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent dismissal
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={48} color={colors.warning} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('storage.auth.required.title')}
          </Text>
          
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {t('storage.auth.required.message')}
          </Text>
          
          <Text style={[styles.submessage, { color: colors.textHint }]}>
            Your Google Drive session has expired and needs to be renewed to continue syncing your cards.
          </Text>

          {isAuthenticating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Authenticating with Google...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.accent }]}
              onPress={handleRetry}
            >
              <RefreshCw size={20} color={colors.textPrimary} />
              <Text style={[styles.authButtonText, { color: colors.textPrimary }]}>
                {t('storage.auth.required.reauth')}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={[styles.note, { color: colors.textHint }]}>
            This dialog cannot be dismissed until authentication is complete.
          </Text>
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
    maxWidth: 400,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  submessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    minWidth: 200,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});