import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Cloud, Smartphone, Merge, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { SyncConflictData, SyncAction } from '@/utils/storageManager';

interface SyncConflictModalProps {
  visible: boolean;
  conflictData: SyncConflictData | null;
  onResolve: (action: SyncAction) => void;
  loading?: boolean;
}

export default function SyncConflictModal({
  visible,
  conflictData,
  onResolve,
  loading = false,
}: SyncConflictModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!conflictData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <View style={styles.header}>
            <AlertTriangle size={32} color={colors.warning} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('sync.conflict.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('sync.conflict.subtitle')}
            </Text>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.dataPreview}>
              <View style={[styles.dataCard, { backgroundColor: colors.backgroundMedium }]}>
                <View style={styles.dataHeader}>
                  <Smartphone size={24} color={colors.textSecondary} />
                  <Text style={[styles.dataTitle, { color: colors.textPrimary }]}>
                    {t('sync.conflict.localData')}
                  </Text>
                </View>
                <Text style={[styles.dataCount, { color: colors.textSecondary }]}>
                  {t('sync.conflict.cardCount', { count: conflictData.localCount })}
                </Text>
              </View>

              <View style={[styles.dataCard, { backgroundColor: colors.backgroundMedium }]}>
                <View style={styles.dataHeader}>
                  <Cloud size={24} color={colors.textSecondary} />
                  <Text style={[styles.dataTitle, { color: colors.textPrimary }]}>
                    {t('sync.conflict.cloudData')}
                  </Text>
                </View>
                <Text style={[styles.dataCount, { color: colors.textSecondary }]}>
                  {t('sync.conflict.cardCount', { count: conflictData.cloudCount })}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundMedium }]}
                onPress={() => onResolve('replace_with_cloud')}
                disabled={loading}
                >
                <Cloud size={20} color={colors.textPrimary} />
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {t('sync.conflict.replaceWithCloud')}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  {t('sync.conflict.replaceWithCloudDesc')}
                  </Text>
                </View>
                <View style={[styles.recommendedBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.recommendedText, { color: colors.textPrimary }]}>
                  {t('sync.conflict.recommended')}
                  </Text>
                </View>
                </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundMedium }]}
                onPress={() => onResolve('merge')}
                disabled={loading}
              >
                <Merge size={20} color={colors.textPrimary} />
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                    {t('sync.conflict.merge')}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {t('sync.conflict.mergeDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.backgroundMedium }]}
                onPress={() => onResolve('keep_local')}
                disabled={loading}
              >
                <Smartphone size={20} color={colors.textPrimary} />
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                    {t('sync.conflict.keepLocal')}
                  </Text>
                  <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {t('sync.conflict.keepLocalDesc')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
                {t('sync.conflict.resolving')}
              </Text>
            </View>
          )}
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
    borderRadius: 16,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  dataPreview: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  dataCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dataCount: {
    fontSize: 14,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});