import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Pencil, Star, Trash2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

import { LoyaltyCard } from '@/utils/types';
import { getCard } from '@/utils/storage';
import { storageManager } from '@/utils/storageManager';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import CardForm from '@/components/CardForm';
import Header from '@/components/Header';
import OfflineBanner from '@/components/OfflineBanner';
import { POPULAR_CARDS } from '@/assets/cards';

export default function CardDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isEditing, setIsEditing] = useState(edit === 'true');
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');

  const matchedCard = card ? POPULAR_CARDS.find(
    (item) => item.id?.toLowerCase() === card.brand?.toLowerCase()
  ) : undefined;

  useEffect(() => {
    const initializeStorageMode = async () => {
      await storageManager.initialize();
      setStorageMode(storageManager.getStorageMode());
    };
    initializeStorageMode();
  }, []);

  useEffect(() => {
    const loadCardData = async () => {
      if (!id) return;
      try {
        const cardData = await getCard(id);
        if (cardData) {
          setCard(cardData);
          if (!isEditing) {
            const updated = { ...cardData, lastUsed: Date.now() };
            await storageManager.updateCard(updated, isOnline);
          }
        }
      } catch (e) {
        console.error('Error loading card:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCardData();
  }, [id, isEditing, isOnline]);

  const handleUpdateCard = async (updatedCard: LoyaltyCard) => {
    // Check if user is offline and using cloud storage
    if (!isOnline && storageMode === 'cloud') {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.operationBlocked'),
        [{ text: t('common.buttons.ok') }]
      );
      return;
    }

    await storageManager.updateCard(updatedCard, isOnline);
    setCard(updatedCard);
    setIsEditing(false);
  };

  const handleDeleteCard = async () => {
    // Check if user is offline and using cloud storage
    if (!isOnline && storageMode === 'cloud') {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.operationBlocked'),
        [{ text: t('common.buttons.ok') }]
      );
      return;
    }

    const confirmDelete = async () => {
      if (id) {
        try {
          await storageManager.deleteCard(id, isOnline);
          router.replace('/');
        } catch (error) {
          console.error('Failed to delete card:', error);
          Alert.alert(
            t('common.labels.error'),
            'Failed to delete card. Please try again.'
          );
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(t('cardDetail.deleteConfirm'))) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        t('common.buttons.delete'),
        t('cardDetail.deleteConfirm'),
        [
          { text: t('common.buttons.cancel'), style: 'cancel' },
          { text: t('common.buttons.delete'), onPress: confirmDelete, style: 'destructive' },
        ]
      );
    }
  };

  const toggleFavorite = async () => {
    if (card) {
      // Check if user is offline and using cloud storage
      if (!isOnline && storageMode === 'cloud') {
        Alert.alert(
          t('storage.offline.title'),
          t('storage.offline.operationBlocked'),
          [{ text: t('common.buttons.ok') }]
        );
        return;
      }

      const newFavoriteStatus = !card.isFavorite;
      
      try {
        const updatedCard = await storageManager.toggleFavorite(card.id, newFavoriteStatus, isOnline);
        if (updatedCard) {
          setCard(updatedCard);
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        Alert.alert(
          t('common.labels.error'),
          'Failed to update favorite status. Please try again.'
        );
      }
    }
  };

  const handleEditPress = () => {
    // Check if user is offline and using cloud storage
    if (!isOnline && storageMode === 'cloud') {
      Alert.alert(
        t('storage.offline.title'),
        t('storage.offline.operationBlocked'),
        [{ text: t('common.buttons.ok') }]
      );
      return;
    }
    setIsEditing(true);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.backgroundDark }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t('common.labels.error')}
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>
            {t('common.buttons.back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const logoSource: ImageSourcePropType | null = matchedCard
    ? (matchedCard.logo as ImageSourcePropType)
    : null;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.backgroundDark }]}>
      <OfflineBanner visible={!isOnline && storageMode === 'cloud'} />
      
      <Header
        title={card.name}
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity 
            onPress={toggleFavorite} 
            style={[
              styles.favoriteButton,
              (!isOnline && storageMode === 'cloud') && styles.disabledButton
            ]}
            disabled={!isOnline && storageMode === 'cloud'}
          >
            <Star
              size={24}
              color={colors.textPrimary}
              fill={card.isFavorite ? colors.textPrimary : 'none'}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.cardHeader}>
          <View style={[styles.logoPlaceholder, { backgroundColor: card.color }]}>
            {logoSource ? (
              <Image
                source={logoSource}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.logoPlaceholderText, { color: colors.textPrimary }]}>
                {card.name.charAt(0)}
              </Text>
            )}
          </View>
          <Text style={[styles.cardName, { color: colors.textPrimary }]}>{card.name}</Text>
        </View>

        <View style={styles.codeContainer}>
          {card.codeType === 'qrcode' ? (
            <QRCode
              value={card.code}
              size={200}
              color={colors.textPrimary}
              backgroundColor="transparent"
            />
          ) : (
            <BarcodeRenderer code={card.code} codeType={card.codeType} />
          )}
          <Text style={[styles.codeText, { color: colors.textSecondary }]}>{card.code}</Text>
        </View>

        {card.notes ? (
          <View style={[styles.notesContainer, { backgroundColor: colors.backgroundMedium }]}>
            <Text style={[styles.notesTitle, { color: colors.textPrimary }]}>
              {t('common.labels.notes')}
            </Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {card.notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.editButton, 
              { backgroundColor: colors.backgroundMedium },
              (!isOnline && storageMode === 'cloud') && styles.disabledButton
            ]}
            onPress={handleEditPress}
            disabled={!isOnline && storageMode === 'cloud'}
          >
            <Pencil size={20} color={colors.textPrimary} />
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              {t('common.buttons.edit')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.deleteButton, 
              { backgroundColor: colors.backgroundMedium },
              (!isOnline && storageMode === 'cloud') && styles.disabledButton
            ]}
            onPress={handleDeleteCard}
            disabled={!isOnline && storageMode === 'cloud'}
          >
            <Trash2 size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
              {t('common.buttons.delete')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: colors.textHint }]}>
            {t('cardDetail.added', { 
              date: new Date(card.dateAdded).toLocaleDateString() 
            })}
          </Text>
          {card.lastUsed && (
            <Text style={[styles.infoText, { color: colors.textHint }]}>
              {t('cardDetail.lastUsed', { 
                date: new Date(card.lastUsed).toLocaleDateString() 
              })}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isEditing}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditing(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditing(false)}>
          <View style={[styles.modalBackground, { backgroundColor: colors.overlay }]} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContainer, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('common.buttons.edit')}
            </Text>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <CardForm existingCard={card} onSave={handleUpdateCard} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  favoriteButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 24,
    fontWeight: '700',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeText: {
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notesContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackground: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  logo: {
    width: 56,
    height: 56,
  },
});