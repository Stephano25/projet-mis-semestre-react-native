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
    return (
      <View style={{ padding: 16 }}>
        <Text>Vous devez être connecté pour créer une file.</Text>
      </View>
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }
    
    setLoading(true);
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission GPS requise', 'Activez la localisation pour créer une file.');
      setLoading(false);
      return;
    }
    
    const location = await Location.getCurrentPositionAsync({});
    const { error } = await supabase.from('queues').insert({
      name: name.trim(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      created_by: user.id,
    });
    
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'File créée !');
      router.back();
    }
    setLoading(false);
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Nouvelle file</Text>
      <TextInput
        placeholder="Nom de la file"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginVertical: 8, borderRadius: 4 }}
      />
      <Button 
        title={loading ? 'Création...' : 'Créer'} 
        onPress={handleCreate} 
        disabled={loading} 
      />
    </View>
  );
}