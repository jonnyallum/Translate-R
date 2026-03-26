// mobile/app/index.tsx
// Auth gate — redirects to login if not authenticated, home if authenticated

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { user, isInitialised } = useAuthStore();

  useEffect(() => {
    if (!isInitialised) return;

    if (user) {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [user, isInitialised]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E8924A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
});
