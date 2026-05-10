import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Connexion', headerBackVisible: false }} />
      <Stack.Screen name="signup" options={{ title: 'Inscription' }} />
    </Stack>
  );
}