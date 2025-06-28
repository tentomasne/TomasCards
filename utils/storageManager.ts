import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CloudStorage, 
  CloudStorageProvider, 
  CloudStorageScope,
  CloudStorageError,
  CloudStorageErrorCode,
  useIsCloudAvailable
} from 'react-native-cloud-storage';
import { LoyaltyCard } from './types';
import { logError, logWarning, logInfo } from '@/utils/debugManager';

export type StorageMode = 'local' | 'cloud';
export type SyncAction = 'replace_with_cloud' | 'merge' | 'keep_local';

export interface SyncConflictData {
  localCards: LoyaltyCard[];
  cloudCards: LoyaltyCard[];
  localCount: number;
  cloudCount: number;
}

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'favorite';
  card?: LoyaltyCard;
  cardId?: string;
  isFavorite?: boolean;
  timestamp: number;
}

const STORAGE_MODE_KEY = 'storage_mode';
const QUEUED_OPERATIONS_KEY = 'queued_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const STORAGE_PROVIDER_KEY = 'cloud_storage_provider';
const GOOGLE_TOKEN_KEY = 'google_drive_token';

// Cloud file paths
const CARDS_FILE = 'loyalty_cards.json';

export class StorageManager {
  private static instance: StorageManager;
  private storageMode: StorageMode = 'local';
  private queuedOperations: QueuedOperation[] = [];
  private isInitialized = false;
  private loadingPromise: Promise<LoyaltyCard[]> | null = null;
  private provider = CloudStorage.getDefaultProvider();
  private accessToken: string | null = null;
  private cloudStorage: CloudStorage;
  private isLoadingFromCloud = false; // Prevent recursive loading

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  constructor() {
    // Initialize CloudStorage instance with default provider
    this.cloudStorage = new CloudStorage(
      this.provider,
      this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
    );
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      logInfo('Initializing storage manager', '', 'StorageManager');
      
      const mode = await AsyncStorage.getItem(STORAGE_MODE_KEY);
      this.storageMode = (mode as StorageMode) || 'local';
      logInfo('Storage mode loaded', this.storageMode, 'StorageManager');
      
      const queuedOps = await AsyncStorage.getItem(QUEUED_OPERATIONS_KEY);
      this.queuedOperations = queuedOps ? JSON.parse(queuedOps) : [];
      logInfo('Queued operations loaded', `${this.queuedOperations.length} operations`, 'StorageManager');

      const storedProvider = await AsyncStorage.getItem(STORAGE_PROVIDER_KEY);
      if (storedProvider === CloudStorageProvider.ICloud || storedProvider === CloudStorageProvider.GoogleDrive) {
        this.provider = storedProvider;
        logInfo('Cloud provider loaded', this.provider, 'StorageManager');
        
        // Recreate CloudStorage instance with the correct provider
        this.cloudStorage = new CloudStorage(
          this.provider,
          this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
        );
      }
      
      const token = await AsyncStorage.getItem(GOOGLE_TOKEN_KEY);
      if (token) {
        this.accessToken = token;
        logInfo('Google Drive token loaded', 'Token present', 'StorageManager');
      }

      // Configure cloud storage if we have the necessary credentials
      await this.configureCloudStorage();

      this.isInitialized = true;
      logInfo('Storage manager initialized successfully', '', 'StorageManager');
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      logError('Failed to initialize storage manager', error instanceof Error ? error.message : String(error), 'StorageManager');
      this.isInitialized = true;
    }
  }

  private async configureCloudStorage(): Promise<void> {
    try {
      if (this.provider === CloudStorageProvider.GoogleDrive && this.accessToken) {
        // Set the access token for Google Drive with proper scope
        this.cloudStorage.setProviderOptions({ 
          accessToken: this.accessToken,
          scope: CloudStorageScope.AppData 
        });
        logInfo('Google Drive provider configured', `Has token: ${!!this.accessToken}`, 'StorageManager');
      } else if (this.provider === CloudStorageProvider.ICloud) {
        // Set scope for iCloud
        this.cloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
        logInfo('iCloud provider configured', '', 'StorageManager');
      } else {
        logWarning('Cloud storage not configured', `Provider: ${this.provider}, Has token: ${!!this.accessToken}`, 'StorageManager');
      }
    } catch (error) {
      console.error('Failed to configure cloud storage:', error);
      logError('Failed to configure cloud storage', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  async setStorageMode(mode: StorageMode): Promise<void> {
    const previousMode = this.storageMode;
    this.storageMode = mode;
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
    logInfo('Storage mode changed', `${previousMode} -> ${mode}`, 'StorageManager');

    // If switching from local to cloud, clear local cards
    if (previousMode === 'local' && mode === 'cloud') {
      await this.clearLocalCards();
      logInfo('Local cards cleared due to mode switch', '', 'StorageManager');
    }
    
    // Clear any pending loading promise when mode changes
    this.loadingPromise = null;
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  getProvider(): CloudStorageProvider {
    return this.provider;
  }

  async setProvider(provider: CloudStorageProvider): Promise<void> {
    this.provider = provider;
    await AsyncStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    
    // Recreate CloudStorage instance with new provider
    this.cloudStorage = new CloudStorage(
      this.provider,
      this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
    );
    
    await this.configureCloudStorage();
    logInfo('Cloud provider set', provider, 'StorageManager');
  }

  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
    await AsyncStorage.setItem(GOOGLE_TOKEN_KEY, token);
    await this.configureCloudStorage();
    logInfo('Google Drive access token set', 'Token updated', 'StorageManager');
  }

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  private async cloudAccessible(): Promise<boolean> {
    try {
      // For Google Drive, we need an access token
      if (this.provider === CloudStorageProvider.GoogleDrive && !this.accessToken) {
        logWarning('Google Drive not accessible - no access token', '', 'StorageManager');
        return false;
      }

      // Test cloud accessibility by trying to check if our cards file exists
      // This is a safer test than listing directories
      try {
        const exists = await this.cloudStorage.exists(CARDS_FILE);
        logInfo('Cloud accessibility test successful', `File exists: ${exists}`, 'StorageManager');
        return true;
      } catch (testError) {
        if (testError instanceof CloudStorageError && testError.code === CloudStorageErrorCode.FILE_NOT_FOUND) {
          logInfo('Cloud accessible - file not found is expected for new accounts', '', 'StorageManager');
          return true;
        }
        
        logError('Cloud accessibility test failed', testError instanceof Error ? testError.message : String(testError), 'StorageManager');
        return false;
      }
    } catch (error) {
      console.error('Failed to check cloud availability:', error);
      logError('Failed to check cloud availability', error instanceof Error ? error.message : String(error), 'StorageManager');
      return false;
    }
  }

  // Local storage operations
  async loadLocalCards(): Promise<LoyaltyCard[]> {
    try {
      const jsonValue = await AsyncStorage.getItem('loyalty_cards');
      const cards = jsonValue ? JSON.parse(jsonValue) : [];
      logInfo('Local cards loaded', `${cards.length} cards`, 'StorageManager');
      return cards;
    } catch (error) {
      console.error('Failed to load local cards:', error);
      logError('Failed to load local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
      return [];
    }
  }

  async saveLocalCards(cards: LoyaltyCard[]): Promise<void> {
    try {
      await AsyncStorage.setItem('loyalty_cards', JSON.stringify(cards));
      logInfo('Local cards saved', `${cards.length} cards`, 'StorageManager');
    } catch (error) {
      console.error('Failed to save local cards:', error);
      logError('Failed to save local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  async clearLocalCards(): Promise<void> {
    try {
      await AsyncStorage.removeItem('loyalty_cards');
      logInfo('Local cards cleared', '', 'StorageManager');
    } catch (error) {
      console.error('Failed to clear local cards:', error);
      logError('Failed to clear local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  // Cloud storage operations using react-native-cloud-storage
  async loadCloudCards(): Promise<LoyaltyCard[]> {
    try {
      if (!(await this.cloudAccessible())) {
        logWarning('Cloud not accessible for loading cards', '', 'StorageManager');
        return [];
      }

      const exists = await this.cloudStorage.exists(CARDS_FILE);
      if (!exists) {
        logInfo('Cloud cards file does not exist', '', 'StorageManager');
        return [];
      }

      const content = await this.cloudStorage.readFile(CARDS_FILE);
      const cards = JSON.parse(content) as LoyaltyCard[];
      logInfo('Cloud cards loaded', `${cards.length} cards`, 'StorageManager');
      return cards;
    } catch (error) {
      if (error instanceof CloudStorageError && error.code === CloudStorageErrorCode.FILE_NOT_FOUND) {
        logInfo('Cloud cards file not found', '', 'StorageManager');
        return [];
      }
      console.error('Failed to load cloud cards:', error);
      logError('Failed to load cloud cards', error instanceof Error ? error.message : String(error), 'StorageManager');
      return [];
    }
  }

  async saveCloudCards(cards: LoyaltyCard[]): Promise<void> {
    try {
      if (!(await this.cloudAccessible())) {
        logError('Cloud not accessible for saving cards', 'Cloud unavailable', 'StorageManager');
        throw new Error('cloud_unavailable');
      }
      
      await this.cloudStorage.writeFile(CARDS_FILE, JSON.stringify(cards));
      logInfo('Cards saved to cloud', `${cards.length} cards`, 'StorageManager');
    } catch (error) {
      console.error('Failed to save cloud cards:', error);
      logError('Failed to save cloud cards', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async saveCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    try {
      const cards = await this.loadCloudCards();
      cards.push(card);
      await this.saveCloudCards(cards);
      logInfo('Card saved to cloud', `Card ID: ${card.id}`, 'StorageManager');
      return card;
    } catch (error) {
      console.error('Failed to save cloud card:', error);
      logError('Failed to save cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async updateCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    try {
      const cards = await this.loadCloudCards();
      const index = cards.findIndex(c => c.id === card.id);
      if (index !== -1) {
        cards[index] = card;
        await this.saveCloudCards(cards);
        logInfo('Card updated in cloud', `Card ID: ${card.id}`, 'StorageManager');
      } else {
        logWarning('Card not found for update in cloud', `Card ID: ${card.id}`, 'StorageManager');
      }
      return card;
    } catch (error) {
      console.error('Failed to update cloud card:', error);
      logError('Failed to update cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async toggleCloudCardFavorite(cardId: string, isFavorite: boolean): Promise<LoyaltyCard> {
    try {
      const cards = await this.loadCloudCards();
      const index = cards.findIndex(c => c.id === cardId);
      if (index !== -1) {
        cards[index].isFavorite = isFavorite;
        await this.saveCloudCards(cards);
        logInfo('Card favorite toggled in cloud', `Card ID: ${cardId}, Favorite: ${isFavorite}`, 'StorageManager');
        return cards[index];
      }
      logError('Card not found for favorite toggle', `Card ID: ${cardId}`, 'StorageManager');
      throw new Error('Card not found');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      logError('Failed to toggle favorite', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async deleteCloudCard(cardId: string): Promise<void> {
    try {
      const cards = await this.loadCloudCards();
      const filtered = cards.filter(c => c.id !== cardId);
      await this.saveCloudCards(filtered);
      logInfo('Card deleted from cloud', `Card ID: ${cardId}`, 'StorageManager');
    } catch (error) {
      console.error('Failed to delete cloud card:', error);
      logError('Failed to delete cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  // Queue operations for offline sync
  async queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): Promise<void> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    this.queuedOperations.push(queuedOp);
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
    logInfo('Operation queued', `Type: ${operation.type}, Queue size: ${this.queuedOperations.length}`, 'StorageManager');
  }

  async processQueuedOperations(): Promise<void> {
    if (this.queuedOperations.length === 0) return;
    if (!(await this.cloudAccessible())) {
      logWarning('Cannot process queued operations - cloud not accessible', '', 'StorageManager');
      return;
    }

    logInfo('Processing queued operations', `${this.queuedOperations.length} operations`, 'StorageManager');
    const processedOperations: string[] = [];

    for (const operation of this.queuedOperations) {
      try {
        logInfo('Processing queued operation', `Type: ${operation.type}, ID: ${operation.id}`, 'StorageManager');
        
        switch (operation.type) {
          case 'create':
            if (operation.card) {
              await this.saveCloudCard(operation.card);
            }
            break;
          case 'update':
            if (operation.card) {
              await this.updateCloudCard(operation.card);
            }
            break;
          case 'favorite':
            if (operation.cardId && operation.isFavorite !== undefined) {
              await this.toggleCloudCardFavorite(operation.cardId, operation.isFavorite);
            }
            break;
          case 'delete':
            if (operation.cardId) {
              await this.deleteCloudCard(operation.cardId);
            }
            break;
        }
        processedOperations.push(operation.id);
        logInfo('Queued operation processed successfully', `ID: ${operation.id}`, 'StorageManager');
      } catch (error) {
        console.error(`Failed to process queued operation ${operation.id}:`, error);
        logError(`Failed to process queued operation ${operation.id}`, error instanceof Error ? error.message : String(error), 'StorageManager');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Remove successfully processed operations
    this.queuedOperations = this.queuedOperations.filter(
      op => !processedOperations.includes(op.id)
    );
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
    logInfo('Queued operations cleanup completed', `Processed: ${processedOperations.length}, Remaining: ${this.queuedOperations.length}`, 'StorageManager');
  }

  // Unified card operations
  async loadCards(): Promise<LoyaltyCard[]> {
    // Prevent multiple simultaneous loads
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this._loadCardsInternal();
    
    try {
      const result = await this.loadingPromise;
      return result;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadCardsInternal(): Promise<LoyaltyCard[]> {
    logInfo('Loading cards', `Mode: ${this.storageMode}`, 'StorageManager');
    
    // Always load from local storage first
    const localCards = await this.loadLocalCards();
    
    // If local mode, just return local cards
    if (this.storageMode === 'local') {
      return localCards;
    }

    // Cloud mode - try to sync from cloud
    try {
      // Prevent recursive loading when we're already loading from cloud
      if (this.isLoadingFromCloud) {
        logInfo('Already loading from cloud, returning local cards', `${localCards.length} cards`, 'StorageManager');
        return localCards;
      }

      this.isLoadingFromCloud = true;
      const cloudCards = await this.loadCloudCards();
      
      // If cloud has data, use it and update local cache
      if (cloudCards.length > 0) {
        await this.saveLocalCards(cloudCards);
        logInfo('Cards loaded from cloud and cached locally', `${cloudCards.length} cards`, 'StorageManager');
        return cloudCards;
      } 
      
      // Cloud is empty
      if (localCards.length > 0) {
        // Local has data but cloud is empty - this might be first sync
        // Don't automatically upload here to prevent loops
        logInfo('Cloud is empty, local has data - keeping local for now', `${localCards.length} cards`, 'StorageManager');
        return localCards;
      } else {
        // Both are empty
        logInfo('Both cloud and local storage are empty', '', 'StorageManager');
        return [];
      }
    } catch (error) {
      console.error('Failed to load cloud cards, using local cache:', error);
      logError('Failed to load cloud cards', error instanceof Error ? error.message : String(error), 'StorageManager');
      logInfo('Falling back to local cards', `${localCards.length} cards`, 'StorageManager');
      return localCards;
    } finally {
      this.isLoadingFromCloud = false;
    }
  }

  // Method to manually sync local cards to cloud (called explicitly when needed)
  async syncLocalToCloud(): Promise<void> {
    if (this.storageMode !== 'cloud') return;
    
    try {
      const localCards = await this.loadLocalCards();
      if (localCards.length > 0) {
        await this.saveCloudCards(localCards);
        logInfo('Local cards synced to cloud', `${localCards.length} cards`, 'StorageManager');
      }
    } catch (error) {
      logError('Failed to sync local cards to cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async saveCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    logInfo('Saving card', `ID: ${card.id}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always save locally first
    const localCards = await this.loadLocalCards();
    localCards.push(card);
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          await this.saveCloudCard(card);
          logInfo('Card saved to cloud successfully', `ID: ${card.id}`, 'StorageManager');
          return card;
        } catch (error) {
          console.error('Failed to save to cloud, queuing operation:', error);
          logError('Failed to save to cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'create', card });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'create', card });
        logInfo('Card save queued for later sync', `ID: ${card.id}`, 'StorageManager');
      }
    }

    return card;
  }

  async updateCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    logInfo('Updating card', `ID: ${card.id}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always update locally first
    const localCards = await this.loadLocalCards();
    const index = localCards.findIndex(c => c.id === card.id);
    if (index !== -1) {
      localCards[index] = card;
      await this.saveLocalCards(localCards);
    }

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          await this.updateCloudCard(card);
          logInfo('Card updated in cloud successfully', `ID: ${card.id}`, 'StorageManager');
          return card;
        } catch (error) {
          console.error('Failed to update cloud card, queuing operation:', error);
          logError('Failed to update cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'update', card });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'update', card });
        logInfo('Card update queued for later sync', `ID: ${card.id}`, 'StorageManager');
      }
    }

    return card;
  }

  async toggleFavorite(cardId: string, isFavorite: boolean, isOnline: boolean = true): Promise<LoyaltyCard | null> {
    logInfo('Toggling favorite', `ID: ${cardId}, Favorite: ${isFavorite}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always update locally first
    const localCards = await this.loadLocalCards();
    const index = localCards.findIndex(c => c.id === cardId);
    if (index === -1) {
      logWarning('Card not found for favorite toggle', `ID: ${cardId}`, 'StorageManager');
      return null;
    }

    localCards[index].isFavorite = isFavorite;
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          await this.toggleCloudCardFavorite(cardId, isFavorite);
          logInfo('Card favorite toggled in cloud successfully', `ID: ${cardId}`, 'StorageManager');
          return localCards[index];
        } catch (error) {
          console.error('Failed to toggle favorite in cloud, queuing operation:', error);
          logError('Failed to toggle favorite in cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'favorite', cardId, isFavorite });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'favorite', cardId, isFavorite });
        logInfo('Favorite toggle queued for later sync', `ID: ${cardId}`, 'StorageManager');
      }
    }

    return localCards[index];
  }

  async deleteCard(cardId: string, isOnline: boolean = true): Promise<void> {
    logInfo('Deleting card', `ID: ${cardId}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always delete locally first
    const localCards = await this.loadLocalCards();
    const filteredCards = localCards.filter(c => c.id !== cardId);
    await this.saveLocalCards(filteredCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          await this.deleteCloudCard(cardId);
          logInfo('Card deleted from cloud successfully', `ID: ${cardId}`, 'StorageManager');
        } catch (error) {
          console.error('Failed to delete cloud card, queuing operation:', error);
          logError('Failed to delete cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'delete', cardId });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'delete', cardId });
        logInfo('Card deletion queued for later sync', `ID: ${cardId}`, 'StorageManager');
      }
    }
  }

  // Sync conflict resolution
  async checkForSyncConflicts(): Promise<SyncConflictData | null> {
    if (this.storageMode === 'local') return null;
    
    try {
      logInfo('Checking for sync conflicts', '', 'StorageManager');
      const localCards = await this.loadLocalCards();
      const cloudCards = await this.loadCloudCards();

      if (localCards.length === 0) {
        logInfo('No sync conflicts - no local data', '', 'StorageManager');
        return null; // No conflict if no local data
      }

      // Check if there are meaningful differences
      const hasConflicts = localCards.length !== cloudCards.length ||
        !this.arraysEqual(localCards, cloudCards);

      if (!hasConflicts) {
        logInfo('No sync conflicts detected', '', 'StorageManager');
        return null;
      }

      logInfo('Sync conflicts detected', `Local: ${localCards.length}, Cloud: ${cloudCards.length}`, 'StorageManager');
      return {
        localCards,
        cloudCards,
        localCount: localCards.length,
        cloudCount: cloudCards.length,
      };
    } catch (error) {
      console.error('Failed to check sync conflicts:', error);
      logError('Failed to check sync conflicts', error instanceof Error ? error.message : String(error), 'StorageManager');
      return null;
    }
  }

  private arraysEqual(a: LoyaltyCard[], b: LoyaltyCard[]): boolean {
    if (a.length !== b.length) return false;
    
    const aIds = new Set(a.map(card => card.id));
    const bIds = new Set(b.map(card => card.id));
    
    return aIds.size === bIds.size && [...aIds].every(id => bIds.has(id));
  }

  async resolveSyncConflict(action: SyncAction, conflictData: SyncConflictData): Promise<void> {
    logInfo('Resolving sync conflict', `Action: ${action}`, 'StorageManager');
    
    switch (action) {
      case 'replace_with_cloud':
        await this.saveLocalCards(conflictData.cloudCards);
        logInfo('Sync conflict resolved - replaced with cloud data', '', 'StorageManager');
        break;
      
      case 'merge':
        const mergedCards = this.mergeCards(conflictData.localCards, conflictData.cloudCards);
        await this.saveLocalCards(mergedCards);
        // Upload merged cards to cloud
        await this.saveCloudCards(mergedCards);
        logInfo('Sync conflict resolved - data merged', `${mergedCards.length} total cards`, 'StorageManager');
        break;
      
      case 'keep_local':
        // Upload all local cards to cloud
        await this.saveCloudCards(conflictData.localCards);
        logInfo('Sync conflict resolved - kept local data', '', 'StorageManager');
        break;
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }

  private mergeCards(localCards: LoyaltyCard[], cloudCards: LoyaltyCard[]): LoyaltyCard[] {
    const merged = [...cloudCards];
    
    for (const localCard of localCards) {
      const existsInCloud = cloudCards.some(cloudCard => 
        cloudCard.code === localCard.code || cloudCard.id === localCard.id
      );
      
      if (!existsInCloud) {
        merged.push(localCard);
      }
    }
    
    return merged;
  }

  getQueuedOperationsCount(): number {
    return this.queuedOperations.length;
  }

  async clearQueue(): Promise<void> {
    this.queuedOperations = [];
    await AsyncStorage.removeItem(QUEUED_OPERATIONS_KEY);
    logInfo('Queued operations cleared', '', 'StorageManager');
  }
}

export const storageManager = StorageManager.getInstance();