import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { router } from 'expo-router';

export default function MainLayout() {
  const { user, signOut } = useAuthStore();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Files à proximité',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/create-queue')}>
              <Text className="text-blue-500 mr-4">Créer</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            user ? (
              <TouchableOpacity onPress={signOut}>
                <Text className="text-red-500 ml-4">Déconnexion</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text className="text-blue-500 ml-4">Connexion</Text>
              </TouchableOpacity>
            )
          ),
        }}
      />
      <Stack.Screen name="create-queue" options={{ title: 'Nouvelle file' }} />
      <Stack.Screen name="queue/[id]" options={{ title: 'File d’attente' }} />
      <Stack.Screen name="manage-queue/[id]" options={{ title: 'Gérer la file' }} />
    </Stack>
  );
}