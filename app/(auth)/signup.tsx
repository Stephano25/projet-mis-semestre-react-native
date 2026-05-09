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
      // Créer l'entrée dans la table users
      await supabase.from('users').insert({ id: data.user.id, name, email });
      Alert.alert('Succès', 'Compte créé, vous pouvez vous connecter');
      router.push('/login');
    }
    setLoading(false);
  }

  return (
    <View className="p-4 flex-1 justify-center">
      <Text className="text-2xl font-bold mb-6">Inscription</Text>
      <TextInput placeholder="Nom" value={name} onChangeText={setName} className="border p-2 my-1 rounded" />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} className="border p-2 my-1 rounded" autoCapitalize="none" />
      <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry className="border p-2 my-1 rounded" />
      <Button title={loading ? 'Inscription...' : 'S’inscrire'} onPress={handleSignup} disabled={loading} />
    </View>
  );
}