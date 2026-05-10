import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { router } from 'expo-router';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else if (data.user) {
      await supabase.from('users').insert({ id: data.user.id, name, email });
      Alert.alert('Succès', 'Compte créé, vous pouvez vous connecter');
      router.push('/login');
    }
    setLoading(false);
  }

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#1f2937' }}>
        Inscription
      </Text>
      
      <TextInput
        placeholder="Nom"
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
      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb' }}
      />
      
      <Button title={loading ? 'Inscription...' : "S'inscrire"} onPress={handleSignup} disabled={loading} color="#3b82f6" />
      
      <TouchableOpacity onPress={() => router.push('/login')} style={{ marginTop: 20 }}>
        <Text style={{ color: '#3b82f6', textAlign: 'center' }}>Déjà un compte ? Connectez-vous</Text>
      </TouchableOpacity>
    </View>
  );
}