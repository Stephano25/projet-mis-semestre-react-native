import { supabase } from '../supabase/client';

export async function reorderQueueEntries(queueId: string) {
  // Récupère toutes les entrées "waiting" triées par position
  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, position')
    .eq('queue_id', queueId)
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  if (!entries) return;

  // Met à jour les positions de manière séquentielle
  for (let i = 0; i < entries.length; i++) {
    const newPosition = i + 1;
    if (entries[i].position !== newPosition) {
      await supabase
        .from('queue_entries')
        .update({ position: newPosition })
        .eq('id', entries[i].id);
    }
  }
}