import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

interface OfflineBannerProps {
  visible: boolean;
}

export default function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.error }]}>
      <WifiOff size={16} color={colors.textPrimary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {t('common.offline.banner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});