import { Platform } from 'react-native';

export const LIGHT_COLORS = {
  // Primary colors
  primary: '#FFFFFF',
  backgroundDark: '#FFFFFF',
  backgroundMedium: '#F8FAFC',
  backgroundLight: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textHint: '#94A3B8',

  // Gradients
  orangeGradient: ['#FF7A00', '#FFA149'],
  blueGradient: ['#2563EB', '#60A5FA'],
  
  // Accent colors (using orange as primary accent)
  accent: '#FF7A00',
  accentLight: '#FFA149',
  accentDark: '#E6690A',

  // Secondary accent (blue)
  secondary: '#2563EB',
  secondaryLight: '#60A5FA',
  secondaryDark: '#1D4ED8',

  // UI elements
  border: '#E2E8F0',
  divider: '#F1F5F9',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Card colors
  cardShadow: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.15)',
  cardBackground: '#FFFFFF',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const DARK_COLORS = {
  // Primary colors
  primary: '#121212',
  backgroundDark: '#121212',
  backgroundMedium: '#1E1E1E',
  backgroundLight: '#2A2A2A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textHint: '#6B7280',

  // Gradients
  orangeGradient: ['#FF7A00', '#FFA149'],
  blueGradient: ['#2563EB', '#60A5FA'],
  
  // Accent colors (using orange as primary accent)
  accent: '#FF7A00',
  accentLight: '#FFA149',
  accentDark: '#E6690A',

  // Secondary accent (blue)
  secondary: '#2563EB',
  secondaryLight: '#60A5FA',
  secondaryDark: '#1D4ED8',

  // UI elements
  border: '#374151',
  divider: '#2A2A2A',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Card colors
  cardShadow: 'rgba(255, 255, 255, 0.05)',
  cardBackground: '#1E1E1E',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const COLORS = DARK_COLORS;