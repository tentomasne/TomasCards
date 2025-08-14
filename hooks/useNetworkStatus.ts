import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setIsLoading(false);
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isLoading };
}
