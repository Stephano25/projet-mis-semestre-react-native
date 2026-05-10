import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addToQueue } from '../../src/services/queueService';

export default function GuestJoin() {
  const { queueId } = useLocalSearchParams<{ queueId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!name || !email) {
      Alert.alert('Erreur', 'Nom et email requis');
      return;
    }
    
    setLoading(true);
    try {
      await addToQueue(queueId, null, name, email);
      Alert.alert('Succès', 'Vous êtes en file d’attente');
      router.replace(`/queue/${queueId}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rejoindre');
    }
    setLoading(false);
  }

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#1f2937' }}>
        Rejoindre en tant qu'invité
      </Text>
      
      <TextInput
        placeholder="Nom complet"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb' }}
      />
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb' }}
        autoCapitalize="none"
      />
      
      <Button title={loading ? 'Inscription...' : 'Rejoindre'} onPress={handleJoin} disabled={loading} color="#3b82f6" />
    </View>
  );
}