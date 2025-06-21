import AsyncStorage from '@react-native-async-storage/async-storage';
import { CloudStorage } from 'react-native-cloud-storage';
import { LoyaltyCard } from './types';

// Directory in iCloud where the loyalty cards file is stored
// Prefix with '/' so the path is resolved from the container root
const CLOUD_DIR = '/cards';
const CARDS_FILE = `${CLOUD_DIR}/loyalty_cards.json`;

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

export class StorageManager {
  private static instance: StorageManager;
  private storageMode: StorageMode = 'local'; // Default to cloud
  private queuedOperations: QueuedOperation[] = [];
  private isInitialized = false;
  private loadingPromise: Promise<LoyaltyCard[]> | null = null;

  /**
   * Ensures that the cloud directory used to store cards exists.
   */
  private async ensureCloudDirectory(): Promise<void> {
    try {
      if (!(await this.cloudAccessible())) return;

      const segments = CLOUD_DIR.replace(/^\//, '').split('/');
      let currentPath = '';

      for (const segment of segments) {
        currentPath += `/${segment}`;
        try {
          const exists = await CloudStorage.exists(currentPath);
          if (!exists) {
            await CloudStorage.mkdir(currentPath);
          }
        } catch (error: any) {
          if (error.code !== 'ERR_FILE_EXISTS') {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Failed to ensure cloud directory:', error);
    }
  }

  private async cloudAccessible(): Promise<boolean> {
    try {
      return await CloudStorage.isCloudAvailable();
    } catch (error) {
      console.error('Failed to check cloud availability:', error);
      return false;
    }
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const mode = await AsyncStorage.getItem(STORAGE_MODE_KEY);
      this.storageMode = (mode as StorageMode) || 'cloud'; // Default to cloud
      
      const queuedOps = await AsyncStorage.getItem(QUEUED_OPERATIONS_KEY);
      this.queuedOperations = queuedOps ? JSON.parse(queuedOps) : [];
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      this.isInitialized = true;
    }
  }

  async setStorageMode(mode: StorageMode): Promise<void> {
    const previousMode = this.storageMode;
    this.storageMode = mode;
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);

    // If switching from local to cloud, clear local cards
    if (previousMode === 'local' && mode === 'cloud') {
      await this.clearLocalCards();
    }
    
    // Clear any pending loading promise when mode changes
    this.loadingPromise = null;
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }


  // Local storage operations - always available
  async loadLocalCards(): Promise<LoyaltyCard[]> {
    try {
      const jsonValue = await AsyncStorage.getItem('loyalty_cards');
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Failed to load local cards:', error);
      return [];
    }
  }

  async getCardsFromCloud() {
    try {
      if (!(await this.cloudAccessible())) return [];

      await this.ensureCloudDirectory();

      const exists = await CloudStorage.exists(CARDS_FILE);
      if (!exists) return [];

      const data = await CloudStorage.readFile(CARDS_FILE);
      return JSON.parse(data) as LoyaltyCard[];
    } catch (error) {
      if ((error as any)?.code === 'ERR_DIRECTORY_NOT_FOUND') {
        return [];
      }
      console.error('Failed to read cards from cloud:', error);
      return [];
    }
  }

  async saveLocalCards(cards: LoyaltyCard[]): Promise<void> {
    try {
      await AsyncStorage.setItem('loyalty_cards', JSON.stringify(cards));
    } catch (error) {
      console.error('Failed to save local cards:', error);
    }
  }

  async clearLocalCards(): Promise<void> {
    try {
      await AsyncStorage.removeItem('loyalty_cards');
    } catch (error) {
      console.error('Failed to clear local cards:', error);
    }
  }

  // Cloud storage operations using react-native-cloud-storage
  async loadCloudCards(): Promise<LoyaltyCard[]> {
    try {
      if (!(await this.cloudAccessible())) return [];

      await this.ensureCloudDirectory();

      const exists = await CloudStorage.exists(CARDS_FILE);
      if (!exists) return [];

      const content = await CloudStorage.readFile(CARDS_FILE);
      const cards = JSON.parse(content) as LoyaltyCard[];
      return this.transformCloudCards(cards);
    } catch (error) {
      if ((error as any)?.code === 'ERR_DIRECTORY_NOT_FOUND') {
        return [];
      }
      console.error('Failed to load cloud cards:', error);
      throw error;
    }
  }

  async saveCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    try {
      if (!(await this.cloudAccessible())) throw new Error('cloud_unavailable');
      await this.ensureCloudDirectory();
      const cards = await this.getCardsFromCloud();
      cards.push(card);
      await CloudStorage.writeFile(CARDS_FILE, JSON.stringify(cards));
      return card;
    } catch (error) {
      console.error('Failed to save cloud card:', error);
      throw error;
    }
  }

  async updateCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    try {
      if (!(await this.cloudAccessible())) throw new Error('cloud_unavailable');
      await this.ensureCloudDirectory();
      const cards = await this.getCardsFromCloud();
      const index = cards.findIndex(c => c.id === card.id);
      if (index !== -1) {
        cards[index] = card;
        await CloudStorage.writeFile(CARDS_FILE, JSON.stringify(cards));
      }
      return card;
    } catch (error) {
      console.error('Failed to update cloud card:', error);
      throw error;
    }
  }

  async toggleCloudCardFavorite(cardId: string, isFavorite: boolean): Promise<LoyaltyCard> {
    try {
      if (!(await this.cloudAccessible())) throw new Error('cloud_unavailable');
      await this.ensureCloudDirectory();
      const cards = await this.getCardsFromCloud();
      const index = cards.findIndex(c => c.id === cardId);
      if (index !== -1) {
        cards[index].isFavorite = isFavorite;
        await CloudStorage.writeFile(CARDS_FILE, JSON.stringify(cards));
        return cards[index];
      }
      throw new Error('Card not found');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  }

  async deleteCloudCard(cardId: string): Promise<void> {
    try {
      if (!(await this.cloudAccessible())) throw new Error('cloud_unavailable');
      await this.ensureCloudDirectory();
      const cards = await this.getCardsFromCloud();
      const filtered = cards.filter(c => c.id !== cardId);
      await CloudStorage.writeFile(CARDS_FILE, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete cloud card:', error);
      throw error;
    }
  }

  // Transform cloud card format to local format (currently data is stored in the same shape)
  private transformCloudCard(cloudCard: any): LoyaltyCard {
    return {
      id: cloudCard.id,
      name: cloudCard.name,
      brand: cloudCard.brand,
      code: cloudCard.code,
      codeType: cloudCard.codeType,
      color: cloudCard.color,
      dateAdded: cloudCard.dateAdded,
      lastUsed: cloudCard.lastUsed,
      notes: cloudCard.notes,
      isFavorite: cloudCard.isFavorite,
    };
  }

  private transformCloudCards(cloudCards: any[]): LoyaltyCard[] {
    return cloudCards.map(card => this.transformCloudCard(card));
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
  }

  async processQueuedOperations(): Promise<void> {
    if (this.queuedOperations.length === 0) return;
    if (!(await this.cloudAccessible())) return;

    const processedOperations: string[] = [];

    for (const operation of this.queuedOperations) {
      try {
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
      } catch (error) {
        console.error(`Failed to process queued operation ${operation.id}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Remove successfully processed operations
    this.queuedOperations = this.queuedOperations.filter(
      op => !processedOperations.includes(op.id)
    );
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
  }

  // Unified card operations - ALWAYS use local storage, sync to cloud when available
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
    // Always load from local storage first
    const localCards = await this.loadLocalCards();
    
    // If cloud mode, try to sync from cloud
    if (this.storageMode === 'cloud') {
      try {
        const cloudCards = await this.loadCloudCards();
        // Update local cache with cloud data
        await this.saveLocalCards(cloudCards);
        return cloudCards;
      } catch (error) {
        console.error('Failed to load cloud cards, using local cache:', error);
      }
    }
    
    return localCards;
  }

  async saveCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    // Always save locally first
    const localCards = await this.loadLocalCards();
    localCards.push(card);
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          const savedCard = await this.saveCloudCard(card);
          // Update local cache with cloud response
          const updatedLocalCards = await this.loadLocalCards();
          const index = updatedLocalCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            updatedLocalCards[index] = savedCard;
            await this.saveLocalCards(updatedLocalCards);
          }
          return savedCard;
        } catch (error) {
          console.error('Failed to save to cloud, queuing operation:', error);
          await this.queueOperation({ type: 'create', card });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'create', card });
      }
    }

    return card;
  }

  async updateCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
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
          const updatedCard = await this.updateCloudCard(card);
          // Update local cache with cloud response
          const updatedLocalCards = await this.loadLocalCards();
          const localIndex = updatedLocalCards.findIndex(c => c.id === card.id);
          if (localIndex !== -1) {
            updatedLocalCards[localIndex] = updatedCard;
            await this.saveLocalCards(updatedLocalCards);
          }
          return updatedCard;
        } catch (error) {
          console.error('Failed to update cloud card, queuing operation:', error);
          await this.queueOperation({ type: 'update', card });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'update', card });
      }
    }

    return card;
  }

  async toggleFavorite(cardId: string, isFavorite: boolean, isOnline: boolean = true): Promise<LoyaltyCard | null> {
    // Always update locally first
    const localCards = await this.loadLocalCards();
    const index = localCards.findIndex(c => c.id === cardId);
    if (index === -1) return null;

    localCards[index].isFavorite = isFavorite;
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          const updatedCard = await this.toggleCloudCardFavorite(cardId, isFavorite);
          // Update local cache with cloud response
          const updatedLocalCards = await this.loadLocalCards();
          const localIndex = updatedLocalCards.findIndex(c => c.id === cardId);
          if (localIndex !== -1) {
            updatedLocalCards[localIndex] = updatedCard;
            await this.saveLocalCards(updatedLocalCards);
          }
          return updatedCard;
        } catch (error) {
          console.error('Failed to toggle favorite in cloud, queuing operation:', error);
          await this.queueOperation({ type: 'favorite', cardId, isFavorite });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'favorite', cardId, isFavorite });
      }
    }

    return localCards[index];
  }

  async deleteCard(cardId: string, isOnline: boolean = true): Promise<void> {
    // Always delete locally first
    const localCards = await this.loadLocalCards();
    const filteredCards = localCards.filter(c => c.id !== cardId);
    await this.saveLocalCards(filteredCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline) {
        try {
          await this.deleteCloudCard(cardId);
        } catch (error) {
          console.error('Failed to delete cloud card, queuing operation:', error);
          await this.queueOperation({ type: 'delete', cardId });
        }
      } else {
        // Queue for later sync when online
        await this.queueOperation({ type: 'delete', cardId });
      }
    }
  }

  // Sync conflict resolution
  async checkForSyncConflicts(): Promise<SyncConflictData | null> {
    if (this.storageMode === 'local') return null;
    
    try {
      const localCards = await this.loadLocalCards();
      const cloudCards = await this.loadCloudCards();

      if (localCards.length === 0) {
        return null; // No conflict if no local data
      }

      // Check if there are meaningful differences
      const hasConflicts = localCards.length !== cloudCards.length ||
        !this.arraysEqual(localCards, cloudCards);

      if (!hasConflicts) {
        return null;
      }

      return {
        localCards,
        cloudCards,
        localCount: localCards.length,
        cloudCount: cloudCards.length,
      };
    } catch (error) {
      console.error('Failed to check sync conflicts:', error);
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
    switch (action) {
      case 'replace_with_cloud':
        await this.saveLocalCards(conflictData.cloudCards);
        break;
      
      case 'merge':
        const mergedCards = this.mergeCards(conflictData.localCards, conflictData.cloudCards);
        await this.saveLocalCards(mergedCards);
        // Upload merged cards to cloud
        for (const card of conflictData.localCards) {
          const existsInCloud = conflictData.cloudCards.some(c => c.code === card.code);
          if (!existsInCloud) {
            try {
              await this.saveCloudCard(card);
            } catch (error) {
              console.error('Failed to upload merged card to cloud:', error);
            }
          }
        }
        break;
      
      case 'keep_local':
        // Upload all local cards to cloud
        for (const card of conflictData.localCards) {
          try {
            await this.saveCloudCard(card);
          } catch (error) {
            console.error('Failed to upload local card to cloud:', error);
          }
        }
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
  }
}

export const storageManager = StorageManager.getInstance();