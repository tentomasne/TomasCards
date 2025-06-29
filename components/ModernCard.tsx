import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export default function ModernCard({
  children,
  style,
  padding = 24,
  elevated = true,
}: ModernCardProps) {
  const { colors, isDark } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.cardBackground,
      padding,
      shadowColor: isDark ? '#FFFFFF' : '#000000',
      shadowOpacity: isDark ? 0.05 : 0.1,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 8,
      elevation: elevated ? 8 : 0,
    },
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 8,
  },
});