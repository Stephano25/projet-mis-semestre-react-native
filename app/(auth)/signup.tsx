import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { router } from 'expo-router';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Erreur', error.message);
    else if (data.user) {
      await supabase.from('users').insert({ id: data.user.id, name, email });
      Alert.alert('Succès', 'Compte créé, vous pouvez vous connecter');
      router.push('/login');
    }
    setLoading(false);
  }

  return (
    <View style={{ padding: 16, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Inscription</Text>
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
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 8, marginVertical: 4, borderRadius: 4 }}
      />
      <Button title={loading ? 'Inscription...' : 'S’inscrire'} onPress={handleSignup} disabled={loading} />
    </View>
  );
}