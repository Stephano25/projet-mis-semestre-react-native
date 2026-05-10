import { supabase } from '../supabase/client';
import { QueueEntry } from '../types/database';
import { reorderQueueEntries } from './reordering';

export async function getNextPosition(queueId: string): Promise<number> {
  const { count } = await supabase
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .eq('queue_id', queueId)
    .eq('status', 'waiting');
  return (count ?? 0) + 1;
}

export async function addToQueue(
  queueId: string,
  userId: string | null,
  guestName: string | null | undefined,
  guestEmail: string | null | undefined
): Promise<QueueEntry> {
  const position = await getNextPosition(queueId);
  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      queue_id: queueId,
      user_id: userId,
      guest_name: guestName ?? null,
      guest_email: guestEmail ?? null,
      position,
      status: 'waiting',
      missed_turns: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as QueueEntry;
}

export async function leaveQueue(entryId: string, queueId: string): Promise<void> {
  await supabase.from('queue_entries').delete().eq('id', entryId);
  await reorderQueueEntries(queueId);
}

export async function markAsServed(entryId: string, queueId: string): Promise<void> {
  await supabase.from('queue_entries').update({ status: 'served' }).eq('id', entryId);
  await reorderQueueEntries(queueId);
}

export async function handleMissedTurn(
  entryId: string,
  queueId: string,
  currentMissed: number,
  currentPosition: number
): Promise<void> {
  const newMissed = currentMissed + 1;

  if (newMissed >= 3) {
    await supabase
      .from('queue_entries')
      .update({ status: 'removed', missed_turns: newMissed })
      .eq('id', entryId);
  } else {
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', queueId)
      .eq('status', 'waiting');
    const maxPosition = count ?? currentPosition;
    const newPosition = Math.min(currentPosition + 3, maxPosition);

    await supabase
      .from('queue_entries')
      .update({ missed_turns: newMissed, position: newPosition })
      .eq('id', entryId);
  }

  await reorderQueueEntries(queueId);
}