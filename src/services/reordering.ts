import { supabase } from '../supabase/client';

/**
 * Reorders all 'waiting' entries in a queue so positions are contiguous (1, 2, 3…).
 * Called after any mutation (join, leave, serve, penalise).
 */
export async function reorderQueueEntries(queueId: string): Promise<void> {
  const { data: entries, error } = await supabase
    .from('queue_entries')
    .select('id, position')
    .eq('queue_id', queueId)
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  if (error || !entries) return;

  const updates = entries
    .map((e, i) => ({ id: e.id, newPosition: i + 1 }))
    .filter(({ id, newPosition }) => {
      const entry = entries.find((e) => e.id === id);
      return entry && entry.position !== newPosition;
    });

  await Promise.all(
    updates.map(({ id, newPosition }) =>
      supabase.from('queue_entries').update({ position: newPosition }).eq('id', id)
    )
  );
}