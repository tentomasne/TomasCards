import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

interface ColorPickerProps {
  visible: boolean;
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const EXTENDED_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
  '#F1948A', '#85C1E9', '#F8C471', '#D7BDE2', '#A9DFBF', '#F9E79F',
  '#AED6F1', '#F5B7B1', '#A3E4D7', '#D5A6BD', '#A9CCE3', '#F7DC6F',
  '#E8DAEF', '#ABEBC6', '#FCF3CF', '#D6EAF8', '#FADBD8', '#D1F2EB',
];

export default function ColorPicker({
  visible,
  currentColor,
  onColorSelect,
  onClose,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [customColor, setCustomColor] = useState(currentColor);

  const isValidHexColor = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const handleCustomColorSave = () => {
    if (isValidHexColor(customColor)) {
      onColorSelect(customColor);
      onClose();
    }
  };

  useEffect(() => {
    if (visible) {
      setCustomColor(currentColor);
    }
  }, [currentColor, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('addCard.custom.selectColor')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Preset Colors */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('addCard.custom.presetColors')}
            </Text>
            <View style={styles.colorGrid}>
              {EXTENDED_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorGridOption,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedGridColor
                  ]}
                  onPress={() => {
                    onColorSelect(color);
                    onClose();
                  }}
                >
                  {currentColor === color && (
                    <Check size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Color Input */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('addCard.custom.customColor')}
            </Text>
            <View style={styles.customColorSection}>
              <View style={styles.customColorInput}>
                <TextInput
                  style={[
                    styles.hexInput,
                    { 
                      backgroundColor: colors.backgroundMedium,
                      color: colors.textPrimary,
                      borderColor: isValidHexColor(customColor) ? colors.success : colors.error
                    }
                  ]}
                  value={customColor}
                  onChangeText={setCustomColor}
                  placeholder="#FF6B6B"
                  placeholderTextColor={colors.textHint}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                <View 
                  style={[
                    styles.colorPreview,
                    { backgroundColor: isValidHexColor(customColor) ? customColor : colors.backgroundMedium }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: colors.accent },
                  !isValidHexColor(customColor) && styles.applyButtonDisabled
                ]}
                onPress={handleCustomColorSave}
                disabled={!isValidHexColor(customColor)}
              >
                <Text style={[styles.applyButtonText, { color: colors.textPrimary }]}>
                  {t('common.buttons.apply')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.helpText, { color: colors.textHint }]}>
              {t('addCard.custom.colorHelp')}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorGridOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedGridColor: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customColorSection: {
    marginBottom: 16,
  },
  customColorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  hexInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});