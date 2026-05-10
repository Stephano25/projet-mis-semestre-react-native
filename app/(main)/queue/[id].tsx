import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, Text, Button, Alert, TextInput } from 'react-native';
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
  const { user } = useAuthStore();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const entrySubscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchQueue();
    subscribeToEntries();
    return () => {
      if (entrySubscriptionRef.current) {
        supabase.removeChannel(entrySubscriptionRef.current);
      }
    };
  }, [id]);

  useQueueNotifications(myEntry, id);

  async function fetchQueue() {
    const { data, error } = await supabase.from('queues').select('*').eq('id', id).single();
    if (error) console.error('Erreur chargement file :', error);
    else setQueue(data);
  }

  function subscribeToEntries() {
    if (!id) return;
    
    if (entrySubscriptionRef.current) {
      supabase.removeChannel(entrySubscriptionRef.current);
    }
    
    const channel = supabase.channel(`queue_${id}`);
    channel.on('postgres_changes', 
      { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` },
      () => refreshMyEntry()
    );
    entrySubscriptionRef.current = channel.subscribe();
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

  if (!queue) return <Text>Chargement...</Text>;

  if (!myEntry) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{queue.name}</Text>
        {!user && (
          <>
            <TextInput
              placeholder="Nom"
              value={guestName}
              onChangeText={setGuestName}
              style={{ borderWidth: 1, padding: 8, marginVertical: 4, borderRadius: 4 }}
            />
            <TextInput
              placeholder="Email"
              value={guestEmail}
              onChangeText={setGuestEmail}
              autoCapitalize="none"
              style={{ borderWidth: 1, padding: 8, marginVertical: 4, borderRadius: 4 }}
            />
          </>
        )}
        <Button title="Rejoindre la file" onPress={handleJoin} />
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18 }}>Votre position : {myEntry.position}</Text>
      <Text>Personnes devant : {positionAhead}</Text>
      <Text>Tours manqués : {myEntry.missed_turns}</Text>
      <Button title="Quitter la file" onPress={handleLeave} color="red" />
    </View>
  );
}