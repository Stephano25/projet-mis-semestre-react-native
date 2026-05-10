import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../../src/supabase/client';
import { QueueEntry, Queue } from '../../../src/types/database';
import { useAuthStore } from '../../../src/store/authStore';
import { addToQueue, leaveQueue } from '../../../src/services/queueService';
import * as Location from 'expo-location';
import { calculateDistance } from '../../../src/utils/distance';
import { useQueueNotifications } from '../../../src/hooks/useQueueNotifications';

export default function QueueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [myEntry, setMyEntry] = useState<QueueEntry | null>(null);
  const [positionAhead, setPositionAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const { user } = useAuthStore();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const subscriptionRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useQueueNotifications(myEntry, id);

  useEffect(() => {
    if (!id) return;
    fetchQueue();
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [id]);

  async function fetchQueue() {
    setLoading(true);
    const { data, error } = await supabase.from('queues').select('*').eq('id', id).single();
    if (error) console.error('Error loading queue:', error);
    else setQueue(data as Queue);
    setLoading(false);
  }

  async function refreshMyEntry() {
    if (!myEntry) return;
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', myEntry.id)
      .single();

    if (error || !data) return;
    const entry = data as QueueEntry;
    setMyEntry(entry);

    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .lt('position', entry.position);
    setPositionAhead(count ?? 0);

    if (entry.status === 'served') {
      Alert.alert('Vous avez été servi !', '', [{ text: 'OK', onPress: () => router.back() }]);
    } else if (entry.status === 'removed') {
      Alert.alert(
        'Retiré de la file',
        'Vous avez été exclu après 3 absences.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  function startPolling(entry: QueueEntry) {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(() => {
      // We call a version that uses the latest entry from state
      refreshEntryById(entry.id);
    }, 3000);
  }

  async function refreshEntryById(entryId: string) {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (!data) return;
    const entry = data as QueueEntry;
    setMyEntry(entry);

    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .lt('position', entry.position);
    setPositionAhead(count ?? 0);

    if (entry.status === 'served') {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      Alert.alert('Vous avez été servi !', '', [{ text: 'OK', onPress: () => router.back() }]);
    } else if (entry.status === 'removed') {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      Alert.alert('Retiré de la file', 'Vous avez été exclu après 3 absences.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  async function checkProximity(): Promise<boolean> {
    if (!queue) return false;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission GPS refusée', 'Activez la localisation pour rejoindre cette file.');
      return false;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const dist = calculateDistance(
      loc.coords.latitude,
      loc.coords.longitude,
      queue.latitude,
      queue.longitude
    );
    if (dist > 5) {
      Alert.alert('Hors zone', 'Vous devez être à moins de 5 km pour rejoindre cette file.');
      return false;
    }
    return true;
  }

  async function handleJoin() {
    if (!queue) return;
    const near = await checkProximity();
    if (!near) return;

    const userId = user?.id ?? null;
    const name = userId ? user?.name : guestName;
    const email = userId ? user?.email : guestEmail;

    if (!userId && (!name || !email)) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom et email');
      return;
    }

    setJoining(true);
    try {
      const entry = await addToQueue(id, userId, name ?? null, email ?? null);
      setMyEntry(entry);
      startPolling(entry);
    } catch {
      Alert.alert('Erreur', 'Impossible de rejoindre la file');
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!myEntry) return;
    Alert.alert('Quitter la file', 'Êtes-vous sûr de vouloir quitter cette file ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveQueue(myEntry.id, id);
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            router.back();
          } catch {
            Alert.alert('Erreur', 'Impossible de quitter la file');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!queue) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ color: '#6b7280' }}>File introuvable</Text>
      </View>
    );
  }

  // ── Join form ──────────────────────────────────────────────────────────────
  if (!myEntry) {
    return (
      <View style={{ padding: 24, flex: 1, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' }}>
          {queue.name}
        </Text>
        <Text style={{ color: '#6b7280', marginBottom: 24 }}>
          Rejoignez cette file d'attente virtuelle.
        </Text>

        {!user && (
          <>
            <TextInput
              placeholder="Nom complet"
              placeholderTextColor="#9ca3af"
              value={guestName}
              onChangeText={setGuestName}
              style={inputStyle}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={guestEmail}
              onChangeText={setGuestEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={inputStyle}
            />
          </>
        )}

        {user && (
          <View
            style={{
              backgroundColor: '#f0f9ff',
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#bae6fd',
            }}
          >
            <Text style={{ color: '#0369a1', fontWeight: '600' }}>
              Connecté en tant que {user.name}
            </Text>
            <Text style={{ color: '#0369a1', fontSize: 13 }}>{user.email}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleJoin}
          disabled={joining}
          style={{
            backgroundColor: joining ? '#93c5fd' : '#3b82f6',
            padding: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              Rejoindre la file
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Status panel ──────────────────────────────────────────────────────────
  return (
    <View style={{ padding: 16, flex: 1, backgroundColor: '#f9fafb' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>
        {queue.name}
      </Text>

      <InfoCard label="Votre position" value={String(myEntry.position)} />
      <InfoCard label="Personnes devant vous" value={String(positionAhead)} />
      <InfoCard
        label="Tours manqués"
        value={`${myEntry.missed_turns} / 3`}
        danger={myEntry.missed_turns >= 2}
      />

      <TouchableOpacity
        onPress={handleLeave}
        style={{
          marginTop: 24,
          backgroundColor: '#ef4444',
          padding: 14,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Quitter la file</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: danger ? '#ef4444' : '#1f2937' }}>
        {value}
      </Text>
    </View>
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