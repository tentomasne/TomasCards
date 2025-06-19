import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === 'auth';
      
      // Only redirect to login if user is trying to access auth-required features
      // The app now supports usage without authentication
      if (isAuthenticated && inAuthGroup) {
        // Redirect to main app if authenticated and in auth group
        router.replace('/');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.backgroundDark 
      }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}