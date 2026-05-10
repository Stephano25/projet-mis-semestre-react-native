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

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({ id: data.user.id, name: name.trim(), email: email.trim() });

      if (profileError) {
        console.error('Profile insert error:', profileError);
      }

      Alert.alert(
        'Succès',
        'Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
          Inscription
        </Text>
        <Text style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32 }}>
          Créez votre compte Invisible Queue
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
        <TextInput
          placeholder="Mot de passe (min. 6 caractères)"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={inputStyle}
          autoComplete="new-password"
        />

        <TouchableOpacity
          onPress={handleSignup}
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              {"S'inscrire"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ marginTop: 20 }}>
          <Text style={{ color: '#3b82f6', textAlign: 'center' }}>
            {"Déjà un compte ?"}{' '}
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