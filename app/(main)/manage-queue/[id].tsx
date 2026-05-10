import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams } from 'expo-router';
import { markAsServed, handleMissedTurn } from '../../../src/services/queueService';
import { QueueEntry } from '../../../src/types/database';

export default function ManageQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [waitingEntries, setWaitingEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchWaiting();

    // Real-time subscription
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);

    const channel = supabase.channel(`manage_${id}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${id}` },
      () => fetchWaiting()
    );
    subscriptionRef.current = channel.subscribe();

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [id]);

  async function fetchWaiting() {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (error) {
      console.error('Error loading queue entries:', error);
    } else {
      setWaitingEntries((data as QueueEntry[]) ?? []);
    }
    setLoading(false);
  }

  async function callNext() {
    if (waitingEntries.length === 0) {
      Alert.alert('Info', "Il n'y a personne en file d'attente.");
      return;
    }
    const first = waitingEntries[0];
    try {
      await markAsServed(first.id, id);
      const name = first.guest_name || first.user_id || 'Anonyme';
      Alert.alert('Servi', `${name} a été appelé.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de passer au suivant.');
    }
  }

  async function markAbsent(entry: QueueEntry) {
    try {
      await handleMissedTurn(entry.id, id, entry.missed_turns, entry.position);
      const newMissed = entry.missed_turns + 1;
      if (newMissed >= 3) {
        Alert.alert('Exclu', "L'utilisateur a été retiré de la file après 3 absences.");
      } else {
        Alert.alert('Retard', `L'utilisateur a été reculé de 3 positions (${newMissed}/3).`);
      }
    } catch {
      Alert.alert('Erreur', "Impossible de marquer l'absence.");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header action */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity
          onPress={callNext}
          disabled={waitingEntries.length === 0}
          style={{
            backgroundColor: waitingEntries.length === 0 ? '#d1d5db' : '#10b981',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            ▶ Appeler le suivant
          </Text>
        </TouchableOpacity>

        <Text style={{ marginTop: 12, color: '#6b7280', textAlign: 'center' }}>
          {waitingEntries.length} personne{waitingEntries.length !== 1 ? 's' : ''} en attente
        </Text>
      </View>

      {waitingEntries.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9ca3af', fontSize: 16 }}>La file est vide</Text>
        </View>
      ) : (
        <FlatList
          data={waitingEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#1f2937' }}>
                  #{item.position} – {item.guest_name || item.user_id || 'Anonyme'}
                </Text>
                {item.guest_email ? (
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>{item.guest_email}</Text>
                ) : null}
                {item.missed_turns > 0 && (
                  <Text style={{ color: '#f59e0b', fontSize: 13 }}>
                    {item.missed_turns} absence{item.missed_turns > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => markAbsent(item)}
                style={{
                  backgroundColor: '#fef3c7',
                  borderWidth: 1,
                  borderColor: '#f59e0b',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#b45309', fontWeight: '600' }}>Absent</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}