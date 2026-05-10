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
import { router, useLocalSearchParams } from 'expo-router';
import { addToQueue } from '../../src/services/queueService';

export default function GuestJoin() {
  const { queueId } = useLocalSearchParams<{ queueId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Erreur', 'Nom et email requis');
      return;
    }
    if (!queueId) {
      Alert.alert('Erreur', 'Identifiant de file manquant');
      return;
    }

    setLoading(true);
    try {
      await addToQueue(queueId, null, name.trim(), email.trim());
      Alert.alert('Succès', "Vous êtes en file d'attente !", [
        { text: 'OK', onPress: () => router.replace(`/(main)/queue/${queueId}`) },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de rejoindre');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ padding: 24, flex: 1, justifyContent: 'center', backgroundColor: '#fff' }}>
        <Text
          style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#1f2937' }}
        >
          Rejoindre en invité
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32 }}>
          Entrez vos informations pour rejoindre la file
        </Text>

        <TextInput
          placeholder="Nom complet"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          style={inputStyle}
          autoComplete="name"
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TouchableOpacity
          onPress={handleJoin}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#93c5fd' : '#3b82f6',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Rejoindre</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ marginTop: 20 }}>
          <Text style={{ color: '#3b82f6', textAlign: 'center' }}>
            Vous avez un compte ?{' '}
            <Text style={{ fontWeight: '600' }}>Connectez-vous</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#e5e7eb',
  padding: 14,
  marginVertical: 6,
  borderRadius: 10,
  backgroundColor: '#f9fafb',
  fontSize: 15,
  color: '#1f2937',
};