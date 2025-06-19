import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import CodeScanner from '@/components/CodeScanner';
import { storageManager } from '@/utils/storageManager';
import { SafeAreaView } from 'react-native-safe-area-context';
import { POPULAR_CARDS } from '@/assets/cards';

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { 
    store, 
    cardName, 
    cardColor, 
    codeType: paramCodeType,
    returnTo 
  } = useLocalSearchParams<{ 
    store?: string; 
    cardName?: string; 
    cardColor?: string; 
    codeType?: string;
    returnTo?: string;
  }>();
  const [scanned, setScanned] = useState(false);

  const handleCodeScanned = async (data: string, type: 'barcode' | 'qrcode') => {
    if (scanned) return;
    setScanned(true);

    // Check if cloud storage is selected but offline
    const storageMode = storageManager.getStorageMode();
    if (storageMode === 'cloud' && !isOnline) {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.message'),
        [
          { 
            text: t('common.buttons.ok'),
            onPress: () => setScanned(false)
          }
        ]
      );
      return;
    }

    let newCard;

    if (store === 'custom' && cardName && cardColor) {
      // Custom card from custom creation flow
      newCard = {
        id: Date.now().toString(),
        name: cardName,
        code: data,
        codeType: paramCodeType as 'barcode' | 'qrcode' || type,
        brand: 'custom',
        color: cardColor,
        dateAdded: Date.now(),
      };
    } else {
      // Regular store card
      const storeData = POPULAR_CARDS.find(card => card.id === store);
      newCard = {
        id: Date.now().toString(),
        name: storeData?.name || store || 'Unknown Store',
        code: data,
        codeType: type,
        brand: store,
        color: storeData?.color || colors.accent,
        dateAdded: Date.now(),
      };
    }
    
    try {
      await storageManager.saveCard(newCard, isOnline);
      
      if (returnTo === '/add/custom') {
        // Return to custom card creation with the scanned code
        router.replace({
          pathname: '/add/custom',
          params: { scannedCode: data, scannedType: type }
        });
      } else {
        router.replace(`/`);
      }
    } catch (error) {
      console.error('Failed to save scanned card:', error);
      setScanned(false);
      Alert.alert(
        t('common.labels.error'),
        'Failed to save card. Please try again.'
      );
    }
  };

  const handleManual = () => {
    if (store === 'custom') {
      router.back(); // Go back to custom card creation
    } else {
      router.push({ pathname: '/add/manual', params: { store } });
    }
  };

  const handleBack = () => router.back();
  const handleClose = () => {
    if (returnTo) {
      router.replace(returnTo as any);
    } else {
      router.replace('/');
    }
  };

  const getTitle = () => {
    if (store === 'custom' && cardName) {
      return cardName.toUpperCase();
    }
    return store?.toUpperCase() || t('addCard.scan.title');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {getTitle()}
          </Text>

          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          {t('addCard.scan.instruction')}
        </Text>

        <CodeScanner onCodeScanned={handleCodeScanned} />

        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          {t('addCard.scan.manual')}
        </Text>

        <TouchableOpacity 
          style={[styles.manualBtn, { borderColor: colors.textPrimary }]} 
          onPress={handleManual}
        >
          <Text style={[styles.manualBtnText, { color: colors.textPrimary }]}>
            {t('addCard.scan.enterManually')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 0,
    paddingHorizontal: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 16,
    fontSize: 14,
  },
  fallbackText: {
    marginTop: 32,
    fontSize: 14,
  },
  manualBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  manualBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});