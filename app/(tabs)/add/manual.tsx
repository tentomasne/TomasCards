import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCard } from '@/utils/types';
import { POPULAR_CARDS } from '@/assets/cards';
import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { lightHaptic } from '@/utils/feedback';
import { storageManager } from '@/utils/storageManager';

export default function ManualEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { store } = useLocalSearchParams<{ store?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const meta = POPULAR_CARDS.find((c) => c.id === store);
  const name = meta?.name ?? '';
  const color = meta?.color ?? colors.accent;

  const handleSave = async () => {
    if (!code.trim()) {
      setError(t('common.validation.required'));
      return;
    }

    // Check if cloud storage is selected but offline
    const storageMode = storageManager.getStorageMode();
    if (storageMode === 'cloud' && !isOnline) {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.message'),
        [{ text: t('common.buttons.ok') }]
      );
      return;
    }

    setLoading(true);
    await lightHaptic();

    try {
      const newCard: LoyaltyCard = {
        id: Date.now().toString(),
        name,
        brand: store,
        code,
        codeType: (meta?.type as 'barcode' | 'qrcode') ?? 'barcode',
        color,
        dateAdded: Date.now(),
      };
      
      await storageManager.saveCard(newCard, isOnline);
      router.push("/")
    } catch (err) {
      setError(t('common.validation.invalid'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title={store ? t('addCard.manual.title', { store: name }) : t('addCard.manual.title')}
        showBack={true}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={[styles.card, { backgroundColor: colors.backgroundMedium }]}>
              <View style={styles.logoContainer}>
                <View style={[styles.logoPlaceholder, { backgroundColor: color }]}>
                  <Text style={[styles.logoText, { color: colors.textPrimary }]}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.storeName, { color: colors.textPrimary }]}>
                  {name}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('addCard.manual.cardNumber')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: colors.backgroundLight,
                      color: colors.textPrimary,
                      borderColor: error ? colors.error : colors.backgroundLight 
                    }
                  ]}
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    setError('');
                  }}
                  placeholder={t('addCard.manual.cardNumberPlaceholder')}
                  placeholderTextColor={colors.textHint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />
                {error ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.accent },
                (!code.trim() || loading) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!code.trim() || loading}
            >
              <Save size={20} color={colors.textPrimary} />
              <Text style={[styles.saveButtonText, { color: colors.textPrimary }]}>
                {loading ? t('common.labels.loading') : t('common.buttons.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});