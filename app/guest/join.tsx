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
    <View className="p-4">
      <Text className="text-xl mb-4">Rejoindre en tant qu’invité</Text>
      <TextInput placeholder="Nom" value={name} onChangeText={setName} className="border p-2 my-1 rounded" />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} className="border p-2 my-1 rounded" autoCapitalize="none" />
      <Button title="Rejoindre" onPress={handleJoin} />
    </View>
  );
}