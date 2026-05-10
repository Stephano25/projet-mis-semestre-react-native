import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../src/supabase/client';
import { Queue } from '../../src/types/database';
import * as Location from 'expo-location';
import { calculateDistance } from '../../src/utils/distance';
import { router } from 'expo-router';

const RADIUS_KM = 5;

export default function QueuesList() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  async function loadQueues() {
    if (!location) return;
    const { data, error } = await supabase.from('queues').select('*');
    if (!error && data) {
      const nearby = (data as Queue[]).filter((q) => {
        const dist = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          q.latitude,
          q.longitude
        );
        return dist <= RADIUS_KM;
      });
      setQueues(nearby);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!location) return;
    loadQueues();

    // ✅ ORDRE CORRECT : canal → .on() → .subscribe()
    const channel = supabase.channel('queues-channel');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => {
      loadQueues();
    });
    subscriptionRef.current = channel.subscribe();

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQueues();
  };

  if (loading) return <ActivityIndicator size="large" color="#3b82f6" />;
  if (permissionDenied) return ( /* message permission refusée */ );
  if (queues.length === 0) return ( /* message vide + bouton actualiser */ );

  return (
    <FlatList
      data={queues}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/queue/${item.id}`)}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>{item.name}</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            📍 {calculateDistance(location!.coords.latitude, location!.coords.longitude, item.latitude, item.longitude).toFixed(2)} km
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}