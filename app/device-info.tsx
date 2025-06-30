import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Battery, 
  HardDrive, 
  Cpu, 
  Globe,
  User,
  Key,
  Copy,
  RefreshCw,
  LogOut,
  LogIn,
  CreditCard,
  Languages,
  Palette,
  Settings,
  Cloud,
  Database,
  Clock,
  RotateCcw
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { storageManager } from '@/utils/storageManager';
import { CloudStorageProvider } from 'react-native-cloud-storage';
import Header from '@/components/Header';
import CloudProviderSelector from '@/components/CloudProviderSelector';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { loadSettings } from '@/utils/storage';
import { logInfo, logError } from '@/utils/debugManager';

WebBrowser.maybeCompleteAuthSession();

interface DeviceInfoItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  action?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  loading?: boolean;
}

export default function DeviceInfoScreen() {
  const { t, i18n } = useTranslation();
  const { colors, themeMode } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<DeviceInfoItem[]>([]);
  const [authInfo, setAuthInfo] = useState<DeviceInfoItem[]>([]);
  const [appInfo, setAppInfo] = useState<DeviceInfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [provider, setProvider] = useState<CloudStorageProvider>(CloudStorageProvider.ICloud);

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
        setAuthLoading(false);
        if (Platform.OS === 'web') {
          alert('Authentication failed: No access token received');
        } else {
          Alert.alert('Authentication Failed', 'No access token received from Google');
        }
      }
    } else if (response?.type === 'error') {
      setAuthLoading(false);
      if (Platform.OS === 'web') {
        alert(`Authentication failed: ${response.error?.message || 'Unknown error'}`);
      } else {
        Alert.alert('Authentication Failed', response.error?.message || 'Unknown error occurred');
      }
    } else if (response?.type === 'cancel') {
      setAuthLoading(false);
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
      setAuthLoading(true);
      
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
      
      logInfo('Google Drive authentication completed successfully', `Refresh token: ${!!refreshToken}, Expires in: ${expiresIn}s`, 'DeviceInfoScreen');
    } catch (error) {
      logError('Failed to handle token', error instanceof Error ? error.message : String(error), 'DeviceInfoScreen');
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
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    logInfo('Starting Google authentication', '', 'DeviceInfoScreen');
    
    if (!request) {
      logError('Google auth request not ready', 'Auth request is null', 'DeviceInfoScreen');
      
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
      setAuthLoading(true);
      logInfo('Prompting Google auth', '', 'DeviceInfoScreen');
      
      const result = await promptAsync();
      logInfo('Google auth prompt result', JSON.stringify(result), 'DeviceInfoScreen');
      
      // The useEffect will handle the response
    } catch (error) {
      logError('Google auth prompt failed', error instanceof Error ? error.message : String(error), 'DeviceInfoScreen');
      setAuthLoading(false);
      
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

  const handleGoogleLogout = async () => {
    const confirmLogout = async () => {
      try {
        setAuthLoading(true);
        await storageManager.setAccessToken('');
        
        if (Platform.OS === 'web') {
          alert('Successfully logged out from Google Drive');
        } else {
          Alert.alert('Success', 'Successfully logged out from Google Drive');
        }
        
        await loadDeviceInfo(); // Refresh the info
      } catch (error) {
        console.error('Failed to logout:', error);
        if (Platform.OS === 'web') {
          alert('Failed to logout. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to logout. Please try again.');
        }
      } finally {
        setAuthLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to logout from Google Drive?')) {
        await confirmLogout();
      }
    } else {
      Alert.alert(
        'Logout Confirmation',
        'Are you sure you want to logout from Google Drive?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', onPress: confirmLogout, style: 'destructive' },
        ]
      );
    }
  };

  const handleForceRefreshToken = async () => {
    if (provider !== "googledrive") {
      if (Platform.OS === 'web') {
        alert('Token refresh is only available for Google Drive');
      } else {
        Alert.alert('Not Available', 'Token refresh is only available for Google Drive');
      }
      return;
    }

    const accessToken = await storageManager.getAccessToken();
    if (!accessToken) {
      if (Platform.OS === 'web') {
        alert('No access token found. Please authenticate first.');
      } else {
        Alert.alert('No Token', 'No access token found. Please authenticate first.');
      }
      return;
    }

    const tokenData = storageManager.getTokenData();
    if (!tokenData?.refreshToken) {
      if (Platform.OS === 'web') {
        alert('No refresh token available. Please re-authenticate to get a refresh token.');
      } else {
        Alert.alert('No Refresh Token', 'No refresh token available. Please re-authenticate to get a refresh token.');
      }
      return;
    }

    setRefreshLoading(true);
    logInfo('Force refreshing Google Drive token', '', 'DeviceInfoScreen');

    try {
      // Force refresh by calling the public method
      const success = await storageManager.refreshAccessToken();
      
      if (success) {
        if (Platform.OS === 'web') {
          alert('Token refreshed successfully!');
        } else {
          Alert.alert('Success', 'Token refreshed successfully!');
        }
        logInfo('Force token refresh successful', '', 'DeviceInfoScreen');
        await loadDeviceInfo(); // Refresh the display
      } else {
        if (Platform.OS === 'web') {
          alert('Token refresh failed. Please check the logs for details.');
        } else {
          Alert.alert('Refresh Failed', 'Token refresh failed. Please check the logs for details.');
        }
        logError('Force token refresh failed', 'Refresh returned false', 'DeviceInfoScreen');
      }
    } catch (error) {
      logError('Force token refresh error', error instanceof Error ? error.message : String(error), 'DeviceInfoScreen');
      
      if (Platform.OS === 'web') {
        alert(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        Alert.alert(
          'Refresh Failed',
          `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleProviderSelect = async (prov: CloudStorageProvider) => {
    setProvider(prov);
    await storageManager.setProvider(prov);
    setShowProviderSelector(false);
    await loadDeviceInfo(); // Refresh the info
  };

  const formatTokenExpiry = (tokenData: any) => {
    if (!tokenData?.expiresAt) return 'No expiry info';
    
    const now = Date.now();
    const expiresAt = tokenData.expiresAt;
    
    if (now >= expiresAt) {
      return 'Expired';
    }
    
    const timeLeft = expiresAt - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    } else {
      return `Expires in ${minutes}m`;
    }
  };

  const loadDeviceInfo = async () => {
    setLoading(true);
    
    try {
      const screenData = Dimensions.get('screen');
      const windowData = Dimensions.get('window');
      
      // Device Information
      const deviceData: DeviceInfoItem[] = [
        {
          icon: <Smartphone size={20} color={colors.textSecondary} />,
          label: 'Device Name',
          value: Device.deviceName || 'Unknown',
        },
        {
          icon: <Monitor size={20} color={colors.textSecondary} />,
          label: 'Platform',
          value: `${Platform.OS} ${Platform.Version}`,
        },
        {
          icon: <Cpu size={20} color={colors.textSecondary} />,
          label: 'Device Type',
          value: Device.deviceType ? Device.DeviceType[Device.deviceType] : 'Unknown',
        },
        {
          icon: <Monitor size={20} color={colors.textSecondary} />,
          label: 'Screen Size',
          value: `${screenData.width} × ${screenData.height}`,
        },
        {
          icon: <Monitor size={20} color={colors.textSecondary} />,
          label: 'Window Size',
          value: `${windowData.width} × ${windowData.height}`,
        },
        {
          icon: <Wifi size={20} color={isOnline ? colors.success : colors.error} />,
          label: 'Network Status',
          value: isOnline ? 'Online' : 'Offline',
        },
      ];

      // Add app-specific info
      if (Application.applicationId) {
        deviceData.push({
          icon: <Smartphone size={20} color={colors.textSecondary} />,
          label: 'App ID',
          value: Application.applicationId,
          copyable: true,
        });
      }

      if (Application.nativeApplicationVersion) {
        deviceData.push({
          icon: <Smartphone size={20} color={colors.textSecondary} />,
          label: 'App Version',
          value: Application.nativeApplicationVersion,
        });
      }

      if (Application.nativeBuildVersion) {
        deviceData.push({
          icon: <Smartphone size={20} color={colors.textSecondary} />,
          label: 'Build Version',
          value: Application.nativeBuildVersion,
        });
      }

      // Constants info
      if (Constants.expoVersion) {
        deviceData.push({
          icon: <Cpu size={20} color={colors.textSecondary} />,
          label: 'Expo SDK',
          value: Constants.expoVersion,
        });
      }

      if (Platform.OS === 'web') {
        deviceData.push({
          icon: <Globe size={20} color={colors.textSecondary} />,
          label: 'User Agent',
          value: navigator.userAgent,
          copyable: true,
        });
      }

      setDeviceInfo(deviceData);

      // Storage Information
      await storageManager.initialize();
      const storageMode = storageManager.getStorageMode();
      const currentProvider = storageManager.getProvider();
      setProvider(currentProvider);
      const queuedOpsCount = storageManager.getQueuedOperationsCount();

      // Load cards to get count
      const cards = await storageManager.loadCards();

      const storageData: DeviceInfoItem[] = [
        {
          icon: <HardDrive size={20} color={colors.textSecondary} />,
          label: 'Storage Mode',
          value: storageMode === 'cloud' ? 'Cloud Storage' : 'Local Storage',
        },
        {
          icon: <Database size={20} color={colors.textSecondary} />,
          label: 'Queued Operations',
          value: queuedOpsCount.toString(),
        },
      ];

      if (storageMode === 'cloud') {
        storageData.push({
          icon: <Cloud size={20} color={colors.textSecondary} />,
          label: 'Cloud Provider',
          value: currentProvider === CloudStorageProvider.ICloud ? 'Apple iCloud' : 'Google Drive',
          action: () => setShowProviderSelector(true),
          actionLabel: 'Change',
          actionIcon: <Settings size={16} color={colors.accent} />,
        });
      }

      setStorageInfo(storageData);

      // Authentication Information
      const accessToken = await storageManager.getAccessToken();
      const tokenData = storageManager.getTokenData();
      const authData: DeviceInfoItem[] = [];

      if (currentProvider === CloudStorageProvider.GoogleDrive) {
        authData.push({
          icon: <User size={20} color={colors.textSecondary} />,
          label: 'Google Drive Auth',
          value: accessToken ? 'Authenticated' : 'Not Authenticated',
          action: accessToken ? handleGoogleLogout : handleGoogleLogin,
          actionLabel: accessToken ? 'Logout' : 'Login',
          actionIcon: accessToken ? <LogOut size={16} color={colors.error} /> : <LogIn size={16} color={colors.success} />,
          loading: authLoading,
        });

        if (accessToken) {
          // Mask the token for security
          const maskedToken = accessToken.substring(0, 8) + '*'.repeat(Math.max(0, accessToken.length - 16)) + accessToken.substring(accessToken.length - 8);
          authData.push({
            icon: <Key size={20} color={colors.textSecondary} />,
            label: 'Access Token',
            value: maskedToken,
            copyable: true,
          });

          // Add token expiry information
          authData.push({
            icon: <Clock size={20} color={colors.textSecondary} />,
            label: 'Token Status',
            value: formatTokenExpiry(tokenData),
          });

          // Add refresh token status
          authData.push({
            icon: <RefreshCw size={20} color={colors.textSecondary} />,
            label: 'Refresh Token',
            value: tokenData?.refreshToken ? 'Available' : 'Not Available',
          });

          // Add force refresh button if refresh token is available
          if (tokenData?.refreshToken) {
            authData.push({
              icon: <RotateCcw size={20} color={colors.accent} />,
              label: 'Force Refresh Token',
              value: 'Manually refresh access token',
              action: handleForceRefreshToken,
              actionLabel: 'Refresh Now',
              actionIcon: <RotateCcw size={16} color={colors.accent} />,
              loading: refreshLoading,
            });
          }
        }
      } else if (currentProvider === CloudStorageProvider.ICloud) {
        authData.push({
          icon: <User size={20} color={colors.textSecondary} />,
          label: 'iCloud Status',
          value: 'System Managed',
        });
      }

      setAuthInfo(authData);

      // App Information
      const settings = await loadSettings();
      const favoriteCards = cards.filter(card => card.isFavorite);
      
      const appData: DeviceInfoItem[] = [
        {
          icon: <CreditCard size={20} color={colors.textSecondary} />,
          label: 'Total Cards',
          value: cards.length.toString(),
        },
        {
          icon: <CreditCard size={20} color={colors.warning} />,
          label: 'Favorite Cards',
          value: favoriteCards.length.toString(),
        },
        {
          icon: <Languages size={20} color={colors.textSecondary} />,
          label: 'Current Language',
          value: i18n.language === 'en' ? 'English' : i18n.language === 'sk' ? 'Slovenčina' : i18n.language,
        },
        {
          icon: <Palette size={20} color={colors.textSecondary} />,
          label: 'Theme Mode',
          value: themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light',
        },
        {
          icon: <Settings size={20} color={colors.textSecondary} />,
          label: 'Haptic Feedback',
          value: settings.hapticFeedback ? 'Enabled' : 'Disabled',
        },
        {
          icon: <Settings size={20} color={colors.textSecondary} />,
          label: 'Sort Option',
          value: settings.sortOption === 'alphabetical' ? 'Alphabetical' : 
                 settings.sortOption === 'recent' ? 'Recent' : 
                 settings.sortOption === 'lastUsed' ? 'Last Used' : 'Custom',
        },
      ];

      // Add card type breakdown
      const barcodeCards = cards.filter(card => card.codeType === 'barcode');
      const qrCards = cards.filter(card => card.codeType === 'qrcode');
      
      if (cards.length > 0) {
        appData.push(
          {
            icon: <CreditCard size={20} color={colors.textSecondary} />,
            label: 'Barcode Cards',
            value: barcodeCards.length.toString(),
          },
          {
            icon: <CreditCard size={20} color={colors.textSecondary} />,
            label: 'QR Code Cards',
            value: qrCards.length.toString(),
          }
        );
      }

      setAppInfo(appData);
    } catch (error) {
      console.error('Failed to load device info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const handleCopyValue = (value: string, label: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(value);
      alert(`${label} copied to clipboard`);
    } else {
      // On mobile, we could use expo-clipboard if needed
      console.log(`Copy ${label}:`, value);
    }
  };

  const renderSection = (title: string, data: DeviceInfoItem[], icon: React.ReactNode) => {
    if (data.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
        <View style={styles.sectionHeader}>
          {icon}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
        </View>
        {data.map((item, index) => (
          <View key={index} style={styles.infoRow}>
            <View style={styles.infoLeft}>
              {item.icon}
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            </View>
            <View style={styles.infoRight}>
              <Text 
                style={[styles.infoValue, { color: colors.textPrimary }]}
                numberOfLines={2}
                ellipsizeMode="middle"
              >
                {item.value}
              </Text>
              <View style={styles.actionContainer}>
                {item.copyable && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCopyValue(item.value, item.label)}
                  >
                    <Copy size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                {item.action && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryAction]}
                    onPress={item.action}
                    disabled={item.loading}
                  >
                    {item.loading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <>
                        {item.actionIcon}
                        <Text style={[styles.actionText, { color: colors.accent }]}>
                          {item.actionLabel}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title="Device Information"
        showBack={true}
        rightElement={
          <TouchableOpacity onPress={loadDeviceInfo} style={styles.refreshButton}>
            <RefreshCw size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading device information...
            </Text>
          </View>
        ) : (
          <>
            {renderSection(
              'App Information',
              appInfo,
              <CreditCard size={24} color={colors.textPrimary} />
            )}

            {renderSection(
              'Device & System',
              deviceInfo,
              <Smartphone size={24} color={colors.textPrimary} />
            )}

            {renderSection(
              'Storage & Sync',
              storageInfo,
              <HardDrive size={24} color={colors.textPrimary} />
            )}

            {renderSection(
              'Authentication',
              authInfo,
              <User size={24} color={colors.textPrimary} />
            )}

            <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
              <View style={styles.sectionHeader}>
                <Globe size={24} color={colors.textPrimary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Environment
                </Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Globe size={20} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Environment
                  </Text>
                </View>
                <View style={styles.infoRight}>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {__DEV__ ? 'Development' : 'Production'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Monitor size={20} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Platform Target
                  </Text>
                </View>
                <View style={styles.infoRight}>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {Platform.OS === 'web' ? 'Web Browser' : 'Native Mobile'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.disclaimer, { color: colors.textHint }]}>
              This information is collected locally and is not transmitted anywhere. 
              Sensitive data like access tokens are masked for security.
            </Text>
          </>
        )}
      </ScrollView>

      <CloudProviderSelector
        visible={showProviderSelector}
        currentProvider={provider}
        onSelect={handleProviderSelect}
        onClose={() => setShowProviderSelector(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  refreshButton: {
    padding: 8,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 40,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 32,
  },
});