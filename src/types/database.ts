export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type Queue = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_by: string | null;
  created_at: string;
};

export type QueueEntry = {
  id: string;
  queue_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  position: number;
  status: 'waiting' | 'served' | 'missed' | 'removed';
  missed_turns: number;
  created_at: string;
};