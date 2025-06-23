import React, { useState, useEffect } from 'react';
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
import { Save, Camera, Palette } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCard } from '@/utils/types';
import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { lightHaptic } from '@/utils/feedback';
import { storageManager } from '@/utils/storageManager';
import ColorPicker from '@/components/ColorPicker';
import CodeTypeSelector from '@/components/CodeTypeSelector';

const PRESET_COLORS = [
  '#4F6BFF', // Default blue
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Light blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light yellow
  '#BB8FCE', // Light purple
  '#85C1E9', // Sky blue
  '#F8C471', // Orange
];

export default function CustomCardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { scannedCode, scannedType } = useLocalSearchParams<{ 
    scannedCode?: string; 
    scannedType?: string; 
  }>();
  
  const [cardName, setCardName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [code, setCode] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle scanned code from scan screen
  useEffect(() => {
    if (scannedCode) {
      setCode(scannedCode);
      if (scannedType) {
        setCodeType(scannedType as 'barcode' | 'qrcode');
      }
    }
  }, [scannedCode, scannedType]);

  const handleScanCode = () => {
    router.push({
      pathname: '/add/scan',
      params: { 
        store: 'custom',
        cardName,
        cardColor: selectedColor,
        codeType,
        returnTo: '/add/custom'
      }
    });
  };

  const handleSave = async () => {
    if (!cardName.trim()) {
      setError(t('common.validation.required'));
      return;
    }

    if (!code.trim()) {
      setError(t('addCard.custom.codeRequired'));
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
        name: cardName.trim(),
        brand: 'custom',
        code: code.trim(),
        codeType,
        color: selectedColor,
        dateAdded: Date.now(),
      };
      
      await storageManager.saveCard(newCard, isOnline);
      router.replace(`/card/${newCard.id}`);
    } catch (err) {
      setError(t('common.validation.invalid'));
      setLoading(false);
    }
  };

  const getFirstLetter = () => {
    return cardName.trim().charAt(0).toUpperCase() || '?';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title={t('addCard.custom.title')}
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
            {/* Card Preview */}
            <View style={[styles.cardPreview, { backgroundColor: colors.backgroundMedium }]}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                {t('addCard.custom.preview')}
              </Text>
              <View style={[styles.cardDisplay, { backgroundColor: selectedColor }]}>
                <Text style={[styles.cardLetter, { color: colors.textPrimary }]}>
                  {getFirstLetter()}
                </Text>
              </View>
              <Text style={[styles.cardNamePreview, { color: colors.textPrimary }]}>
                {cardName.trim() || t('addCard.custom.cardNamePlaceholder')}
              </Text>
            </View>

            {/* Card Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('addCard.custom.cardName')} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.backgroundLight,
                    color: colors.textPrimary,
                    borderColor: error && !cardName.trim() ? colors.error : colors.backgroundLight 
                  }
                ]}
                value={cardName}
                onChangeText={(text) => {
                  setCardName(text);
                  setError('');
                }}
                placeholder={t('addCard.custom.cardNamePlaceholder')}
                placeholderTextColor={colors.textHint}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
            </View>

            {/* Color Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('addCard.custom.cardColor')}
              </Text>
              <View style={styles.colorSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                  {PRESET_COLORS.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColor
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                  <TouchableOpacity
                    style={[styles.customColorButton, { backgroundColor: colors.backgroundLight }]}
                    onPress={() => setShowColorPicker(true)}
                  >
                    <Palette size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>

            {/* Code Type Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('addCard.custom.codeType')}
              </Text>
              <CodeTypeSelector
                selectedType={codeType}
                onSelect={setCodeType}
              />
            </View>

            {/* Code Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('addCard.custom.cardCode')} *
              </Text>
              <View style={styles.codeInputSection}>
                <TextInput
                  style={[
                    styles.codeInput,
                    { 
                      backgroundColor: colors.backgroundLight,
                      color: colors.textPrimary,
                      borderColor: error && !code.trim() ? colors.error : colors.backgroundLight 
                    }
                  ]}
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    setError('');
                  }}
                  placeholder={t('addCard.custom.cardCodePlaceholder')}
                  placeholderTextColor={colors.textHint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: colors.accent }]}
                  onPress={handleScanCode}
                >
                  <Camera size={20} color={colors.textPrimary} />
                  <Text style={[styles.scanButtonText, { color: colors.textPrimary }]}>
                    {t('addCard.custom.scan')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            ) : null}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.accent },
                (!cardName.trim() || !code.trim() || loading) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!cardName.trim() || !code.trim() || loading}
            >
              <Save size={20} color={colors.textPrimary} />
              <Text style={[styles.saveButtonText, { color: colors.textPrimary }]}>
                {loading ? t('common.labels.loading') : t('common.buttons.save')}
              </Text>
            </TouchableOpacity>

            {/* Info Note */}
            <Text style={[styles.infoNote, { color: colors.textHint }]}>
              {t('addCard.custom.note')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ColorPicker
        visible={showColorPicker}
        currentColor={selectedColor}
        onColorSelect={setSelectedColor}
        onClose={() => setShowColorPicker(false)}
      />
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
  cardPreview: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  cardDisplay: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLetter: {
    fontSize: 32,
    fontWeight: '700',
  },
  cardNamePreview: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  colorSection: {
    marginTop: 8,
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customColorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  codeInputSection: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});