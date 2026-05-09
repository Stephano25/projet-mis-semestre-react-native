import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { useAuthStore } from '../../src/store/authStore';
import * as Location from 'expo-location';
import { router } from 'expo-router';

export default function CreateQueue() {
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <Text>Vous devez être connecté pour créer une file.</Text>;
  }

  async function handleCreate() {
    if (!name) return;
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission GPS requise');
      setLoading(false);
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const { error } = await supabase.from('queues').insert({
      name,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      created_by: user.id,
    });
    if (error) Alert.alert('Erreur', error.message);
    else {
      Alert.alert('Succès', 'File créée !');
      router.back();
    }
    setLoading(false);
  }

  return (
    <View className="p-4">
      <Text className="text-xl">Nouvelle file</Text>
      <TextInput placeholder="Nom de la file" value={name} onChangeText={setName} className="border p-2 my-2" />
      <Button title={loading ? 'Création...' : 'Créer'} onPress={handleCreate} disabled={loading} />
    </View>
  );
}