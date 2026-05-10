import { Stack } from 'expo-router';

export default function GuestLayout() {
  return (
    <Stack>
      <Stack.Screen name="join" options={{ title: 'Rejoindre en invité' }} />
    </Stack>
  );
}