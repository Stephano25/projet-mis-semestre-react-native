import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams } from 'expo-router';
import { markAsServed, handleMissedTurn } from '../../../src/services/queueService';

export default function ManageQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [waitingEntries, setWaitingEntries] = useState<any[]>([]);

  useEffect(() => {
    fetchWaiting();
    const subscription = supabase
      .channel(`manage_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` }, () => fetchWaiting())
      .subscribe();
    return () => subscription.unsubscribe();
  }, [id]);

  async function fetchWaiting() {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitingEntries(data || []);
  }

  async function callNext() {
    if (waitingEntries.length === 0) return;
    const first = waitingEntries[0];
    await markAsServed(first.id, id);
    Alert.alert('Succès', `Utilisateur ${first.guest_name || first.user_id} appelé`);
  }

  async function markAbsent(entryId: string, currentMissed: number, currentPosition: number) {
    await handleMissedTurn(entryId, id, currentMissed, currentPosition);
  }

  return (
    <View style={{ padding: 16 }}>
      <Button title="Appeler le suivant" onPress={callNext} />
      <FlatList
        data={waitingEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ borderBottomWidth: 1, padding: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>Position {item.position} - {item.guest_name || item.user_id}</Text>
            <Button title="Absent" onPress={() => markAbsent(item.id, item.missed_turns, item.position)} />
          </View>
        )}
      />
    </View>
  );
}