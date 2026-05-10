import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/client';
import { Queue } from '../../src/types/database';
import * as Location from 'expo-location';
import { calculateDistance } from '../../src/utils/distance';
import { router } from 'expo-router';

const RADIUS_KM = 5;

export default function QueuesList() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Permission GPS
  useEffect(() => {
    async function getLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } else {
        setLoading(false);
      }
    }
    getLocation();
  }, []);

  // Chargement des files
  useEffect(() => {
    if (!location) return;

    async function loadQueues() {
      const { data, error } = await supabase.from('queues').select('*');
      if (!error && data) {
        const filtered = data.filter((q: Queue) => {
          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            q.latitude,
            q.longitude
          );
          return dist <= RADIUS_KM;
        });
        setQueues(filtered);
      }
      setLoading(false);
    }

    loadQueues();

    // Realtime sans erreur
    const channel = supabase
      .channel('queues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => {
        loadQueues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#9ca3af' }}>Aucune file à proximité</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={queues}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
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
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            📍 Distance: {calculateDistance(
              location!.coords.latitude,
              location!.coords.longitude,
              item.latitude,
              item.longitude
            ).toFixed(2)} km
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}