import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Button,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';
import { Check, Cloud } from 'lucide-react-native';
import { CloudStorage, CloudStorageProvider } from 'react-native-cloud-storage';
import { useTheme } from '@/hooks/useTheme';

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

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setAccessToken(response.authentication?.accessToken ?? null);
    }
  }, [response]);

  useEffect(() => {
    if (selected === CloudStorageProvider.GoogleDrive && accessToken) {
      CloudStorage.setProviderOptions({ accessToken });
    }
  }, [accessToken, selected]);

  const handleConfirm = async () => {
    await onSelect(selected);
  };

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
              {selected === CloudStorageProvider.GoogleDrive && (
                <Check size={20} color={colors.accent} />
              )}
            </View>
            <Text
              style={[styles.optionDescription, { color: colors.textSecondary }]}
            >
              {t('storage.provider.googledrive.description')}
            </Text>
            {selected === CloudStorageProvider.GoogleDrive && !accessToken && (
              <Button
                title={t('storage.provider.googledrive.login')}
                onPress={() => promptAsync()}
                disabled={!request}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.backgroundMedium }]}
            onPress={handleConfirm}
            disabled={selected === CloudStorageProvider.GoogleDrive && !accessToken}
          >
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
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
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});