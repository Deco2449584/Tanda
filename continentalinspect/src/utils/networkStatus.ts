import NetInfo from '@react-native-community/netinfo';

export function resolveIsOnline(
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

export async function fetchIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return resolveIsOnline(state.isConnected, state.isInternetReachable);
}

export function isLikelyNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : String(error ?? '');

  return /network|offline|internet|failed to fetch|timeout|timed out|unavailable|connection|econn|enotfound|enetunreach|socket|unreachable|abort|storage\/retry-limit|deadline-exceeded|waiting for network|will retry when online/i.test(
    message,
  );
}
