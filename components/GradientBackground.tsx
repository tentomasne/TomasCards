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

  const getGradientColors = (): [string, string, ...string[]] => {
    switch (variant) {
      case 'orange':
        return colors.orangeGradient as [string, string, ...string[]];
      case 'blue':
        return colors.blueGradient as [string, string, ...string[]];
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