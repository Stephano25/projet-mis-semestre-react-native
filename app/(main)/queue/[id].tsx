import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Button, Alert, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { QueueEntry } from '../../../src/types/database';
import { useAuthStore } from '../../../src/store/authStore';
import { addToQueue, leaveQueue } from '../../../src/services/queueService';
import * as Location from 'expo-location';
import { calculateDistance } from '../../../src/utils/distance';
import { useQueueNotifications } from '../../../src/hooks/useQueueNotifications';

export default function QueueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [id]);

  useQueueNotifications(myEntry, id);

  async function fetchQueue() {
    setLoading(true);
    const { data, error } = await supabase.from('queues').select('*').eq('id', id).single();
    if (error) console.error('Erreur chargement file :', error);
    else setQueue(data);
    setLoading(false);
  }

  async function refreshMyEntry() {
    if (!myEntry) return;
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', myEntry.id)
      .single();
    if (error) return;

    setMyEntry(data);
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .lt('position', data.position);
    setPositionAhead(count || 0);

    if (data.status === 'served') {
      Alert.alert('Vous avez été servi !');
      router.back();
    } else if (data.status === 'removed') {
      Alert.alert('Vous avez été exclu après 3 absences');
      router.back();
    }
  }

  async function checkProximity() {
    if (!queue) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permission de localisation refusée');
    const loc = await Location.getCurrentPositionAsync({});
    const dist = calculateDistance(loc.coords.latitude, loc.coords.longitude, queue.latitude, queue.longitude);
    if (dist > 5) {
      Alert.alert('Hors zone', 'Vous devez être à moins de 5 km pour rejoindre cette file.');
      router.back();
      throw new Error('Hors zone');
    }
  }

  async function handleJoin() {
    if (!queue) return;
    try {
      await checkProximity();
    } catch(e) { return; }

    const userId = user?.id || null;
    let name = userId ? user?.name : guestName;
    let email = userId ? user?.email : guestEmail;

    if (!userId && (!name || !email)) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom et email');
      return;
    }

    try {
      const entry = await addToQueue(id, userId, name, email);
      setMyEntry(entry);
      // Rafraîchir périodiquement la position
      const interval = setInterval(refreshMyEntry, 3000);
      return () => clearInterval(interval);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rejoindre la file');
    }
  }

  async function handleLeave() {
    if (!myEntry) return;
    try {
      await leaveQueue(myEntry.id, id);
      router.back();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de quitter la file');
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!queue) return <Text style={{ padding: 16 }}>File introuvable</Text>;

  if (!myEntry) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>{queue.name}</Text>
        {!user && (
          <>
            <TextInput
              placeholder="Nom"
              value={guestName}
              onChangeText={setGuestName}
              style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginVertical: 8, borderRadius: 8 }}
            />
            <TextInput
              placeholder="Email"
              value={guestEmail}
              onChangeText={setGuestEmail}
              autoCapitalize="none"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginVertical: 8, borderRadius: 8 }}
            />
          </>
        )}
        <Button title="Rejoindre la file" onPress={handleJoin} color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>Votre position</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>{myEntry.position}</Text>
      </View>
      <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>Personnes devant vous</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>{positionAhead}</Text>
      </View>
      <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 24 }}>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>Tours manqués</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: positionAhead >= 3 ? '#ef4444' : '#1f2937' }}>
          {myEntry.missed_turns} / 3
        </Text>
      </View>
      <Button title="Quitter la file" onPress={handleLeave} color="#ef4444" />
    </View>
  );
}