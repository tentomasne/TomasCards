import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onBack?: () => void;
}

export default function Header({ title, showBack = true, rightElement, leftElement, onBack }: HeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { 
      backgroundColor: colors.backgroundDark,
      borderBottomColor: colors.backgroundMedium 
    }]}>
      <View style={styles.leftSection}>
        {leftElement && (
          <View style={{ paddingRight: 8 }}>
            {leftElement}
            </View>
            )}
        
        {showBack && (
          <TouchableOpacity 
            onPress={onBack || (() => router.back())} 
            style={styles.backButton}
            accessibilityLabel={t('common.buttons.back')}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      
      <View style={styles.rightSection}>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  rightSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});