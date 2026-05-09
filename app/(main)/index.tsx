import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/client';
import { Queue } from '../../src/types/database';
import * as Location from 'expo-location';
import { calculateDistance } from '../../src/utils/distance';

const RADIUS_KM = 5;

export default function QueuesList() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  useEffect(() => {
    if (!location) return;
    fetchQueues();
    const subscription = supabase
      .channel('queues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, () => fetchQueues())
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [location]);

  async function fetchQueues() {
    const { data, error } = await supabase.from('queues').select('*');
    if (error) console.error(error);
    else {
      const filtered = (data as Queue[]).filter(q => {
        const dist = calculateDistance(location!.coords.latitude, location!.coords.longitude, q.latitude, q.longitude);
        return dist <= RADIUS_KM;
      });
      setQueues(filtered);
    }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator size="large" />;
  return (
    <FlatList
      data={queues}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="p-4 m-2 bg-white rounded-lg shadow">
          <Text className="text-lg font-bold">{item.name}</Text>
          <Text>Distance: {calculateDistance(location!.coords.latitude, location!.coords.longitude, item.latitude, item.longitude).toFixed(2)} km</Text>
        </View>
      )}
    />
  );
}