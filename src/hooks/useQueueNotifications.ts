import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase/client';
import { QueueEntry } from '../types/database';

/**
 * Polls every 5 s to check how many people are ahead of the user.
 * Fires an in-app alert when ≤ 3 remain and again when it is their turn.
 * Uses a ref to avoid re-triggering the same notification.
 */
export function useQueueNotifications(
  entry: QueueEntry | null,
  queueId: string | undefined
): void {
  // 0 = no notification sent, 1 = "almost your turn", 2 = "your turn"
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