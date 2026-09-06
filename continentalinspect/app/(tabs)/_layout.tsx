import { Redirect, Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const { user, profile, role, isLoading } = useAuth();
  const isAdmin = role === 'admin';
  const router = useRouter();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.primary,
        }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!user || !profile) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      key={isAdmin ? 'tabs-admin' : 'tabs-operator'}
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background.primary },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Records' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan' }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/scanner');
          },
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? '/(tabs)/admin' : null,
        }}
      />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
