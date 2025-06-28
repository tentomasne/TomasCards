import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowUpDown, WifiOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { LoyaltyCard } from "@/utils/types";
import { useTheme } from "@/hooks/useTheme";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { storageManager, SyncConflictData } from "@/utils/storageManager";
import { hasCompletedWelcome, markWelcomeCompleted } from "@/utils/storage";
import LoyaltyCardComponent from "@/components/LoyaltyCard";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import SyncStatusIndicator, {
  SyncStatus,
} from "@/components/SyncStatusIndicator";
import SyncConflictModal from "@/components/SyncConflictModal";
import WelcomeScreen from "@/components/WelcomeScreen";
import OfflineBanner from "@/components/OfflineBanner";

type SortType = "name" | "date" | "lastUsed";

interface LoadingState {
  initial: boolean;
  cloud: boolean;
  refresh: boolean;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    initial: true,
    cloud: false,
    refresh: false,
  });
  const [sortType, setSortType] = useState<SortType>("name");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncConflictData, setSyncConflictData] =
    useState<SyncConflictData | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [storageMode, setStorageMode] = useState<"local" | "cloud">("local");
  const [conflictResolving, setConflictResolving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<number>(0);

  // Single initialization effect
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // Initialize storage manager
        await storageManager.initialize();
        if (!isMounted) return;

        const currentStorageMode = storageManager.getStorageMode();
        setStorageMode(currentStorageMode);

        // Check welcome status
        const completed = await hasCompletedWelcome();
        if (!isMounted) return;

        if (!completed) {
          // Only show welcome if user hasn't completed it and has no cards
          const currentCards = await storageManager.loadLocalCards();
          if (!isMounted) return;

          if (currentCards.length === 0) {
            setShowWelcome(true);
            setLoading(prev => ({ ...prev, initial: false }));
            setIsInitialized(true);
            return;
          } else {
            // User has cards but hasn't marked welcome as completed (edge case)
            await markWelcomeCompleted();
          }
        }

        // Load cards with local-first strategy
        await loadCardsWithLocalFirst();
        if (!isMounted) return;

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing app:", error);
        if (isMounted) {
          setLoading(prev => ({ ...prev, initial: false }));
          setIsInitialized(true);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  // Update sync status when network or storage mode changes
  useEffect(() => {
    if (!isInitialized) return;

    if (storageMode === "local") {
      setSyncStatus("synced");
    } else if (!isOnline) {
      setSyncStatus("offline");
    } else {
      setSyncStatus("synced");
    }

    setPendingOperations(storageManager.getQueuedOperationsCount());
  }, [isOnline, storageMode, isInitialized]);

  // Local-first loading strategy
  const loadCardsWithLocalFirst = useCallback(async () => {
    try {
      // Step 1: Load local cards immediately for instant UI
      const localCards = await storageManager.loadLocalCards();
      setCards(localCards);
      setLoading(prev => ({ ...prev, initial: false }));

      // Step 2: If cloud mode and online, sync with cloud in background
      if (storageMode === "cloud" && isOnline) {
        setLoading(prev => ({ ...prev, cloud: true }));
        setSyncStatus("syncing");

        try {
          // Load from cloud
          const cloudCards = await storageManager.loadCloudCards();
          
          // Check if cloud data is different from local
          if (cloudCards.length > 0 && !arraysEqual(localCards, cloudCards)) {
            // Update local cache and UI with cloud data
            await storageManager.saveLocalCards(cloudCards);
            setCards(cloudCards);
            setLastCloudSync(Date.now());
          } else if (cloudCards.length === 0 && localCards.length > 0) {
            // Cloud is empty but local has data - this might be first sync
            // Don't automatically upload to prevent conflicts
          }

          // Process queued operations
          await storageManager.processQueuedOperations();
          setPendingOperations(storageManager.getQueuedOperationsCount());
          
          setSyncStatus("synced");
        } catch (cloudError) {
          console.error("Cloud sync failed:", cloudError);
          setSyncStatus("error");
          // Keep local cards displayed
        } finally {
          setLoading(prev => ({ ...prev, cloud: false }));
        }
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      setSyncStatus("error");
      setLoading(prev => ({ ...prev, initial: false, cloud: false }));
    }
  }, [storageMode, isOnline]);

  // Helper function to compare card arrays
  const arraysEqual = (a: LoyaltyCard[], b: LoyaltyCard[]): boolean => {
    if (a.length !== b.length) return false;
    
    const aIds = new Set(a.map(card => card.id));
    const bIds = new Set(b.map(card => card.id));
    
    return aIds.size === bIds.size && [...aIds].every(id => bIds.has(id));
  };

  // Manual cloud sync function
  const handleManualCloudSync = useCallback(async () => {
    if (storageMode !== "cloud") {
      Alert.alert(
        t("sync.error"),
        "Cloud sync is only available when using cloud storage mode.",
        [{ text: t("common.buttons.ok") }]
      );
      return;
    }

    if (!isOnline) {
      Alert.alert(
        t("storage.offline.title"),
        t("storage.offline.message"),
        [{ text: t("common.buttons.ok") }]
      );
      return;
    }

    setIsManualSyncing(true);
    setSyncStatus("syncing");

    try {
      // Force reload from cloud
      const cloudCards = await storageManager.loadCloudCards();
      
      if (cloudCards.length > 0) {
        // Update local cache with cloud data
        await storageManager.saveLocalCards(cloudCards);
        setCards(cloudCards);
        setLastCloudSync(Date.now());
        
        Alert.alert(
          t("sync.success.title"),
          t("sync.success.message", { count: cloudCards.length }),
          [{ text: t("common.buttons.ok") }]
        );
      } else {
        // Cloud is empty, ask if user wants to upload local cards
        const localCards = await storageManager.loadLocalCards();
        if (localCards.length > 0) {
          Alert.alert(
            t("sync.uploadLocal.title"),
            t("sync.uploadLocal.message", { count: localCards.length }),
            [
              { text: t("common.buttons.cancel"), style: "cancel" },
              {
                text: t("sync.uploadLocal.confirm"),
                onPress: async () => {
                  try {
                    await storageManager.syncLocalToCloud();
                    setLastCloudSync(Date.now());
                    Alert.alert(
                      t("sync.upload.success.title"),
                      t("sync.upload.success.message"),
                      [{ text: t("common.buttons.ok") }]
                    );
                  } catch (error) {
                    console.error("Failed to upload to cloud:", error);
                    Alert.alert(
                      t("sync.upload.error.title"),
                      t("sync.upload.error.message"),
                      [{ text: t("common.buttons.ok") }]
                    );
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert(
            t("sync.empty.title"),
            t("sync.empty.message"),
            [{ text: t("common.buttons.ok") }]
          );
        }
      }

      // Process any queued operations
      await storageManager.processQueuedOperations();
      setPendingOperations(storageManager.getQueuedOperationsCount());
      
      setSyncStatus("synced");
    } catch (error) {
      console.error("Manual sync failed:", error);
      setSyncStatus("error");
      Alert.alert(
        t("sync.error.title"),
        t("sync.error.message"),
        [{ text: t("common.buttons.ok") }]
      );
    } finally {
      setIsManualSyncing(false);
    }
  }, [storageMode, isOnline, t]);

  // Check for sync conflicts only when switching to cloud mode and after initial load
  useEffect(() => {
    if (!isInitialized || !isOnline || storageMode !== "cloud" || loading.initial || cards.length === 0) {
      return;
    }

    const checkSyncConflicts = async () => {
      try {
        const conflicts = await storageManager.checkForSyncConflicts();
        if (conflicts) {
          setSyncConflictData(conflicts);
          setShowConflictModal(true);
        }
      } catch (error) {
        console.error("Error checking sync conflicts:", error);
      }
    };

    // Add a small delay to ensure everything is loaded
    const timeoutId = setTimeout(checkSyncConflicts, 1000);
    return () => clearTimeout(timeoutId);
  }, [isInitialized, isOnline, storageMode, loading.initial, cards.length]);

  // Focus effect for when returning to screen - only reload if needed
  useFocusEffect(
    useCallback(() => {
      if (isInitialized && !showWelcome && !loading.initial) {
        // Only reload if we've been away for more than 30 seconds
        const timeSinceLastSync = Date.now() - lastCloudSync;
        
        if (timeSinceLastSync > 30000) {
          loadCardsWithLocalFirst();
        }
      }
    }, [loadCardsWithLocalFirst, isInitialized, showWelcome, loading.initial, lastCloudSync])
  );

  const onRefresh = async () => {
    setLoading(prev => ({ ...prev, refresh: true }));
    await loadCardsWithLocalFirst();
    setLoading(prev => ({ ...prev, refresh: false }));
  };

  const handleSyncConflictResolve = async (
    action: "replace_with_cloud" | "merge" | "keep_local"
  ) => {
    if (!syncConflictData) return;

    setConflictResolving(true);
    try {
      await storageManager.resolveSyncConflict(action, syncConflictData);
      setShowConflictModal(false);
      setSyncConflictData(null);
      await loadCardsWithLocalFirst();
    } catch (error) {
      console.error("Failed to resolve sync conflict:", error);
      Alert.alert(t("sync.conflict.error"), t("sync.conflict.errorMessage"));
    } finally {
      setConflictResolving(false);
    }
  };

  const handleWelcomeComplete = async (selectedMode?: "local" | "cloud") => {
    await markWelcomeCompleted();
    setShowWelcome(false);

    if (selectedMode) {
      await storageManager.setStorageMode(selectedMode);
      setStorageMode(selectedMode);
    }

    // Load cards after welcome is completed
    await loadCardsWithLocalFirst();
  };

  const sortCards = (cards: LoyaltyCard[]) => {
    switch (sortType) {
      case "name":
        return [...cards].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
      case "date":
        return [...cards].sort((a, b) => b.dateAdded - a.dateAdded);
      case "lastUsed":
        return [...cards].sort((a, b) => {
          if (!a.lastUsed) return 1;
          if (!b.lastUsed) return -1;
          return b.lastUsed - a.lastUsed;
        });
      default:
        return cards;
    }
  };

  const sortedCards = sortCards(cards);
  const favoriteCards = sortedCards.filter((card) => card.isFavorite);
  const otherCards = sortedCards.filter((card) => !card.isFavorite);

  const SortMenu = () => (
    <View
      style={[
        styles.sortMenu,
        !showSortMenu && styles.hidden,
        { backgroundColor: colors.backgroundMedium },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.sortOption,
          sortType === "name" && { backgroundColor: colors.backgroundLight },
        ]}
        onPress={() => {
          setSortType("name");
          setShowSortMenu(false);
        }}
      >
        <Text
          style={[
            styles.sortOptionText,
            { color: sortType === "name" ? colors.accent : colors.textPrimary },
          ]}
        >
          {t("cards.sort.name")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.sortOption,
          sortType === "date" && { backgroundColor: colors.backgroundLight },
        ]}
        onPress={() => {
          setSortType("date");
          setShowSortMenu(false);
        }}
      >
        <Text
          style={[
            styles.sortOptionText,
            { color: sortType === "date" ? colors.accent : colors.textPrimary },
          ]}
        >
          {t("cards.sort.date")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.sortOption,
          sortType === "lastUsed" && {
            backgroundColor: colors.backgroundLight,
          },
        ]}
        onPress={() => {
          setSortType("lastUsed");
          setShowSortMenu(false);
        }}
      >
        <Text
          style={[
            styles.sortOptionText,
            {
              color:
                sortType === "lastUsed" ? colors.accent : colors.textPrimary,
            },
          ]}
        >
          {t("cards.sort.lastUsed")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title: string, data: LoyaltyCard[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <LoyaltyCardComponent
              card={item}
              onPress={() => {
                // Check if user is offline and using cloud storage
                if (!isOnline && storageMode === "cloud") {
                  Alert.alert(
                    t("storage.offline.title"),
                    t("storage.offline.operationBlocked"),
                    [{ text: t("common.buttons.ok") }]
                  );
                  return;
                }
                router.push(`/card/${item.id}`);
              }}
            />
          )}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // Show welcome screen if needed
  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  if (loading.initial || !isInitialized) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("common.labels.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
    >
      <OfflineBanner visible={!isOnline && storageMode === "cloud"} />

      <Header
        title={t("cards.title")}
        showBack={false}
        leftElement={
          <TouchableOpacity
            onPress={handleManualCloudSync}
            disabled={isManualSyncing || storageMode === "local"}
            style={[
              styles.syncButton,
              (isManualSyncing || storageMode === "local") && styles.syncButtonDisabled
            ]}
          >
            <SyncStatusIndicator
              status={isManualSyncing ? "syncing" : syncStatus}
              pendingCount={pendingOperations}
              onRetry={loadCardsWithLocalFirst}
              compact
            />
          </TouchableOpacity>
        }
        rightElement={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: colors.backgroundMedium },
              ]}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Cloud Loading Indicator */}
      {loading.cloud && (
        <View style={[styles.cloudLoadingBanner, { backgroundColor: colors.backgroundMedium }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.cloudLoadingText, { color: colors.textSecondary }]}>
            {t("sync.status.syncing")}
          </Text>
        </View>
      )}

      <SortMenu />

      {cards.length === 0 ? (
        <EmptyState message={t("cards.empty")} />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {renderSection(t("cards.sections.favorites"), favoriteCards)}
              {renderSection(
                favoriteCards.length > 0
                  ? t("cards.sections.other")
                  : t("cards.sections.all"),
                otherCards
              )}
            </>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading.refresh}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <SyncConflictModal
        visible={showConflictModal}
        conflictData={syncConflictData}
        onResolve={handleSyncConflictResolve}
        loading={conflictResolving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  cloudLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  cloudLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 8,
    paddingBottom: 100, // Add space for tab bar
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  syncButton: {
    opacity: 1,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  sortMenu: {
    position: "absolute",
    top: 60,
    right: 16,
    borderRadius: 12,
    padding: 4,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  hidden: {
    display: "none",
  },
  sortOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  sortOptionText: {
    fontSize: 16,
  },
});