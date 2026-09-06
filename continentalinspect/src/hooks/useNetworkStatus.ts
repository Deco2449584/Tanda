import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

function resolveIsOnline(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
): boolean {
  if (isConnected === false) {
    return false;
  }

  if (isInternetReachable === false) {
    return false;
  }

  return true;
}

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applyState = (isConnected: boolean | null, isInternetReachable: boolean | null) => {
      if (mounted) {
        setIsOnline(resolveIsOnline(isConnected, isInternetReachable));
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      applyState(state.isConnected, state.isInternetReachable);
    });

    NetInfo.fetch().then((state) => {
      applyState(state.isConnected, state.isInternetReachable);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}
