import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { supabase } from '../src/supabase/client';
import { ActivityIndicator, View } from 'react-native';

// Ignorer l'erreur "Unable to activate keep awake" (non bloquante)
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (error?.message?.includes('keep awake') || error?.message?.includes('keepAwake')) {
      console.warn('Ignored keep awake error');
      return;
    }
    originalHandler(error, isFatal);
  });
}

export default function RootLayout() {
  const { setSession, setUser, setIsLoading, isLoading } = useAuthStore();

  async function fetchUser(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', userId)
      .single();
    if (data) setUser(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUser(session.user.id);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="guest" options={{ headerShown: false }} />
    </Stack>
  );
}