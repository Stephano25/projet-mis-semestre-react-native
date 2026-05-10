import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams } from 'expo-router';
import { markAsServed, handleMissedTurn } from '../../../src/services/queueService';

export default function ManageQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [waitingEntries, setWaitingEntries] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    fetchWaiting();

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
    
    const channel = supabase.channel(`manage_${id}`);
    channel.on('postgres_changes', 
      { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` },
      () => fetchWaiting()
    );
    subscriptionRef.current = channel.subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [id]);

  async function fetchWaiting() {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (error) console.error('Erreur chargement file d’attente:', error);
    else setWaitingEntries(data || []);
  }

  async function callNext() {
    if (waitingEntries.length === 0) {
      Alert.alert('Info', 'Il n’y a personne en file d’attente.');
      return;
    }
    const first = waitingEntries[0];
    try {
      await markAsServed(first.id, id);
      Alert.alert('Succès', `Utilisateur ${first.guest_name || first.user_id || 'anonyme'} appelé`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de passer au suivant.');
    }
  }

  async function markAbsent(entryId: string, currentMissed: number, currentPosition: number) {
    try {
      await handleMissedTurn(entryId, id, currentMissed, currentPosition);
      Alert.alert('Retard', "L'utilisateur a été reculé de 3 positions.");
    } catch (error) {
      Alert.alert('Erreur', "Impossible de marquer l'absence.");
    }
  }

  return (
    <View style={{ padding: 16 }}>
      <Button title="Appeler le suivant" onPress={callNext} />
      <FlatList
        data={waitingEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ borderBottomWidth: 1, padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Position {item.position} - {item.guest_name || item.user_id || 'Inconnu'}</Text>
            <Button title="Absent" onPress={() => markAbsent(item.id, item.missed_turns, item.position)} />
          </View>
        )}
      />
    </View>
  );
}