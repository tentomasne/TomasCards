import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
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