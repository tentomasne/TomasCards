import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Smartphone, Monitor, Heart, Star, Settings } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import GradientButton from '@/components/GradientButton';
import ModernCard from '@/components/ModernCard';
import GradientBackground from '@/components/GradientBackground';
import ThemeToggle from '@/components/ThemeToggle';
import Header from '@/components/Header';

export default function DesignDemo() {
  const { colors, isDark } = useTheme();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const demoCards = [
    { id: 1, title: 'Orange Gradient', description: 'Primary accent color', icon: Heart },
    { id: 2, title: 'Blue Gradient', description: 'Secondary accent color', icon: Star },
    { id: 3, title: 'Modern Design', description: 'Clean and minimalist', icon: Palette },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title="Design System"
        showBack={true}
        rightElement={<ThemeToggle />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Theme Info */}
        <ModernCard style={styles.themeCard}>
          <View style={styles.themeInfo}>
            <View style={styles.themeIcon}>
              {isDark ? (
                <Monitor size={24} color={colors.accent} />
              ) : (
                <Smartphone size={24} color={colors.accent} />
              )}
            </View>
            <View style={styles.themeText}>
              <Text style={[styles.themeTitle, { color: colors.textPrimary }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                {isDark 
                  ? 'Deep gray background with subtle glow effects'
                  : 'White background with soft shadows'
                }
              </Text>
            </View>
          </View>
        </ModernCard>

        {/* Gradient Buttons */}
        <ModernCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Gradient Buttons
          </Text>
          <View style={styles.buttonGrid}>
            <GradientButton
              title="Orange Primary"
              variant="orange"
              size="large"
              onPress={() => console.log('Orange pressed')}
            />
            <GradientButton
              title="Blue Secondary"
              variant="blue"
              size="large"
              onPress={() => console.log('Blue pressed')}
            />
            <View style={styles.buttonRow}>
              <GradientButton
                title="Medium"
                variant="orange"
                size="medium"
                onPress={() => console.log('Medium pressed')}
                style={styles.halfButton}
              />
              <GradientButton
                title="Small"
                variant="blue"
                size="small"
                onPress={() => console.log('Small pressed')}
                style={styles.halfButton}
              />
            </View>
          </View>
        </ModernCard>

        {/* Interactive Cards */}
        <ModernCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Interactive Cards
          </Text>
          <View style={styles.cardGrid}>
            {demoCards.map((card) => {
              const IconComponent = card.icon;
              const isSelected = selectedCard === card.id;
              
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.demoCard,
                    { 
                      backgroundColor: colors.backgroundLight,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    }
                  ]}
                  onPress={() => setSelectedCard(isSelected ? null : card.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.cardIcon,
                    { backgroundColor: isSelected ? colors.accent : colors.backgroundMedium }
                  ]}>
                    <IconComponent 
                      size={20} 
                      color={isSelected ? '#FFFFFF' : colors.textSecondary} 
                    />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                    {card.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ModernCard>

        {/* Gradient Background Demo */}
        <View style={styles.gradientDemo}>
          <GradientBackground variant="orange" style={styles.gradientCard}>
            <Text style={styles.gradientText}>Orange Gradient Background</Text>
            <Text style={styles.gradientSubtext}>Perfect for hero sections</Text>
          </GradientBackground>
          
          <GradientBackground variant="blue" style={styles.gradientCard}>
            <Text style={styles.gradientText}>Blue Gradient Background</Text>
            <Text style={styles.gradientSubtext}>Great for call-to-action areas</Text>
          </GradientBackground>
        </View>

        {/* Color Palette */}
        <ModernCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Color Palette
          </Text>
          <View style={styles.colorGrid}>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.accent }]} />
              <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>
                Orange Primary
              </Text>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>
                Blue Secondary
              </Text>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.success }]} />
              <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>
                Success Green
              </Text>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: colors.error }]} />
              <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>
                Error Red
              </Text>
            </View>
          </View>
        </ModernCard>

        {/* Settings Demo */}
        <ModernCard>
          <View style={styles.settingsHeader}>
            <Settings size={24} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginLeft: 12 }]}>
              Settings Example
            </Text>
          </View>
          <View style={styles.settingsList}>
            {['Notifications', 'Privacy', 'Account', 'Help'].map((setting, index) => (
              <TouchableOpacity
                key={setting}
                style={[
                  styles.settingItem,
                  { borderBottomColor: colors.divider },
                  index === 3 && { borderBottomWidth: 0 }
                ]}
              >
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>
                  {setting}
                </Text>
                <Text style={[styles.settingArrow, { color: colors.textHint }]}>
                  →
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ModernCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  themeCard: {
    marginBottom: 16,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    marginRight: 16,
  },
  themeText: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  buttonGrid: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  demoCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  gradientDemo: {
    gap: 12,
    marginVertical: 16,
  },
  gradientCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  gradientText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gradientSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  colorGrid: {
    gap: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsList: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingArrow: {
    fontSize: 18,
    fontWeight: '300',
  },
});