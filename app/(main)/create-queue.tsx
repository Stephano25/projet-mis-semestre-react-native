import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
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
        <Text style={{ textAlign: 'center', color: '#ef4444' }}>
          Vous devez être connecté pour créer une file.
        </Text>
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
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Nouvelle file</Text>
      <TextInput
        placeholder="Nom de la file"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 8, marginBottom: 16 }}
      />
      <Button 
        title={loading ? 'Création...' : 'Créer'} 
        onPress={handleCreate} 
        disabled={loading} 
        color="#3b82f6"
      />
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );
}