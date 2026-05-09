import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams } from 'expo-router';
import { reorderQueueEntries } from '../../../src/services/reordering';

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
    // Marquer comme servi
    await supabase.from('queue_entries').update({ status: 'served' }).eq('id', first.id);
    await reorderQueueEntries(id);
    Alert.alert('Succès', `Utilisateur ${first.guest_name || first.user_id} appelé`);
  }

  async function markAbsent(entryId: string, currentMissed: number, currentPosition: number) {
    const newMissed = currentMissed + 1;
    if (newMissed >= 3) {
      await supabase.from('queue_entries').update({ status: 'removed' }).eq('id', entryId);
    } else {
      await supabase
        .from('queue_entries')
        .update({ missed_turns: newMissed, position: currentPosition + 3 })
        .eq('id', entryId);
    }
    await reorderQueueEntries(id);
  }

  return (
    <View className="p-4">
      <Button title="Appeler le suivant" onPress={callNext} />
      <FlatList
        data={waitingEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="border-b p-2 flex-row justify-between">
            <Text>Position {item.position} - {item.guest_name || item.user_id}</Text>
            <Button title="Absent" onPress={() => markAbsent(item.id, item.missed_turns, item.position)} />
          </View>
        )}
      />
    </View>
  );
}