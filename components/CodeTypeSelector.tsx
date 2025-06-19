import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BarChart3, QrCode } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

interface CodeTypeSelectorProps {
  selectedType: 'barcode' | 'qrcode';
  onSelect: (type: 'barcode' | 'qrcode') => void;
}

export default function CodeTypeSelector({ selectedType, onSelect }: CodeTypeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: colors.backgroundLight },
          selectedType === 'barcode' && { backgroundColor: colors.accent }
        ]}
        onPress={() => onSelect('barcode')}
      >
        <BarChart3 
          size={24} 
          color={selectedType === 'barcode' ? colors.textPrimary : colors.textSecondary} 
        />
        <Text style={[
          styles.optionText,
          { color: selectedType === 'barcode' ? colors.textPrimary : colors.textSecondary }
        ]}>
          {t('addCard.custom.barcode')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          { backgroundColor: colors.backgroundLight },
          selectedType === 'qrcode' && { backgroundColor: colors.accent }
        ]}
        onPress={() => onSelect('qrcode')}
      >
        <QrCode 
          size={24} 
          color={selectedType === 'qrcode' ? colors.textPrimary : colors.textSecondary} 
        />
        <Text style={[
          styles.optionText,
          { color: selectedType === 'qrcode' ? colors.textPrimary : colors.textSecondary }
        ]}>
          {t('addCard.custom.qrcode')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});