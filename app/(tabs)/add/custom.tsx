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
import { Save, Camera, Palette, ChartBar as BarChart3, QrCode, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCard } from '@/utils/types';
import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { lightHaptic } from '@/utils/feedback';
import { storageManager } from '@/utils/storageManager';
import { logError } from '@/utils/debugManager';

const PRESET_COLORS = [
  { color: '#FF6B6B', name: 'Coral' },
  { color: '#4ECDC4', name: 'Teal' },
  { color: '#45B7D1', name: 'Blue' },
  { color: '#96CEB4', name: 'Mint' },
  { color: '#FFEAA7', name: 'Yellow' },
  { color: '#DDA0DD', name: 'Plum' },
  { color: '#FF7A00', name: 'Orange' },
  { color: '#9B59B6', name: 'Purple' },
  { color: '#E74C3C', name: 'Red' },
  { color: '#2ECC71', name: 'Green' },
  { color: '#3498DB', name: 'Sky' },
  { color: '#F39C12', name: 'Amber' },
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
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].color);
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showColorInfo, setShowColorInfo] = useState(false);

  // Handle scanned code from scan screen
  useEffect(() => {
    if (scannedCode) {
      setCode(scannedCode);
      if (scannedType) {
        setCodeType(scannedType as 'barcode' | 'qrcode');
      }
    }
  }, [scannedCode, scannedType]);

  // Auto-detect code type based on content
  useEffect(() => {
    if (code.trim()) {
      // Simple heuristics for code type detection
      const isNumeric = /^\d+$/.test(code.trim());
      const isShort = code.trim().length <= 20;
      
      if (isNumeric && isShort) {
        setCodeType('barcode');
      } else if (code.includes('http') || code.includes('://') || code.length > 20) {
        setCodeType('qrcode');
      }
    }
  }, [code]);

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
      logError(
        'Error saving custom card',
        err instanceof Error ? err.message : String(err),
        'CustomCardScreen'
      );
      setLoading(false);
    }
  };

  const getFirstLetter = () => {
    return cardName.trim().charAt(0).toUpperCase() || '?';
  };

  const selectedColorName = PRESET_COLORS.find(c => c.color === selectedColor)?.name || 'Custom';

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
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={[styles.previewSection, { backgroundColor: colors.backgroundMedium }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Preview
            </Text>
            <View style={styles.cardPreviewContainer}>
              <View style={[styles.cardPreview, { backgroundColor: selectedColor }]}>
                <Text style={[styles.cardLetter, { color: colors.textPrimary }]}>
                  {getFirstLetter()}
                </Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                  {cardName.trim() || 'Card Name'}
                </Text>
                <Text style={[styles.previewColor, { color: colors.textSecondary }]}>
                  {selectedColorName}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Card Details
            </Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Card Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.backgroundLight,
                    color: colors.textPrimary,
                    borderColor: error && !cardName.trim() ? colors.error : 'transparent'
                  }
                ]}
                value={cardName}
                onChangeText={(text) => {
                  setCardName(text);
                  setError('');
                }}
                placeholder="Enter your card name"
                placeholderTextColor={colors.textHint}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
              />
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Card Color
              </Text>
              <TouchableOpacity
                onPress={() => setShowColorInfo(!showColorInfo)}
                style={styles.infoButton}
              >
                <Info size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {showColorInfo && (
              <Text style={[styles.infoText, { color: colors.textHint }]}>
                Choose a color that represents your brand or makes your card easy to identify.
              </Text>
            )}
            
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((colorItem, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorItem.color },
                    selectedColor === colorItem.color && [
                      styles.selectedColor,
                      { borderColor: colors.textPrimary }
                    ]
                  ]}
                  onPress={() => setSelectedColor(colorItem.color)}
                  activeOpacity={0.8}
                >
                  {selectedColor === colorItem.color && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Code Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Code Type
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              We'll auto-detect the type, but you can change it if needed
            </Text>
            
            <View style={styles.codeTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.codeTypeOption,
                  { backgroundColor: colors.backgroundLight },
                  codeType === 'barcode' && { 
                    backgroundColor: colors.accent,
                    borderColor: colors.accent 
                  }
                ]}
                onPress={() => setCodeType('barcode')}
              >
                <BarChart3 
                  size={24} 
                  color={codeType === 'barcode' ? colors.textPrimary : colors.textSecondary} 
                />
                <View style={styles.codeTypeText}>
                  <Text style={[
                    styles.codeTypeTitle,
                    { color: codeType === 'barcode' ? colors.textPrimary : colors.textPrimary }
                  ]}>
                    Barcode
                  </Text>
                  <Text style={[
                    styles.codeTypeDescription,
                    { color: codeType === 'barcode' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    Numbers only • Traditional store cards
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.codeTypeOption,
                  { backgroundColor: colors.backgroundLight },
                  codeType === 'qrcode' && { 
                    backgroundColor: colors.accent,
                    borderColor: colors.accent 
                  }
                ]}
                onPress={() => setCodeType('qrcode')}
              >
                <QrCode 
                  size={24} 
                  color={codeType === 'qrcode' ? colors.textPrimary : colors.textSecondary} 
                />
                <View style={styles.codeTypeText}>
                  <Text style={[
                    styles.codeTypeTitle,
                    { color: codeType === 'qrcode' ? colors.textPrimary : colors.textPrimary }
                  ]}>
                    QR Code
                  </Text>
                  <Text style={[
                    styles.codeTypeDescription,
                    { color: codeType === 'qrcode' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                  ]}>
                    Text & links • Modern digital cards
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Code Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Card Code *
            </Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={[
                  styles.codeInput,
                  { 
                    backgroundColor: colors.backgroundLight,
                    color: colors.textPrimary,
                    borderColor: error && !code.trim() ? colors.error : 'transparent'
                  }
                ]}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  setError('');
                }}
                placeholder={"Enter your card code"}
                placeholderTextColor={colors.textHint}
                autoCapitalize="none"
                autoCorrect={false}
                multiline={codeType === 'qrcode'}
                numberOfLines={codeType === 'qrcode' ? 3 : 1}
              />
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.accent }]}
                onPress={handleScanCode}
              >
                <Camera size={20} color={colors.textPrimary} />
                <Text style={[styles.scanButtonText, { color: colors.textPrimary }]}>
                  Scan
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
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
              {loading ? t('common.labels.loading') : 'Create Card'}
            </Text>
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  previewSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoButton: {
    padding: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  cardPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLetter: {
    fontSize: 24,
    fontWeight: '700',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewColor: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedColor: {
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  codeTypeContainer: {
    gap: 12,
  },
  codeTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  codeTypeText: {
    marginLeft: 12,
    flex: 1,
  },
  codeTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  codeTypeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  codeInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    textAlignVertical: 'top',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});