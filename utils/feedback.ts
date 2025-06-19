import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { loadSettings } from './storage';

// Trigger light haptic feedback
export async function lightHaptic(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const settings = await loadSettings();
      if (settings.hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
}

// Trigger medium haptic feedback
export async function mediumHaptic(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const settings = await loadSettings();
      if (settings.hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
}

// Trigger heavy haptic feedback
export async function heavyHaptic(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const settings = await loadSettings();
      if (settings.hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
}

// Trigger success haptic feedback
export async function successHaptic(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const settings = await loadSettings();
      if (settings.hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
}

// Trigger error haptic feedback
export async function errorHaptic(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const settings = await loadSettings();
      if (settings.hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Error with haptic feedback:', error);
    }
  }
}