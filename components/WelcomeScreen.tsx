import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Cloud, Smartphone, ArrowRight, Shield, Database } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { storageManager } from '@/utils/storageManager';
import { lightHaptic } from '@/utils/feedback';

interface WelcomeScreenProps {
  onComplete: (selectedMode?: 'local' | 'cloud') => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleCloudStorage = async () => {
    await lightHaptic();
    // Set cloud mode and continue to app
    await storageManager.setStorageMode('cloud');
    onComplete('cloud');
  };

  const handleLocalStorage = async () => {
    setLoading(true);
    await lightHaptic();

    const showWarningAndContinue = () => {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          `${t('welcome.localWarning.title')}\n\n${t('welcome.localWarning.message')}`
        );
        if (confirmed) {
          onComplete('local');
        }
        setLoading(false);
      } else {
        Alert.alert(
          t('welcome.localWarning.title'),
          t('welcome.localWarning.message'),
          [
            {
              text: t('common.buttons.cancel'),
              style: 'cancel',
              onPress: () => setLoading(false),
            },
            {
              text: t('welcome.localWarning.continue'),
              onPress: () => {
                onComplete('local');
                setLoading(false);
              },
            },
          ]
        );
      }
    };

    try {
      // Set storage mode to local
      await storageManager.setStorageMode('local');
      showWarningAndContinue();
    } catch (error) {
      console.error('Error setting up local storage:', error);
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('welcome.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('welcome.subtitle')}
          </Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity
            style={[
              styles.option,
              { backgroundColor: colors.backgroundMedium },
              styles.recommendedOption,
              { borderColor: colors.accent }
            ]}
            onPress={handleCloudStorage}
            disabled={loading}
          >
            <View style={styles.optionHeader}>
              <Cloud size={32} color={colors.accent} />
              <View style={styles.optionTitleContainer}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('welcome.cloudOption.title')}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              {t('welcome.cloudOption.description')}
            </Text>
            
            <View style={styles.features}>
              <View style={styles.feature}>
                <Cloud size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.success }]}>
                  {t('welcome.cloudOption.feature1')}
                </Text>
              </View>
              <View style={styles.feature}>
                <Shield size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.success }]}>
                  {t('welcome.cloudOption.feature2')}
                </Text>
              </View>
              <View style={styles.feature}>
                <Database size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.success }]}>
                  {t('welcome.cloudOption.feature3')}
                </Text>
              </View>
            </View>

            <View style={styles.optionFooter}>
              <Text style={[styles.actionText, { color: colors.accent }]}>
                {t('welcome.cloudOption.action')}
              </Text>
              <ArrowRight size={20} color={colors.accent} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.backgroundMedium }]}
            onPress={handleLocalStorage}
            disabled={loading}
          >
            <View style={styles.optionHeader}>
              <Smartphone size={32} color={colors.textSecondary} />
              <Text style={[styles.optionTitle, { color: colors.textPrimary, marginLeft: 16 }]}>
                {t('welcome.localOption.title')}
              </Text>
            </View>
            
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              {t('welcome.localOption.description')}
            </Text>
            
            <View style={styles.features}>
              <View style={styles.feature}>
                <Shield size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.success }]}>
                  {t('welcome.localOption.feature1')}
                </Text>
              </View>
              <View style={styles.feature}>
                <Smartphone size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.success }]}>
                  {t('welcome.localOption.feature2')}
                </Text>
              </View>
              <View style={styles.feature}>
                <Text style={[styles.featureText, { color: colors.warning }]}>
                  ⚠ {t('welcome.localOption.limitation')}
                </Text>
              </View>
            </View>

            <View style={styles.optionFooter}>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                {t('welcome.localOption.action')}
              </Text>
              <ArrowRight size={20} color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: colors.textHint }]}>
          {t('welcome.note')}
        </Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('welcome.settingUp')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  options: {
    gap: 20,
    marginBottom: 32,
  },
  option: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recommendedOption: {
    borderWidth: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitleContainer: {
    marginLeft: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  features: {
    gap: 8,
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});