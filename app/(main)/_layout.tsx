import { Stack, router } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function MainLayout() {
  const { user, signOut } = useAuthStore();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Files à proximité',
          headerRight: () =>
            user ? (
              <TouchableOpacity onPress={() => router.push('/(main)/create-queue')}>
                <Text style={{ color: '#3b82f6', marginRight: 16, fontWeight: '600' }}>
                  + Créer
                </Text>
              </TouchableOpacity>
            ) : null,
          headerLeft: () =>
            user ? (
              <TouchableOpacity onPress={signOut}>
                <Text style={{ color: '#ef4444', marginLeft: 16, fontWeight: '600' }}>
                  Déconnexion
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={{ color: '#3b82f6', marginLeft: 16, fontWeight: '600' }}>
                  Connexion
                </Text>
              </TouchableOpacity>
            ),
        }}
      />
      <Stack.Screen
        name="create-queue"
        options={{ title: 'Nouvelle file', headerBackTitle: 'Retour' }}
      />
      <Stack.Screen
        name="queue/[id]"
        options={{ title: "File d'attente", headerBackTitle: 'Retour' }}
      />
      <Stack.Screen
        name="manage-queue/[id]"
        options={{ title: 'Gérer la file', headerBackTitle: 'Retour' }}
      />
    </Stack>
  );
}