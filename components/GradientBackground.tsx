import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'orange' | 'blue' | 'subtle';
  style?: ViewStyle;
}

export default function GradientBackground({
  children,
  variant = 'subtle',
  style,
}: GradientBackgroundProps) {
  const { colors, isDark } = useTheme();

  const getGradientColors = () => {
    switch (variant) {
      case 'orange':
        return colors.orangeGradient;
      case 'blue':
        return colors.blueGradient;
      case 'subtle':
      default:
        return isDark 
          ? [colors.backgroundDark, colors.backgroundMedium]
          : [colors.backgroundDark, colors.backgroundLight];
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});