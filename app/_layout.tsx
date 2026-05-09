import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { supabase } from '../src/supabase/client';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { setSession, setUser, setIsLoading, isLoading } = useAuthStore();

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

  async function fetchUser(userId: string) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) setUser(data);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="guest/join" options={{ title: 'Rejoindre en invité' }} />
    </Stack>
  );
}