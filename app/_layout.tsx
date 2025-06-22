import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/hooks/useTheme';
import { initializeLanguage } from '@/utils/i18n';
import { loadSettings } from '@/utils/storage';
import { debugManager, DebugLog } from '@/utils/debugManager';
import SplashScreen from '@/components/SplashScreen';
import DebugModal from '@/components/DebugModal';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  useFrameworkReady();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [currentDebugLog, setCurrentDebugLog] = useState<DebugLog | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingMessage('Initializing debug system...');
        await debugManager.initialize();

        // Set up debug modal callback
        debugManager.setErrorModalCallback((log: DebugLog) => {
          setCurrentDebugLog(log);
          setDebugModalVisible(true);
        });

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

  const handleCloseDebugModal = () => {
    setDebugModalVisible(false);
    setCurrentDebugLog(null);
  };

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
            
            <DebugModal
              visible={debugModalVisible}
              log={currentDebugLog}
              onClose={handleCloseDebugModal}
            />
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