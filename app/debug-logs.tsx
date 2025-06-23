import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Trash2, CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, Info, Copy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { debugManager, DebugLog } from '@/utils/debugManager';
import Header from '@/components/Header';

export default function DebugLogsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = () => {
    if (filter === 'all') {
      setLogs(debugManager.getLogs());
    } else {
      setLogs(debugManager.getLogsByLevel(filter));
    }
  };

  const handleClearLogs = () => {
    const confirmClear = async () => {
      await debugManager.clearLogs();
      setLogs([]);
    };

    if (Platform.OS === 'web') {
      if (confirm(t('debug.logs.clearConfirm'))) {
        confirmClear();
      }
    } else {
      Alert.alert(
        t('debug.logs.clearTitle'),
        t('debug.logs.clearConfirm'),
        [
          { text: t('common.buttons.cancel'), style: 'cancel' },
          { text: t('debug.logs.clear'), onPress: confirmClear, style: 'destructive' },
        ]
      );
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={16} color={colors.error} />;
      case 'warning':
        return <AlertTriangle size={16} color={colors.warning} />;
      case 'info':
        return <Info size={16} color={colors.accent} />;
      default:
        return <Info size={16} color={colors.textSecondary} />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleCopyLog = (log: DebugLog) => {
    const logText = `[${log.level.toUpperCase()}] ${formatTimestamp(log.timestamp)}
Component: ${log.component || 'Unknown'}
Message: ${log.message}
${log.stack ? `Stack: ${log.stack}` : ''}`;

    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(logText);
      alert('Log copied to clipboard');
    } else {
      console.log('Log details:', logText);
      Alert.alert(t('debug.logs.copied'), logText);
    }
  };

  const renderLogItem = ({ item }: { item: DebugLog }) => (
    <TouchableOpacity
      style={[styles.logItem, { backgroundColor: colors.backgroundMedium }]}
      onPress={() => handleCopyLog(item)}
    >
      <View style={styles.logHeader}>
        <View style={styles.logTitleContainer}>
          {getLogIcon(item.level)}
          <Text style={[styles.logLevel, { color: colors.textPrimary }]}>
            {item.level.toUpperCase()}
          </Text>
          {item.component && (
            <Text style={[styles.logComponent, { color: colors.textSecondary }]}>
              {item.component}
            </Text>
          )}
        </View>
        <Text style={[styles.logTime, { color: colors.textHint }]}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      <Text style={[styles.logMessage, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.message}
      </Text>
      {item.stack && (
        <Text style={[styles.logStack, { color: colors.textHint }]} numberOfLines={2}>
          {item.stack}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: colors.backgroundMedium },
        filter === filterType && { backgroundColor: colors.accent }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        { color: filter === filterType ? colors.textPrimary : colors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const logCounts = debugManager.getLogCount();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title={t('debug.logs.title')}
        showBack={true}
        rightElement={
          <TouchableOpacity onPress={handleClearLogs} style={styles.clearButton}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        }
      />

      <View style={styles.stats}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {t('debug.logs.total', { count: logCounts.total })} • 
          {t('debug.logs.errors', { count: logCounts.errors })} • 
          {t('debug.logs.warnings', { count: logCounts.warnings })} • 
          {t('debug.logs.info', { count: logCounts.info })}
        </Text>
      </View>

      <View style={styles.filters}>
        {renderFilterButton('all', t('debug.logs.all'))}
        {renderFilterButton('error', t('debug.logs.errorsOnly'))}
        {renderFilterButton('warning', t('debug.logs.warningsOnly'))}
        {renderFilterButton('info', t('debug.logs.infoOnly'))}
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('debug.logs.empty')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
  stats: {
    padding: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  logItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: '700',
  },
  logComponent: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  logTime: {
    fontSize: 12,
  },
  logMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  logStack: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});