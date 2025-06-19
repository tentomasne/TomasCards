import { Platform } from 'react-native';

export const LIGHT_COLORS = {
  // Primary colors
  primary: '#FFFFFF',
  backgroundDark: '#F5F5F7',
  backgroundMedium: '#FFFFFF',
  backgroundLight: '#F0F0F5',

  // Text
  textPrimary: '#1A1B2E',
  textSecondary: '#4A4B5C',
  textHint: '#6E6E8A',

  // Accent colors
  accent: '#4F6BFF',
  accentLight: '#657FFF',
  accentDark: '#3451DB',

  // UI elements
  border: '#E6E6F0',
  divider: '#EEEEF5',
  
  // Status colors
  success: '#4CAF93',
  warning: '#F2BD6E',
  error: '#F46E6E',
  
  // Card colors
  cardShadow: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.15)',
  cardBackground: '#FFFFFF',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const DARK_COLORS = {
  // Primary colors
  primary: '#1A1B2E',
  backgroundDark: '#121224',
  backgroundMedium: '#1A1B2E',
  backgroundLight: '#252640',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textHint: '#8181A0',

  // Accent colors
  accent: '#4F6BFF',
  accentLight: '#657FFF',
  accentDark: '#3451DB',

  // UI elements
  border: '#33334D',
  divider: '#2D2D45',
  
  // Status colors
  success: '#4CAF93',
  warning: '#F2BD6E',
  error: '#F46E6E',
  
  // Card colors
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  cardBackground: '#252640',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const COLORS = DARK_COLORS;