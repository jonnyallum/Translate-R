-- Translate-R Database Schema
-- Supabase Migration
-- Run via: supabase db push

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  primary_language TEXT NOT NULL DEFAULT 'en',  -- ISO 639-1 code
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONTACTS
-- ============================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

-- ============================================
-- CALLS
-- ============================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_a_id UUID NOT NULL REFERENCES public.profiles(id),
  participant_b_id UUID REFERENCES public.profiles(id),  -- NULL until accepted
  daily_room_name TEXT,                                    -- Daily.co room identifier
  daily_room_url TEXT,                                     -- Daily.co room URL
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'missed')),
  language_a TEXT NOT NULL,                                -- participant A's language
  language_b TEXT,                                         -- participant B's language (set on join)
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_participants ON public.calls(participant_a_id, participant_b_id);
CREATE INDEX idx_calls_status ON public.calls(status) WHERE status = 'active';

-- ============================================
-- UTTERANCES
-- ============================================
CREATE TABLE public.utterances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker_user_id UUID NOT NULL REFERENCES public.profiles(id),
  source_language TEXT NOT NULL,          -- language spoken
  target_language TEXT NOT NULL,          -- language for the other party
  source_transcript_raw TEXT,            -- raw STT output
  source_transcript_clean TEXT,          -- cleaned / normalised
  literal_translation TEXT,              -- learning mode: structure-preserving
  natural_translation TEXT,              -- natural mode: fluent/idiomatic
  is_partial BOOLEAN NOT NULL DEFAULT false,  -- true while STT is still streaming
  sequence_number INTEGER NOT NULL DEFAULT 0,  -- ordering within a call
  start_time_ms INTEGER,                 -- ms offset from call start
  end_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_utterances_call ON public.utterances(call_id, created_at);
CREATE INDEX idx_utterances_speaker ON public.utterances(speaker_user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles: users can read any profile, update only their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Contacts: users can CRUD their own contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Calls: participants can view their own calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their calls"
  ON public.calls FOR SELECT
  TO authenticated
  USING (
    participant_a_id = auth.uid() OR participant_b_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create calls"
  ON public.calls FOR INSERT
  TO authenticated
  WITH CHECK (participant_a_id = auth.uid());

CREATE POLICY "Participants can update their calls"
  ON public.calls FOR UPDATE
  TO authenticated
  USING (
    participant_a_id = auth.uid() OR participant_b_id = auth.uid()
  );

-- Utterances: call participants can view utterances
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call participants can view utterances"
  ON public.utterances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = utterances.call_id
      AND (calls.participant_a_id = auth.uid() OR calls.participant_b_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert utterances"
  ON public.utterances FOR INSERT
  TO authenticated
  WITH CHECK (speaker_user_id = auth.uid());

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for utterances so clients get live updates
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

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
