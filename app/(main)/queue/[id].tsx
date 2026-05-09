import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { QueueEntry } from '../../../src/types/database';
import { useAuthStore } from '../../../src/store/authStore';
import { addToQueue, leaveQueue } from '../../../src/services/queueService';
import * as Location from 'expo-location';
import { calculateDistance } from '../../../src/utils/distance';

export default function QueueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<any>(null);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const { user } = useAuthStore();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    fetchQueue();
    subscribeToEntries();
    checkProximity();
  }, [id]);

  async function fetchQueue() {
    const { data } = await supabase.from('queues').select('*').eq('id', id).single();
    setQueue(data);
  }

  function subscribeToEntries() {
    const subscription = supabase
      .channel(`queue_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` }, () => {
        refreshMyEntry();
      })
      .subscribe();
    return () => subscription.unsubscribe();
  }

  async function refreshMyEntry() {
    if (!myEntry) return;
    const { data } = await supabase
      .from('queue_entries')
      .select('*, queue_id')
      .eq('id', myEntry.id)
      .single();
    if (data) {
      setMyEntry(data);
      // compter les waiting avant cette position
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
      } else if (positionAhead <= 3 && positionAhead > 0) {
        Alert.alert('Notification', 'Votre tour approche !');
      } else if (positionAhead === 0 && data.status === 'waiting') {
        Alert.alert('C’est à vous ! Présentez-vous au guichet.');
      }
    }
  }

  async function checkProximity() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permission refusée');
    const loc = await Location.getCurrentPositionAsync({});
    const dist = calculateDistance(loc.coords.latitude, loc.coords.longitude, queue.latitude, queue.longitude);
    if (dist > 5) {
      Alert.alert('Hors zone', 'Vous devez être à moins de 5 km pour rejoindre cette file.');
      router.back();
    }
  }

  async function handleJoin() {
    if (!queue) return;
    const userId = user?.id || null;
    let name = userId ? user.name : guestName;
    let email = userId ? user.email : guestEmail;
    if (!userId && (!name || !email)) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom et email');
      return;
    }
    const entry = await addToQueue(id, userId, name, email);
    setMyEntry(entry);
  }

  async function handleLeave() {
    if (!myEntry) return;
    await leaveQueue(myEntry.id);
    router.back();
  }

  if (!queue) return <Text>Chargement...</Text>;

  if (!myEntry) {
    // Formulaire d'inscription
    return (
      <View className="p-4">
        <Text className="text-xl font-bold">{queue.name}</Text>
        {!user && (
          <>
            <TextInput placeholder="Nom" value={guestName} onChangeText={setGuestName} className="border p-2 my-1" />
            <TextInput placeholder="Email" value={guestEmail} onChangeText={setGuestEmail} className="border p-2 my-1" />
          </>
        )}
        <Button title="Rejoindre la file" onPress={handleJoin} />
      </View>
    );
  }

  return (
    <View className="p-4">
      <Text className="text-lg">Votre position : {myEntry.position}</Text>
      <Text>Personnes devant : {positionAhead}</Text>
      <Text>Tours manqués : {myEntry.missed_turns}</Text>
      <Button title="Quitter la file" onPress={handleLeave} color="red" />
    </View>
  );
}