import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/client';
import { Queue } from '../../src/types/database';
import * as Location from 'expo-location';
import { calculateDistance } from '../../src/utils/distance';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const RADIUS_KM = 50; // Augmenté à 50 km

export default function QueuesList() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      console.log('📍 Position actuelle:', loc.coords.latitude, loc.coords.longitude);
      setLocation(loc);
    })();
  }, []);

  async function loadQueues() {
    if (!location) return;
    
    const { data, error } = await supabase.from('queues').select('*');
    if (error) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les files');
      setLoading(false);
      return;
    }
    
    if (data && data.length > 0) {
      const nearby = (data as Queue[]).filter((q) => {
        const dist = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          q.latitude,
          q.longitude
        );
        console.log(`📏 Distance à ${q.name}: ${dist.toFixed(2)} km`);
        return dist <= RADIUS_KM;
      });
      setQueues(nearby);
      if (nearby.length === 0 && data.length > 0) {
        console.log('⚠️ Aucune file dans le rayon, mais des files existent plus loin');
      }
    } else {
      setQueues([]);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, color: '#ef4444', textAlign: 'center', marginBottom: 8 }}>
          Permission GPS refusée
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>
          Activez la localisation pour voir les files à proximité.
        </Text>
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: '#9ca3af', marginBottom: 16 }}>
          Aucune file à proximité
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>
          Rayon de recherche: {RADIUS_KM} km
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 8 }}
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
      renderItem={({ item }) => {
        const dist = location
          ? calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              item.latitude,
              item.longitude
            ).toFixed(2)
          : '—';
        return (
          <View>
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
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>
                {item.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                📍 {dist} km
              </Text>
            </TouchableOpacity>
            {user && item.created_by === user.id && (
              <TouchableOpacity
                onPress={() => router.push(`/manage-queue/${item.id}`)}
                style={{ marginTop: -8, marginBottom: 12, backgroundColor: '#10b981', padding: 8, borderRadius: 6, alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Gérer la file</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}