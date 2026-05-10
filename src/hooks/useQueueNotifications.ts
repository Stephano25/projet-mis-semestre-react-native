import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase/client';
import { QueueEntry } from '../types/database';

export function useQueueNotifications(entry: QueueEntry | null, queueId: string | undefined): void {
  const lastNotifiedRef = useRef<0 | 1 | 2>(0);

  useEffect(() => {
    if (!entry || entry.status !== 'waiting' || !queueId) return;

    const fetchAhead = async () => {
      const { count } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('queue_id', queueId)
        .eq('status', 'waiting')
        .lt('position', entry.position);

      const ahead = count ?? 0;

      if (ahead === 0 && lastNotifiedRef.current !== 2) {
        Alert.alert('Notification', "C'est votre tour ! Présentez-vous.");
        lastNotifiedRef.current = 2;
      } else if (ahead > 0 && ahead <= 3 && lastNotifiedRef.current === 0) {
        Alert.alert('Notification', `Plus que ${ahead} personne(s) devant vous.`);
        lastNotifiedRef.current = 1;
      }
    };

    fetchAhead();
    const interval = setInterval(fetchAhead, 5000);
    return () => clearInterval(interval);
  }, [entry?.id, entry?.status, entry?.position, queueId]);
}