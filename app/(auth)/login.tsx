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
import { supabase } from '../../src/supabase/client';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      router.replace('/(main)');
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
          style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: '#1f2937' }}
        >
          Invisible Queue
        </Text>
        <Text style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32 }}>
          Connectez-vous à votre compte
        </Text>

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
        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={inputStyle}
          autoComplete="password"
        />

        <TouchableOpacity
          onPress={handleLogin}
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={{ marginTop: 20 }}>
          <Text style={{ color: '#3b82f6', textAlign: 'center' }}>
            Pas encore de compte ?{' '}
            <Text style={{ fontWeight: '600' }}>Inscrivez-vous</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(main)')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#6b7280', textAlign: 'center' }}>Continuer en invité</Text>
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