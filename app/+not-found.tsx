import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import GradientButton from '@/components/GradientButton';
import ModernCard from '@/components/ModernCard';
import GradientBackground from '@/components/GradientBackground';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <GradientBackground variant="subtle" style={styles.background}>
          <View style={styles.content}>
            {/* Error Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundMedium }]}>
              <AlertCircle size={64} color={colors.accent} />
            </View>

            {/* Error Message */}
            <ModernCard style={styles.messageCard}>
              <Text style={[styles.errorCode, { color: colors.accent }]}>
                404
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Page Not Found
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                The page you're looking for doesn't exist or has been moved. 
                Don't worry, let's get you back on track.
              </Text>
            </ModernCard>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <GradientButton
                title="Go to Home"
                variant="orange"
                size="large"
                onPress={() => router.replace('/')}
                style={styles.primaryButton}
              />
              
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.backgroundMedium }]}
                onPress={() => router.back()}
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                  Go Back
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Links */}
            <ModernCard style={styles.quickLinksCard}>
              <Text style={[styles.quickLinksTitle, { color: colors.textPrimary }]}>
                Quick Links
              </Text>
              <View style={styles.quickLinks}>
                <Link href="/" asChild>
                  <TouchableOpacity style={[styles.quickLink, { backgroundColor: colors.backgroundLight }]}>
                    <Home size={20} color={colors.textSecondary} />
                    <Text style={[styles.quickLinkText, { color: colors.textPrimary }]}>
                      Cards
                    </Text>
                  </TouchableOpacity>
                </Link>
                
                <Link href="/add" asChild>
                  <TouchableOpacity style={[styles.quickLink, { backgroundColor: colors.backgroundLight }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <Text style={[styles.quickLinkText, { color: colors.textPrimary }]}>
                      Add Card
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </ModernCard>

            {/* Decorative Elements */}
            <View style={styles.decorativeElements}>
              <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: colors.accent + '20' }]} />
              <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: colors.secondary + '20' }]} />
              <View style={[styles.decorativeCircle, styles.circle3, { backgroundColor: colors.accent + '10' }]} />
            </View>
          </View>
        </GradientBackground>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    position: 'relative',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  messageCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 32,
  },
  errorCode: {
    fontSize: 72,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickLinksCard: {
    width: '100%',
    maxWidth: 400,
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: '10%',
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: '20%',
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '30%',
    left: '20%',
  },
});