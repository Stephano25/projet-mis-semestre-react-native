import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/client';
import { Queue } from '../../src/types/database';
import * as Location from 'expo-location';
import { calculateDistance } from '../../src/utils/distance';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const RADIUS_KM = 50;

// Type étendu avec la distance
interface QueueWithDistance extends Queue {
  distance: number;
}

// Icône par défaut pour les files
const getQueueIcon = (name: string) => {
  if (name.toLowerCase().includes('cafétéria') || name.toLowerCase().includes('restaurant')) {
    return '🍽️';
  }
  if (name.toLowerCase().includes('bibliothèque')) {
    return '📚';
  }
  if (name.toLowerCase().includes('administration') || name.toLowerCase().includes('scolarité')) {
    return '📋';
  }
  if (name.toLowerCase().includes('classe') || name.toLowerCase().includes('cours')) {
    return '📖';
  }
  if (name.toLowerCase().includes('guichet')) {
    return '🎫';
  }
  return '📍';
};

export default function QueuesList() {
  const [queues, setQueues] = useState<QueueWithDistance[]>([]);
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
      console.log('📍 Position:', loc.coords.latitude, loc.coords.longitude);
      setLocation(loc);
    })();
  }, []);

  async function loadQueues() {
    if (!location) return;
    
    const { data, error } = await supabase.from('queues').select('*');
    if (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
      return;
    }
    
    if (data && data.length > 0) {
      // Calculer la distance pour chaque file
      const withDistance = (data as Queue[]).map((q) => ({
        ...q,
        distance: calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          q.latitude,
          q.longitude
        )
      }));
      
      const nearby = withDistance.filter((q) => q.distance <= RADIUS_KM);
      const sorted = nearby.sort((a, b) => a.distance - b.distance);
      setQueues(sorted);
      console.log(`✅ ${sorted.length} file(s) trouvée(s)`);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 12, color: '#9ca3af' }}>Chargement des files...</Text>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f9fafb' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
            Permission GPS refusée
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
            Activez la localisation pour voir les files à proximité.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#6366f1', borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f9fafb' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏪</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
            Aucune file à proximité
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
            Aucune file d'attente n'est disponible dans un rayon de {RADIUS_KM} km.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#6366f1', borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={queues}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
            {queues.length} file{queues.length > 1 ? 's' : ''} disponible{queues.length > 1 ? 's' : ''}
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>
            Triées par distance croissante
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        // Vérifier que distance existe
        const dist = item.distance !== undefined ? item.distance.toFixed(2) : '0.00';
        const icon = getQueueIcon(item.name);
        
        let distanceColor = '#10b981';
        if (parseFloat(dist) > 1) distanceColor = '#f59e0b';
        if (parseFloat(dist) > 3) distanceColor = '#ef4444';
        
        return (
          <TouchableOpacity
            onPress={() => router.push(`/queue/${item.id}`)}
            activeOpacity={0.7}
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              marginBottom: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
              borderWidth: 1,
              borderColor: '#f3f4f6',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#f0fdf4',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 28 }}>{icon}</Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 4 }}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: distanceColor, fontWeight: '500' }}>
                    🚶 {dist} km
                  </Text>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginHorizontal: 8 }} />
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                    🎫 En attente
                  </Text>
                </View>
              </View>
              
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#f3f4f6',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 16, color: '#9ca3af' }}>→</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}