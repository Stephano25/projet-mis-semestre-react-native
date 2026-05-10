import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      router.replace('/');
    }
    setLoading(false);
  }

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#1f2937' }}>
        Invisible Queue
      </Text>
      
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb' }}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb' }}
      />
      
      <Button title={loading ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={loading} color="#3b82f6" />
      
      <TouchableOpacity onPress={() => router.push('/signup')} style={{ marginTop: 20 }}>
        <Text style={{ color: '#3b82f6', textAlign: 'center' }}>Pas encore de compte ? Inscrivez-vous</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/guest/join')} style={{ marginTop: 12 }}>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>Continuer en invité</Text>
      </TouchableOpacity>
    </View>
  );
}