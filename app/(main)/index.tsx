import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
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
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    async function getLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } else {
        setPermissionDenied(true);
        setLoading(false);
      }
    }
    getLocation();
  }, []);

  async function loadQueues() {
    if (!location) return;
    
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
    setRefreshing(false);
  }

  useEffect(() => {
    if (location) {
      loadQueues();
    }
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQueues();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: '#ef4444', textAlign: 'center' }}>
          Permission GPS refusée
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
          Activez la localisation pour voir les files à proximité
        </Text>
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#9ca3af' }}>Aucune file à proximité</Text>
        <TouchableOpacity 
          onPress={onRefresh} 
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={queues}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
      }
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