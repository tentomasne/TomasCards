import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/hooks/useTheme';
import { initializeLanguage } from '@/utils/i18n';
import { loadSettings } from '@/utils/storage';
import SplashScreen from '@/components/SplashScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  useFrameworkReady();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingMessage('Loading language...');
        await initializeLanguage();

        setLoadingMessage('Loading settings...');
        await loadSettings();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setLoadingMessage('Error loading app data');
        setTimeout(() => setIsLoading(false), 2000);
      }
    }

    initializeApp();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ThemeProvider>
        {isLoading ? (
          <SplashScreen message={loadingMessage} />
        ) : (
          <GestureHandlerRootView style={styles.container}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        )}
      </ThemeProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});