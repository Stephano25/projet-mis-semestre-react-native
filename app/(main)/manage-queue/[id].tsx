import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { useLocalSearchParams, router } from 'expo-router';
import { markAsServed, handleMissedTurn } from '../../../src/services/queueService';
import { QueueEntry, Queue } from '../../../src/types/database';
import { useAuthStore } from '../../../src/store/authStore';

export default function ManageQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [waitingEntries, setWaitingEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueInfo, setQueueInfo] = useState<Queue | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!id) return;
    fetchQueueInfo();
    fetchWaiting();
  }, [id]);

  async function fetchQueueInfo() {
    const { data } = await supabase.from('queues').select('*').eq('id', id).single();
    setQueueInfo(data as Queue);
  }

  async function fetchWaiting() {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitingEntries(data as QueueEntry[] ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  async function callNext() {
    if (waitingEntries.length === 0) {
      Alert.alert('Info', 'Personne en file d’attente.');
      return;
    }
    const first = waitingEntries[0];
    await markAsServed(first.id, id);
    Alert.alert('Appelé', `${first.guest_name || first.user_id || 'Anonyme'} a été appelé.`);
    fetchWaiting();
  }

  async function markAbsent(entry: QueueEntry) {
    Alert.alert(
      'Absence',
      `Marquer ${entry.guest_name || entry.user_id || 'cet utilisateur'} comme absent ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await handleMissedTurn(entry.id, id, entry.missed_turns, entry.position);
            Alert.alert('Absence', `Tour manqué (${entry.missed_turns + 1}/3).`);
            fetchWaiting();
          }
        }
      ]
    );
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchWaiting();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const totalWaiting = waitingEntries.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* En-tête */}
      <View style={{ 
        backgroundColor: '#6366f1', 
        paddingTop: 48,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
          {queueInfo?.name || 'File d\'attente'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            paddingHorizontal: 12, 
            paddingVertical: 4, 
            borderRadius: 20,
            marginRight: 12,
          }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>
              🎫 {totalWaiting} en attente
            </Text>
          </View>
          {totalWaiting > 0 && (
            <View style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              paddingHorizontal: 12, 
              paddingVertical: 4, 
              borderRadius: 20,
            }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>
                ⏳ Prochain: #{waitingEntries[0]?.position}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bouton Appeler */}
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={callNext}
          disabled={totalWaiting === 0}
          style={{
            backgroundColor: totalWaiting === 0 ? '#d1d5db' : '#10b981',
            padding: 18,
            borderRadius: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 20 }}>🔔</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
            {totalWaiting === 0 ? 'File vide' : 'Appeler le suivant'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des personnes */}
      {totalWaiting === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>👥</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
            File vide
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
            Les utilisateurs qui rejoindront cette file apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={waitingEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      backgroundColor: item.position === 1 ? '#10b981' : '#6366f1',
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                      {item.position}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 16, color: '#1f2937' }}>
                      {item.guest_name || item.user_id?.slice(0, 8) || 'Anonyme'}
                    </Text>
                    {item.guest_email && (
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.guest_email}</Text>
                    )}
                  </View>
                </View>
                {item.missed_turns > 0 && (
                  <View style={{ marginLeft: 58 }}>
                    <Text style={{ color: '#f59e0b', fontSize: 12 }}>
                      ⚠️ {item.missed_turns} absence{item.missed_turns > 1 ? 's' : ''} sur 3
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => markAbsent(item)}
                style={{
                  backgroundColor: '#fef3c7',
                  borderWidth: 1,
                  borderColor: '#f59e0b',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
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