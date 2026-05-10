import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, TextInput, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
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
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useQueueNotifications(myEntry, id);

  useEffect(() => {
    if (!id) return;
    fetchQueue();
    checkIfAlreadyJoined();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  async function fetchQueue() {
    const { data } = await supabase.from('queues').select('*').eq('id', id).single();
    setQueue(data as Queue);
  }

  async function checkIfAlreadyJoined() {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', id)
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .single();
    if (data) {
      setMyEntry(data as QueueEntry);
      await refreshMyEntry();
      startPolling();
    }
    setLoading(false);
  }

  async function refreshMyEntry() {
    if (!myEntry && !user) return;
    
    let entry = myEntry;
    if (!entry && user) {
      const { data } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('queue_id', id)
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .single();
      if (data) entry = data as QueueEntry;
    }
    
    if (!entry) return;
    
    // Rafraîchir l'entrée
    const { data } = await supabase.from('queue_entries').select('*').eq('id', entry.id).single();
    if (!data) return;
    
    const updatedEntry = data as QueueEntry;
    setMyEntry(updatedEntry);
    
    // Compter les personnes DEVANT (avec position inférieure ET status 'waiting')
    const { count: aheadCount } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', id)
      .eq('status', 'waiting')
      .lt('position', updatedEntry.position);
    
    // Compter le total des personnes en attente
    const { count: totalCount } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', id)
      .eq('status', 'waiting');
    
    setPositionAhead(aheadCount ?? 0);
    setTotalWaiting(totalCount ?? 0);
    
    // Vérifier si servi ou exclu
    if (updatedEntry.status === 'served') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      Alert.alert('Vous avez été servi !', '', [{ text: 'OK', onPress: () => router.back() }]);
    } else if (updatedEntry.status === 'removed') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      Alert.alert('Exclu', 'Vous avez été retiré après 3 absences.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  }

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(refreshMyEntry, 2000); // Rafraîchir toutes les 2 secondes
  }

  async function checkProximity(): Promise<boolean> {
    if (!queue) return false;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission GPS refusée');
      return false;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const dist = calculateDistance(loc.coords.latitude, loc.coords.longitude, queue.latitude, queue.longitude);
    if (dist > 5) {
      Alert.alert('Hors zone', `Vous êtes à ${dist.toFixed(2)} km. Maximum 5 km.`);
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
      await refreshMyEntry();
      startPolling();
      Alert.alert('Succès', `Vous êtes à la position ${entry.position} !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rejoindre la file');
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!myEntry) return;
    Alert.alert('Quitter', 'Voulez-vous vraiment quitter cette file ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          await leaveQueue(myEntry.id, id);
          router.back();
        },
      },
    ]);
  }

  const onRefresh = () => {
    setRefreshing(true);
    refreshMyEntry();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator size="large" color="#3b82f6" />;
  if (!queue) return <Text style={{ padding: 16 }}>File introuvable</Text>;

  // Formulaire d'inscription (invité)
  if (!myEntry && !user) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' }}>
            {queue.name}
          </Text>
          <Text style={{ color: '#6b7280', marginBottom: 24 }}>
            Rejoignez cette file d'attente virtuelle.
          </Text>

          <TextInput
            placeholder="Nom complet"
            placeholderTextColor="#9ca3af"
            value={guestName}
            onChangeText={setGuestName}
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: 14,
              marginVertical: 6,
              borderRadius: 10,
              backgroundColor: '#f9fafb',
              fontSize: 15,
            }}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={guestEmail}
            onChangeText={setGuestEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              padding: 14,
              marginVertical: 6,
              borderRadius: 10,
              backgroundColor: '#f9fafb',
              fontSize: 15,
            }}
          />

          <TouchableOpacity
            onPress={handleJoin}
            disabled={joining}
            style={{
              backgroundColor: joining ? '#93c5fd' : '#3b82f6',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              {joining ? 'Inscription...' : 'Rejoindre la file'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Si utilisateur connecté mais pas dans la file
  if (!myEntry && user) {
    return (
      <View style={{ padding: 24, flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
          Vous n'êtes pas dans cette file.
        </Text>
        <TouchableOpacity
          onPress={handleJoin}
          style={{ marginTop: 16, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Rejoindre la file</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Suivi de la position
  const isMyTurn = positionAhead === 0 && myEntry?.position === 1;
  const isAlmostTurn = positionAhead > 0 && positionAhead <= 3;

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
      }
    >
      <View style={{ padding: 20 }}>
        {/* En-tête */}
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' }}>
          {queue.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          📊 {totalWaiting} personne{totalWaiting !== 1 ? 's' : ''} en attente
        </Text>

        {/* Votre numéro */}
        <View style={{ 
          backgroundColor: '#dbeafe', 
          borderRadius: 20, 
          padding: 24, 
          marginBottom: 16,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#bfdbfe'
        }}>
          <Text style={{ fontSize: 14, color: '#1e40af', marginBottom: 8 }}>Votre numéro</Text>
          <Text style={{ fontSize: 56, fontWeight: 'bold', color: '#1e40af' }}>#{myEntry?.position}</Text>
        </View>

        {/* Personnes devant vous */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Personnes devant vous</Text>
          <Text style={{ fontSize: 42, fontWeight: 'bold', color: positionAhead === 0 ? '#10b981' : '#f59e0b' }}>
            {positionAhead}
          </Text>
          
          {/* Message si c'est bientôt son tour */}
          {isAlmostTurn && !isMyTurn && (
            <View style={{ marginTop: 12, padding: 10, backgroundColor: '#fef3c7', borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: '#d97706', textAlign: 'center' }}>
                ⏰ Plus que {positionAhead} personne{positionAhead !== 1 ? 's' : ''} avant vous !
              </Text>
              <Text style={{ fontSize: 12, color: '#d97706', textAlign: 'center', marginTop: 4 }}>
                Préparez-vous, votre tour arrive bientôt.
              </Text>
            </View>
          )}
          
          {/* Message si c'est son tour */}
          {isMyTurn && (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8 }}>
              <Text style={{ fontSize: 16, color: '#065f46', fontWeight: 'bold', textAlign: 'center' }}>
                🎉 C'est votre tour !
              </Text>
              <Text style={{ fontSize: 14, color: '#065f46', textAlign: 'center', marginTop: 4 }}>
                Présentez-vous au guichet.
              </Text>
            </View>
          )}
        </View>

        {/* Progression vers le tour */}
        {myEntry && positionAhead > 0 && (
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 16, 
            padding: 16, 
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Progression</Text>
            <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ 
                width: `${((totalWaiting - positionAhead) / totalWaiting) * 100}%`, 
                height: 8, 
                backgroundColor: '#3b82f6',
                borderRadius: 4,
              }} />
            </View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
              {totalWaiting - positionAhead} sur {totalWaiting} personnes passées
            </Text>
          </View>
        )}

        {/* Tours manqués */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Tours manqués</Text>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: (myEntry?.missed_turns ?? 0) >= 3 ? '#ef4444' : '#f59e0b' }}>
            {myEntry?.missed_turns ?? 0} / 3
          </Text>
          {(myEntry?.missed_turns ?? 0) > 0 && (
            <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              ⚠️ Après 3 absences, vous serez exclu
            </Text>
          )}
        </View>

        {/* Bouton quitter */}
        <TouchableOpacity
          onPress={handleLeave}
          style={{ 
            backgroundColor: '#ef4444', 
            padding: 16, 
            borderRadius: 12, 
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Quitter la file</Text>
        </TouchableOpacity>

        {/* Indicateur de mise à jour */}
        <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>
          🔄 Mise à jour automatique • {positionAhead} personne(s) devant vous
        </Text>
      </View>
    </ScrollView>
  );
}