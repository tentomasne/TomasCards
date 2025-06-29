import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'orange' | 'blue';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GradientButton({
  title,
  onPress,
  variant = 'orange',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}: GradientButtonProps) {
  const { colors } = useTheme();

  const gradientColors: [string, string, ...string[]] = variant === 'orange' 
    ? colors.orangeGradient as [string, string, ...string[]]
    : colors.blueGradient as [string, string, ...string[]];
  
  const buttonStyle = [
    styles.button,
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#94A3B8', '#94A3B8'] : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, styles[size]]}
      >
        <Text style={textStyles}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    height: 48,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    height: 56,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.6,
  },
});