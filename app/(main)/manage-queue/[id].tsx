import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams } from 'expo-router';
import { markAsServed, handleMissedTurn } from '../../../src/services/queueService';
import { QueueEntry } from '../../../src/types/database';

export default function ManageQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [waitingEntries, setWaitingEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    fetchWaiting();

    const channel = supabase.channel(`manage_${id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` }, () => {
      fetchWaiting();
    });
    subscriptionRef.current = channel.subscribe();

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [id]);

  async function fetchWaiting() {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitingEntries(data as QueueEntry[] ?? []);
    setLoading(false);
  }

  async function callNext() {
    if (waitingEntries.length === 0) {
      Alert.alert('Info', 'Personne en file d’attente.');
      return;
    }
    const first = waitingEntries[0];
    await markAsServed(first.id, id);
    Alert.alert('Appelé', `${first.guest_name || first.user_id || 'Anonyme'} a été servi.`);
  }

  async function markAbsent(entry: QueueEntry) {
    await handleMissedTurn(entry.id, id, entry.missed_turns, entry.position);
    Alert.alert('Absence', `Tour manqué (${entry.missed_turns + 1}/3).`);
  }

  if (loading) return <ActivityIndicator size="large" color="#3b82f6" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={callNext}
          disabled={waitingEntries.length === 0}
          style={{ backgroundColor: waitingEntries.length === 0 ? '#d1d5db' : '#10b981', padding: 14, borderRadius: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>▶ Appeler le suivant</Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 12, color: '#6b7280', textAlign: 'center' }}>{waitingEntries.length} personne(s) en attente</Text>
      </View>

      {waitingEntries.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9ca3af' }}>La file est vide</Text>
        </View>
      ) : (
        <FlatList
          data={waitingEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 16 }}>#{item.position} – {item.guest_name || item.user_id || 'Anonyme'}</Text>
                {item.guest_email && <Text style={{ color: '#6b7280', fontSize: 13 }}>{item.guest_email}</Text>}
                {item.missed_turns > 0 && <Text style={{ color: '#f59e0b', fontSize: 13 }}>{item.missed_turns} absence(s)</Text>}
              </View>
              <TouchableOpacity onPress={() => markAbsent(item)} style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#b45309', fontWeight: '600' }}>Absent</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}