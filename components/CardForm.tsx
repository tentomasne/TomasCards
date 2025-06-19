import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Circle as XCircle, Save } from 'lucide-react-native';
import { LoyaltyCard } from '@/utils/types';
import { successHaptic, lightHaptic } from '@/utils/feedback';
import { useTheme } from '@/hooks/useTheme';

interface CardFormProps {
  existingCard?: LoyaltyCard;
  onSave: (card: LoyaltyCard) => Promise<void>;
  onScanPress?: () => void;
  onCancel?: () => void;
}

const CardForm: React.FC<CardFormProps> = ({ 
  existingCard, 
  onSave,
  onScanPress,
  onCancel
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(existingCard?.code || '');
  const [notes, setNotes] = useState(existingCard?.notes || '');

  const handleSubmit = async () => {
    if (!code.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const trimmedCode = code.trim();
      const trimmedNotes = notes.trim();

      let cardToSave: LoyaltyCard;

      if (existingCard) {
        cardToSave = {
          ...existingCard,
          code: trimmedCode,
          notes: trimmedNotes,
        };
        await onSave(cardToSave);
      } 

      if (Platform.OS !== 'web') {
        await successHaptic();
      }
    } catch (error) {
      console.error('Error saving card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = async () => {
    if (Platform.OS !== 'web') {
      await lightHaptic();
    }
    if (Platform.OS !== 'web' && onScanPress) {
      onScanPress();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.backgroundDark }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Card Code</Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={[styles.codeInput, { 
                backgroundColor: colors.backgroundMedium,
                color: colors.textPrimary
              }]}
              value={code}
              onChangeText={setCode}
              placeholder="Enter card number or scan"
              placeholderTextColor={colors.textHint}
              keyboardType="default"
            />
            {onScanPress && (
              <TouchableOpacity onPress={handleScanPress} style={{ marginLeft: 8 }}>
                <XCircle size={24} color={colors.textHint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput, {
              backgroundColor: colors.backgroundMedium,
              color: colors.textPrimary
            }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional information"
            placeholderTextColor={colors.textHint}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.actions}>
          {onCancel && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.backgroundMedium }
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!code.trim() || loading) && styles.saveButtonDisabled,
              { backgroundColor: colors.accent }
            ]}
            onPress={handleSubmit}
            disabled={!code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Save size={20} color={colors.textPrimary} />
                <Text style={[styles.saveButtonText, { color: colors.textPrimary }]}>
                  {existingCard ? 'Update Card' : 'Save Card'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 2,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default CardForm;
