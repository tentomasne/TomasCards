import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface DebugLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  component?: string;
  extra?: any;
}

const DEBUG_LOGS_KEY = 'debug_logs';
const DEBUG_MODE_KEY = 'debug_mode_enabled';
const MAX_LOGS = 1000; // Keep only the last 1000 logs

class DebugManager {
  private static instance: DebugManager;
  private logs: DebugLog[] = [];
  private isDebugMode: boolean = false;
  private errorModalCallback?: (error: DebugLog) => void;

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  async initialize(): Promise<void> {
    // Check if debug mode is enabled from storage (runtime toggle)
    const storedDebugMode = await AsyncStorage.getItem(DEBUG_MODE_KEY);
    this.isDebugMode = storedDebugMode === 'true';
    
    // Load existing logs
    await this.loadLogs();
    
    // Set up global error handlers if debug mode is enabled
    if (this.isDebugMode) {
      this.setupGlobalErrorHandlers();
    }
  }

  async toggleDebugMode(): Promise<boolean> {
    this.isDebugMode = !this.isDebugMode;
    await AsyncStorage.setItem(DEBUG_MODE_KEY, this.isDebugMode.toString());
    
    if (this.isDebugMode) {
      this.setupGlobalErrorHandlers();
      this.logInfo('Debug mode enabled', 'Debug mode activated via settings', 'DebugManager');
    } else {
      this.logInfo('Debug mode disabled', 'Debug mode deactivated via settings', 'DebugManager');
    }
    
    return this.isDebugMode;
  }

  private async loadLogs(): Promise<void> {
    try {
      const storedLogs = await AsyncStorage.getItem(DEBUG_LOGS_KEY);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    }
  }

  private async saveLogs(): Promise<void> {
    try {
      // Keep only the last MAX_LOGS entries
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      await AsyncStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save debug logs:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle JavaScript errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logError('Console Error', args.join(' '));
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      this.logWarning('Console Warning', args.join(' '));
      originalConsoleWarn.apply(console, args);
    };

    // Handle unhandled promise rejections
    if (Platform.OS === 'web') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError('Unhandled Promise Rejection', event.reason?.toString() || 'Unknown error');
      });

      window.addEventListener('error', (event) => {
        this.logError('Global Error', event.error?.toString() || event.message, event.error?.stack);
      });
    }
  }

  setErrorModalCallback(callback: (error: DebugLog) => void): void {
    this.errorModalCallback = callback;
  }

  logError(message: string, details?: string, stack?: string, component?: string, extra?: any): void {
    const log: DebugLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level: 'error',
      message,
      stack: stack || details,
      component,
      extra,
    };
      console.error(`[DEBUG] Error in ${component || 'Unknown'}: ${message}`, details);

    this.logs.push(log);
    this.saveLogs();

    // Show modal if debug mode is enabled and callback is set
    if (this.isDebugMode && this.errorModalCallback) {
      this.errorModalCallback(log);
    }

  }

  logWarning(message: string, details?: string, component?: string, extra?: any): void {
    const log: DebugLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level: 'warning',
      message,
      stack: details,
      component,
      extra,
    };

    this.logs.push(log);
    this.saveLogs();

    // Show modal if debug mode is enabled and callback is set
    if (this.isDebugMode && this.errorModalCallback) {
      this.errorModalCallback(log);
    }

    console.warn(`[DEBUG] Warning in ${component || 'Unknown'}: ${message}`, details);
  }

  logInfo(message: string, details?: string, component?: string, extra?: any): void {
    const log: DebugLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level: 'info',
      message,
      stack: details,
      component,
      extra,
    };

    this.logs.push(log);
    this.saveLogs();

    console.log(`[DEBUG] Info in ${component || 'Unknown'}: ${message}`, details);
  }

  getLogs(): DebugLog[] {
    return [...this.logs].reverse(); // Return newest first
  }

  getLogsByLevel(level: 'error' | 'warning' | 'info'): DebugLog[] {
    return this.logs.filter(log => log.level === level).reverse();
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    await AsyncStorage.removeItem(DEBUG_LOGS_KEY);
  }

  isDebugEnabled(): boolean {
    return this.isDebugMode;
  }

  getLogCount(): { total: number; errors: number; warnings: number; info: number } {
    return {
      total: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error').length,
      warnings: this.logs.filter(log => log.level === 'warning').length,
      info: this.logs.filter(log => log.level === 'info').length,
    };
  }
}

export const debugManager = DebugManager.getInstance();

// Helper functions for easy logging
export const logError = (message: string, details?: string, component?: string, extra?: any) => {
  debugManager.logError(message, details, undefined, component, extra);
};

export const logWarning = (message: string, details?: string, component?: string, extra?: any) => {
  debugManager.logWarning(message, details, component, extra);
};

export const logInfo = (message: string, details?: string, component?: string, extra?: any) => {
  debugManager.logInfo(message, details, component, extra);
};