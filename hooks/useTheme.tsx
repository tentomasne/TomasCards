import { useEffect, useState, createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { loadSettings, saveSettings } from '@/utils/storage';
import { LIGHT_COLORS, DARK_COLORS } from '@/constants/Colors';
import type { ThemeMode, AppSettings } from '@/utils/types';

type ThemeContextType = {
  colors: typeof LIGHT_COLORS;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [colors, setColors] = useState(DARK_COLORS);
  const isDark = colors === DARK_COLORS;

  useEffect(() => {
    loadSettings().then(settings => {
      setThemeModeState(settings.themeMode || 'system');
    });
  }, []);

  useEffect(() => {
    const isDark = themeMode === 'system' 
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

    const newColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    setColors(newColors);

    // Update system UI
    setStatusBarStyle(isDark ? 'light' : 'dark');
    setBackgroundColorAsync(newColors.backgroundDark);
  }, [themeMode, systemColorScheme]);

  const updateThemeMode = async (newThemeMode: ThemeMode) => {
    setThemeModeState(newThemeMode);
    const settings = await loadSettings();
    await saveSettings({
      ...settings,
      themeMode: newThemeMode,
    });
  };

  const contextValue = {
    colors,
    isDark,
    themeMode,
    setThemeMode: updateThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}