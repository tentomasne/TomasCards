import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
  onRetry?: () => void;
  compact?: boolean;
}

export default function SyncStatusIndicator({
  status,
  pendingCount = 0,
  onRetry,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <Cloud size={compact ? 16 : 20} color={colors.success} />,
          text: t('sync.status.synced'),
          color: colors.success,
        };
      case 'syncing':
        return {
          icon: <RefreshCw size={compact ? 16 : 20} color={colors.accent} />,
          text: t('sync.status.syncing'),
          color: colors.accent,
        };
      case 'offline':
        return {
          icon: <CloudOff size={compact ? 16 : 20} color={colors.textSecondary} />,
          text: t('sync.status.offline'),
          color: colors.textSecondary,
        };
      case 'error':
        return {
          icon: <AlertCircle size={compact ? 16 : 20} color={colors.error} />,
          text: t('sync.status.error'),
          color: colors.error,
        };
      case 'pending':
        return {
          icon: <RefreshCw size={compact ? 16 : 20} color={colors.warning} />,
          text: t('sync.status.pending', { count: pendingCount }),
          color: colors.warning,
        };
      default:
        return {
          icon: <Cloud size={compact ? 16 : 20} color={colors.textSecondary} />,
          text: '',
          color: colors.textSecondary,
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.backgroundMedium }]}>
        {config.icon}
        {pendingCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.warning }]}>
            <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
              {pendingCount}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundMedium }]}
      onPress={status === 'error' ? onRetry : undefined}
      disabled={status !== 'error'}
    >
      {config.icon}
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
      {status === 'error' && onRetry && (
        <Text style={[styles.retryText, { color: colors.accent }]}>
          {t('sync.status.tapToRetry')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  compactContainer: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 12,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});