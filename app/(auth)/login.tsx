import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Erreur', error.message);
    else router.replace('/');
    setLoading(false);
  }

  return (
    <View className="p-4 flex-1 justify-center">
      <Text className="text-2xl font-bold mb-6">Connexion</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} className="border p-2 my-1 rounded" autoCapitalize="none" />
      <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry className="border p-2 my-1 rounded" />
      <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={loading} />
      <TouchableOpacity onPress={() => router.push('/signup')} className="mt-4">
        <Text className="text-blue-500 text-center">Pas encore de compte ? Inscrivez-vous</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/guest/join')} className="mt-2">
        <Text className="text-gray-500 text-center">Continuer en invité</Text>
      </TouchableOpacity>
    </View>
  );
}