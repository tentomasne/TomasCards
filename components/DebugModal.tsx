import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { X, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { DebugLog } from '@/utils/debugManager';

interface DebugModalProps {
  visible: boolean;
  log: DebugLog | null;
  onClose: () => void;
}

export default function DebugModal({ visible, log, onClose }: DebugModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!log) return null;

  const getIcon = () => {
    switch (log.level) {
      case 'error':
        return <AlertCircle size={24} color={colors.error} />;
      case 'warning':
        return <AlertTriangle size={24} color={colors.warning} />;
      case 'info':
        return <Info size={24} color={colors.accent} />;
    }
  };

  const getTitle = () => {
    switch (log.level) {
      case 'error':
        return t('debug.modal.error');
      case 'warning':
        return t('debug.modal.warning');
      case 'info':
        return t('debug.modal.info');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleCopyDetails = () => {
    const details = `
Debug Log Details:
Level: ${log.level.toUpperCase()}
Time: ${formatTimestamp(log.timestamp)}
Component: ${log.component || 'Unknown'}
Message: ${log.message}
${log.stack ? `Stack: ${log.stack}` : ''}
${log.extra ? `Extra: ${JSON.stringify(log.extra, null, 2)}` : ''}
    `.trim();

    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(details);
      alert('Debug details copied to clipboard');
    } else {
      Alert.alert(
        t('debug.modal.copyTitle'),
        t('debug.modal.copyMessage'),
        [
          { text: t('common.buttons.cancel'), style: 'cancel' },
          {
            text: t('debug.modal.copy'),
            onPress: () => {
              // On mobile, we could use expo-clipboard if needed
              console.log('Debug details:', details);
            },
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {getIcon()}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {getTitle()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('debug.modal.message')}
              </Text>
              <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                {log.message}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('debug.modal.details')}
              </Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>Time:</Text> {formatTimestamp(log.timestamp)}
              </Text>
              {log.component && (
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  <Text style={{ fontWeight: '600' }}>Component:</Text> {log.component}
                </Text>
              )}
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '600' }}>Level:</Text> {log.level.toUpperCase()}
              </Text>
            </View>

            {log.stack && (
              <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('debug.modal.stack')}
                </Text>
                <ScrollView horizontal style={styles.stackContainer}>
                  <Text style={[styles.stackText, { color: colors.textSecondary }]}>
                    {log.stack}
                  </Text>
                </ScrollView>
              </View>
            )}

            {log.extra && (
              <View style={[styles.section, { backgroundColor: colors.backgroundMedium }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('debug.modal.extra')}
                </Text>
                <ScrollView horizontal style={styles.stackContainer}>
                  <Text style={[styles.stackText, { color: colors.textSecondary }]}>
                    {JSON.stringify(log.extra, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={handleCopyDetails}
            >
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {t('debug.modal.copyDetails')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {t('common.buttons.close')}
              </Text>
            </TouchableOpacity>
          </View>
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
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
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
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  stackContainer: {
    maxHeight: 120,
  },
  stackText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});