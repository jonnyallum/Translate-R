-- ═══════════════════════════════════════════════════════════
-- TRANSLATE-R — COMPLETE DATABASE SETUP
-- Paste this ENTIRE file into Supabase SQL Editor and click Run
-- https://supabase.com/dashboard/project/htykdntnwzobolnqqdul/sql/new
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  primary_language TEXT NOT NULL DEFAULT 'en',
  default_mode TEXT NOT NULL DEFAULT 'natural' CHECK (default_mode IN ('learning', 'natural')),
  show_original_text BOOLEAN NOT NULL DEFAULT true,
  font_size TEXT NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TABLE: contacts
-- ============================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

-- ============================================
-- TABLE: calls
-- ============================================
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_a_id UUID NOT NULL REFERENCES public.profiles(id),
  participant_b_id UUID REFERENCES public.profiles(id),
  daily_room_name TEXT,
  daily_room_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'missed')),
  language_a TEXT NOT NULL,
  language_b TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_participants ON public.calls(participant_a_id, participant_b_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status) WHERE status = 'active';

-- ============================================
-- TABLE: utterances
-- ============================================
CREATE TABLE IF NOT EXISTS public.utterances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker_user_id UUID NOT NULL REFERENCES public.profiles(id),
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  source_transcript_raw TEXT,
  source_transcript_clean TEXT,
  literal_translation TEXT,
  natural_translation TEXT,
  is_partial BOOLEAN NOT NULL DEFAULT false,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  start_time_ms INTEGER,
  end_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utterances_call ON public.utterances(call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_utterances_speaker ON public.utterances(speaker_user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DO $$ BEGIN
  CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contacts policies
DO $$ BEGIN
  CREATE POLICY "View own contacts" ON public.contacts
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Insert own contacts" ON public.contacts
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Delete own contacts" ON public.contacts
    FOR DELETE TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Calls policies
DO $$ BEGIN
  CREATE POLICY "Participants view calls" ON public.calls
    FOR SELECT TO authenticated
    USING (participant_a_id = auth.uid() OR participant_b_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Create calls" ON public.calls
    FOR INSERT TO authenticated WITH CHECK (participant_a_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Update own calls" ON public.calls
    FOR UPDATE TO authenticated
    USING (participant_a_id = auth.uid() OR participant_b_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Utterances policies
DO $$ BEGIN
  CREATE POLICY "Participants view utterances" ON public.utterances
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.calls
        WHERE calls.id = utterances.call_id
        AND (calls.participant_a_id = auth.uid() OR calls.participant_b_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Insert utterances" ON public.utterances
    FOR INSERT TO authenticated WITH CHECK (speaker_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.utterances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- VERIFY
-- ============================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
