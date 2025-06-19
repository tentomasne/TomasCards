export interface LoyaltyCard {
  id: string;
  name: string;
  brand?: string;
  code: string;
  codeType: 'barcode' | 'qrcode';
  color: string;
  dateAdded: number;
  lastUsed?: number;
  notes?: string;
  isFavorite?: boolean;
}

export type SortOption = 'alphabetical' | 'recent' | 'lastUsed' | 'custom';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  sortOption: SortOption;
  cardOrder?: string[];
  hapticFeedback: boolean;
  secureWithBiometrics: boolean;
  themeMode: ThemeMode;
}