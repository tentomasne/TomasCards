import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useNetworkStatus } from './useNetworkStatus';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Re-check auth when network status changes
  useEffect(() => {
    if (!isLoading && isOnline) {
      checkAuthStatus();
    }
  }, [isOnline]);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      if (isOnline) {
        // Verify token with server when online
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/me`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            method: 'GET',
          });

          if (response.ok) {
            const data = await response.json();
            // Update token if server provides a new one
            if (data.token && data.token !== token) {
              await SecureStore.setItemAsync('authToken', data.token);
            }
            setIsAuthenticated(true);
          } else if (response.status === 401 || response.status === 403) {
            // Token is invalid, remove it
            await SecureStore.deleteItemAsync('authToken');
            setIsAuthenticated(false);
          } else {
            // Server error but token exists, assume authenticated
            setIsAuthenticated(true);
          }
        } catch (networkError) {
          // Network error, but token exists - assume authenticated for offline mode
          console.log('Network error during auth check, using offline mode');
          setIsAuthenticated(true);
        }
      } else {
        // Offline mode - trust the stored token
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
      setIsAuthenticated(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const contextValue = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}