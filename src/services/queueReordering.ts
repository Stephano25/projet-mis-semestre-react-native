import { supabase } from '../supabase/client';

// Réordonner les positions après suppression ou modification
export async function reorderQueue(queueId: string) {
  const { data: entries, error } = await supabase
    .from('queue_entries')
    .select('id, position')
    .eq('queue_id', queueId)
    .eq('status', 'waiting')
    .order('position', { ascending: true });
  if (error) throw error;
  for (let i = 0; i < entries.length; i++) {
    const newPos = i + 1;
    if (entries[i].position !== newPos) {
      await supabase.from('queue_entries').update({ position: newPos }).eq('id', entries[i].id);
    }
  }
}