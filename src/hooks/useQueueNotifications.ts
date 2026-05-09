import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase/client';
import { QueueEntry } from '../types/database';

export function useQueueNotifications(entry: QueueEntry | null, queueId: string) {
  const [lastNotified, setLastNotified] = useState<number>(0);

  useEffect(() => {
    if (!entry || entry.status !== 'waiting') return;

    const fetchAhead = async () => {
      const { count } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('queue_id', queueId)
        .eq('status', 'waiting')
        .lt('position', entry.position);
      
      const ahead = count || 0;
      if (ahead <= 3 && ahead > 0 && lastNotified !== 1) {
        Alert.alert('Notification', `Plus que ${ahead} personne(s) devant vous`);
        setLastNotified(1);
      } else if (ahead === 0 && lastNotified !== 2) {
        Alert.alert('Notification', 'C’est votre tour ! Présentez-vous.');
        setLastNotified(2);
      }
    };

    fetchAhead();
    const interval = setInterval(fetchAhead, 5000);
    return () => clearInterval(interval);
  }, [entry, queueId, lastNotified]);
}