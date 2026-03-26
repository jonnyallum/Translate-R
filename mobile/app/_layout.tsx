// mobile/app/_layout.tsx
// Root layout — initialises auth, wraps app in providers

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { isLoading, isInitialised, initialise } = useAuthStore();

  useEffect(() => {
    initialise();
  }, []);

  if (!isInitialised || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8924A" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFF8F0' },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FFF8F0' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="home"
          options={{
            title: 'Translate-R',
            headerLeft: () => null,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="call/[id]"
          options={{
            headerShown: false,
            gestureEnabled: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="transcript/[id]"
          options={{
            title: 'Transcript',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="pricing"
          options={{
            title: 'Pricing',
            presentation: 'modal',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
});
