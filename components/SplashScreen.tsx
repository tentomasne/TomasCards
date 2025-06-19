import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SplashScreenProps {
  message?: string;
}

export default function SplashScreen({ message }: SplashScreenProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>TomasCards</Text>
      <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
  },
  loader: {
    transform: [{ scale: 1.2 }],
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
});