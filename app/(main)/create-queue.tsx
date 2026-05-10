import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#ef4444', textAlign: 'center', fontSize: 16 }}>
          Vous devez être connecté pour créer une file.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: 16, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Se connecter</Text>
        </TouchableOpacity>
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
      Alert.alert('Succès', 'File créée !', [{ text: 'OK', onPress: () => router.back() }]);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ padding: 24, flex: 1, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 24, color: '#1f2937' }}>
          Nouvelle file
        </Text>
        <TextInput
          placeholder="Nom de la file"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            padding: 14,
            borderRadius: 10,
            backgroundColor: '#f9fafb',
            fontSize: 15,
            marginBottom: 20,
          }}
        />
        <Text style={{ color: '#6b7280', marginBottom: 20, fontSize: 13 }}>
          📍 La localisation actuelle de votre appareil sera utilisée pour géolocaliser la file.
        </Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#93c5fd' : '#3b82f6',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Créer la file</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}