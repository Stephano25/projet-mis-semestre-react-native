import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addToQueue } from '../../src/services/queueService';

export default function GuestJoin() {
  const { queueId } = useLocalSearchParams<{ queueId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function handleJoin() {
    if (!name || !email) {
      Alert.alert('Erreur', 'Nom et email requis');
      return;
    }
    try {
      await addToQueue(queueId, null, name, email);
      Alert.alert('Succès', 'Vous êtes en file d’attente');
      router.replace(`/queue/${queueId}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rejoindre');
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Rejoindre en tant qu’invité</Text>
      <TextInput
        placeholder="Nom"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginVertical: 4, borderRadius: 4 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 8, marginVertical: 4, borderRadius: 4 }}
        autoCapitalize="none"
      />
      <Button title="Rejoindre" onPress={handleJoin} />
    </View>
  );
}