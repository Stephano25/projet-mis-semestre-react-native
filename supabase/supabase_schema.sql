-- ============================================================
--  Invisible Queue – Supabase schema
--  Run this in the Supabase SQL editor (Dashboard → SQL editor)
-- ============================================================

-- 1. Table users (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table queues
CREATE TABLE IF NOT EXISTS public.queues (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  latitude   NUMERIC     NOT NULL,
  longitude  NUMERIC     NOT NULL,
  created_by UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table queue_entries
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id     UUID        NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name   TEXT,
  guest_email  TEXT,
  position     INTEGER     NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('waiting', 'served', 'missed', 'removed')),
  missed_turns INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_id ON public.queue_entries(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status   ON public.queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queues_location        ON public.queues(latitude, longitude);

-- ── Realtime ──────────────────────────────────────────────────────────────
ALTER TABLE public.queues        REPLICA IDENTITY FULL;
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'queues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "Users: public read"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Users: insert own profile"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users: update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- queues
CREATE POLICY "Queues: public read"
  ON public.queues FOR SELECT USING (true);

CREATE POLICY "Queues: authenticated insert"
  ON public.queues FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Queues: creator update"
  ON public.queues FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Queues: creator delete"
  ON public.queues FOR DELETE USING (auth.uid() = created_by);

-- queue_entries
CREATE POLICY "Entries: public read"
  ON public.queue_entries FOR SELECT USING (true);

CREATE POLICY "Entries: public insert"
  ON public.queue_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Entries: public update"
  ON public.queue_entries FOR UPDATE USING (true);

CREATE POLICY "Entries: public delete"
  ON public.queue_entries FOR DELETE USING (true);