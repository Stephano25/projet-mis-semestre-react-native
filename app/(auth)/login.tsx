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
    <View style={{ padding: 16, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Connexion</Text>
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
      <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={loading} />
      <TouchableOpacity onPress={() => router.push('/signup')} style={{ marginTop: 16 }}>
        <Text style={{ color: '#3b82f6', textAlign: 'center' }}>Pas encore de compte ? Inscrivez-vous</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/guest/join')} style={{ marginTop: 8 }}>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>Continuer en invité</Text>
      </TouchableOpacity>
    </View>
  );
}