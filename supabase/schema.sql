-- 1. Table users (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table queues
CREATE TABLE IF NOT EXISTS public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table queue_entries
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'served', 'missed', 'removed')),
  missed_turns INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_queue_entries_queue_id ON public.queue_entries(queue_id);
CREATE INDEX idx_queue_entries_status ON public.queue_entries(status);
CREATE INDEX idx_queues_location ON public.queues(latitude, longitude);

-- Activation Realtime
ALTER TABLE public.queues REPLICA IDENTITY FULL;
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.queues, public.queue_entries;
COMMIT;

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Users : lecture publique pour les infos de base, écriture seulement par l'utilisateur
CREATE POLICY "Users can read any user" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Queues : lecture publique, insertion seulement pour les authentifiés
CREATE POLICY "Anyone can read queues" ON public.queues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create queues" ON public.queues FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only creator can update/delete queue" ON public.queues FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Only creator can delete queue" ON public.queues FOR DELETE USING (auth.uid() = created_by);

-- Queue entries : lecture publique, insertion publique (invités + auth), modifications par système
CREATE POLICY "Anyone can read queue entries" ON public.queue_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert into queue entries" ON public.queue_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update entries" ON public.queue_entries FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION handle_missed_turn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'missed' AND OLD.status = 'waiting' THEN
    UPDATE queue_entries
    SET missed_turns = missed_turns + 1,
        position = position + 3
    WHERE id = NEW.id;
    
    IF (SELECT missed_turns FROM queue_entries WHERE id = NEW.id) >= 3 THEN
      UPDATE queue_entries SET status = 'removed' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_missed
AFTER UPDATE OF status ON queue_entries
FOR EACH ROW
EXECUTE FUNCTION handle_missed_turn();