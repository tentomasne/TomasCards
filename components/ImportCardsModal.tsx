import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Download, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Database } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { storageManager } from '@/utils/storageManager';
import { LoyaltyCard } from '@/utils/types';
import { logInfo, logError, logWarning } from '@/utils/debugManager';

interface ImportCardsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportCardsModal({ visible, onClose }: ImportCardsModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [url, setUrl] = useState('https://tomascards.eu/import.json');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewCards, setPreviewCards] = useState<LoyaltyCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const validateCard = (card: any): card is LoyaltyCard => {
    return (
      typeof card === 'object' &&
      card !== null &&
      typeof card.name === 'string' &&
      typeof card.code === 'string' &&
      (card.codeType === 'barcode' || card.codeType === 'qrcode') &&
      typeof card.color === 'string'
    );
  };

  const generateCardId = (card: any): string => {
    // Generate a unique ID based on card content
    const content = `${card.name}-${card.code}-${card.brand || 'custom'}`;
    return Date.now().toString() + '-' + content.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  };

  const normalizeCard = (card: any): LoyaltyCard => {
    return {
      id: card.id || generateCardId(card),
      name: card.name,
      brand: card.brand || 'custom',
      code: card.code,
      codeType: card.codeType,
      color: card.color,
      dateAdded: card.dateAdded || Date.now(),
      lastUsed: card.lastUsed,
      notes: card.notes,
      isFavorite: card.isFavorite || false,
    };
  };

  const handlePreview = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Internet connection is required to import cards from a URL.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setPreviewCards([]);

    try {
      logInfo('Starting card import preview', `URL: ${url}`, 'ImportCardsModal');

      const response = await fetch(url.trim());
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logWarning('Response is not JSON', `Content-Type: ${contentType}`, 'ImportCardsModal');
      }

      const data = await response.json();
      logInfo('Import data received', `Type: ${typeof data}, Length: ${Array.isArray(data) ? data.length : 'N/A'}`, 'ImportCardsModal');

      let cardsToImport: any[] = [];
      // Handle different data structures
      if (Array.isArray(data)) {
        cardsToImport = data;
      } else if (data.cards && Array.isArray(data.cards)) {
        cardsToImport = data.cards;
      } else if (data.loyaltyCards && Array.isArray(data.loyaltyCards)) {
        cardsToImport = data.loyaltyCards;
      } else {
        throw new Error('Invalid data format. Expected an array of cards or an object with a "cards" property.');
      }

      if (cardsToImport.length === 0) {
        throw new Error('No cards found in the import data.');
      }

      // Validate and normalize cards
      const validCards: LoyaltyCard[] = [];
      const errors: string[] = [];

      for (let i = 0; i < cardsToImport.length; i++) {
        const card = cardsToImport[i];
        
        if (validateCard(card)) {
          try {
            const normalizedCard = normalizeCard(card);
            validCards.push(normalizedCard);
          } catch (error) {
            errors.push(`Card ${i + 1}: Failed to normalize - ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          errors.push(`Card ${i + 1}: Invalid format - missing required fields (name, code, codeType, color)`);
        }
      }

      if (validCards.length === 0) {
        throw new Error('No valid cards found in the import data.');
      }

      setPreviewCards(validCards);
      setShowPreview(true);
      
      logInfo('Import preview prepared', `Valid cards: ${validCards.length}, Errors: ${errors.length}`, 'ImportCardsModal');

      if (errors.length > 0) {
        logWarning('Import validation errors', errors.join('; '), 'ImportCardsModal');
      }

    } catch (error) {
      console.error('Import preview failed:', error);
      logError('Import preview failed', error instanceof Error ? error.message : String(error), 'ImportCardsModal');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (Platform.OS === 'web') {
        alert(`Import failed: ${errorMessage}`);
      } else {
        Alert.alert(
          'Import Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (previewCards.length === 0) {
      return;
    }

    setIsImporting(true);

    try {
      logInfo('Starting card import', `Cards to import: ${previewCards.length}`, 'ImportCardsModal');

      // Get existing cards to check for duplicates
      const existingCards = await storageManager.loadLocalCards();
      const existingCodes = new Set(existingCards.map(card => `${card.name}-${card.code}`));

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const card of previewCards) {
        try {
          const cardKey = `${card.name}-${card.code}`;
          
          if (existingCodes.has(cardKey)) {
            skipped++;
            logInfo('Card skipped (duplicate)', `Name: ${card.name}, Code: ${card.code}`, 'ImportCardsModal');
            continue;
          }

          // Generate a new ID to avoid conflicts
          const newCard: LoyaltyCard = {
            ...card,
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            dateAdded: Date.now(),
          };

          await storageManager.saveCard(newCard, isOnline);
          imported++;
          existingCodes.add(cardKey); // Prevent duplicates within the same import
          
          logInfo('Card imported successfully', `Name: ${card.name}`, 'ImportCardsModal');

        } catch (error) {
          const errorMsg = `Failed to import "${card.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logError('Card import failed', errorMsg, 'ImportCardsModal');
        }
      }

      const result: ImportResult = {
        success: imported > 0,
        imported,
        skipped,
        errors,
      };

      setImportResult(result);
      setShowPreview(false);

      logInfo('Import completed', `Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors.length}`, 'ImportCardsModal');

      // Show success message
      if (imported > 0) {
        const message = `Successfully imported ${imported} card${imported !== 1 ? 's' : ''}!${skipped > 0 ? ` ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.` : ''}`;
        
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert(
            'Import Successful',
            message,
            [{ text: 'OK' }]
          );
        }
      }

    } catch (error) {
      console.error('Import failed:', error);
      logError('Import failed', error instanceof Error ? error.message : String(error), 'ImportCardsModal');
      
      if (Platform.OS === 'web') {
        alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        Alert.alert(
          'Import Failed',
          error instanceof Error ? error.message : 'Unknown error occurred',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setImportResult(null);
      setPreviewCards([]);
      setShowPreview(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Database size={24} color={colors.accent} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Import Cards
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!showPreview && !importResult && (
              <>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  Import loyalty cards from a JSON URL. The JSON should contain an array of card objects with the following structure:
                </Text>

                <View style={[styles.exampleContainer, { backgroundColor: colors.backgroundMedium }]}>
                  <Text style={[styles.exampleTitle, { color: colors.textPrimary }]}>
                    Expected JSON format:
                  </Text>
                  <Text style={[styles.exampleCode, { color: colors.textSecondary }]}>
                    {`[
  {
    "name": "Store Name",
    "code": "1234567890",
    "codeType": "barcode",
    "color": "#FF6B6B",
    "brand": "store",
    "notes": "Optional notes"
  }
]`}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Import URL
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.backgroundMedium,
                        color: colors.textPrimary,
                        borderColor: colors.backgroundLight
                      }
                    ]}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="https://example.com/cards.json"
                    placeholderTextColor={colors.textHint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.previewButton,
                    { backgroundColor: colors.accent },
                    (isImporting || !url.trim()) && styles.buttonDisabled
                  ]}
                  onPress={handlePreview}
                  disabled={isImporting || !url.trim()}
                >
                  {isImporting ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Download size={20} color={colors.textPrimary} />
                  )}
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                    {isImporting ? 'Loading...' : 'Preview Cards'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {showPreview && (
              <>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  Preview ({previewCards.length} cards)
                </Text>
                <Text style={[styles.previewDescription, { color: colors.textSecondary }]}>
                  Review the cards below and confirm to import them.
                </Text>

                <ScrollView style={styles.previewList} nestedScrollEnabled>
                  {previewCards.slice(0, 10).map((card, index) => (
                    <View key={index} style={[styles.previewCard, { backgroundColor: colors.backgroundMedium }]}>
                      <View style={[styles.cardColorIndicator, { backgroundColor: card.color }]} />
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: colors.textPrimary }]}>
                          {card.name}
                        </Text>
                        <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>
                          {card.codeType.toUpperCase()} • {card.code}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {previewCards.length > 10 && (
                    <Text style={[styles.moreCards, { color: colors.textHint }]}>
                      ... and {previewCards.length - 10} more cards
                    </Text>
                  )}
                </ScrollView>

                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.backgroundMedium }]}
                    onPress={() => setShowPreview(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.importButton,
                      { backgroundColor: colors.accent },
                      isImporting && styles.buttonDisabled
                    ]}
                    onPress={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                      <CheckCircle size={20} color={colors.textPrimary} />
                    )}
                    <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                      {isImporting ? 'Importing...' : 'Import Cards'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {importResult && (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  {importResult.success ? (
                    <CheckCircle size={32} color={colors.success} />
                  ) : (
                    <AlertTriangle size={32} color={colors.error} />
                  )}
                  <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                    {importResult.success ? 'Import Completed' : 'Import Failed'}
                  </Text>
                </View>

                <View style={[styles.resultStats, { backgroundColor: colors.backgroundMedium }]}>
                  <Text style={[styles.resultStat, { color: colors.success }]}>
                    ✓ {importResult.imported} imported
                  </Text>
                  {importResult.skipped > 0 && (
                    <Text style={[styles.resultStat, { color: colors.warning }]}>
                      ⚠ {importResult.skipped} skipped (duplicates)
                    </Text>
                  )}
                  {importResult.errors.length > 0 && (
                    <Text style={[styles.resultStat, { color: colors.error }]}>
                      ✗ {importResult.errors.length} errors
                    </Text>
                  )}
                </View>

                {importResult.errors.length > 0 && (
                  <View style={styles.errorList}>
                    <Text style={[styles.errorTitle, { color: colors.error }]}>
                      Errors:
                    </Text>
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <Text key={index} style={[styles.errorText, { color: colors.textSecondary }]}>
                        • {error}
                      </Text>
                    ))}
                    {importResult.errors.length > 5 && (
                      <Text style={[styles.moreErrors, { color: colors.textHint }]}>
                        ... and {importResult.errors.length - 5} more errors
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: colors.accent }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    maxHeight: 550,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  exampleContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  previewList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: 12,
  },
  moreCards: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  resultStats: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  resultStat: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorList: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  moreErrors: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
});