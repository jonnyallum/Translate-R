-- Translate-R Migration 002: Row Level Security + Realtime
-- Run this AFTER migration.sql (001) succeeds
-- Paste into Supabase Dashboard → SQL Editor → Run

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Contacts
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

-- Calls
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

-- Utterances
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

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- SERVICE ROLE BYPASS (for backend operations)
-- ============================================
-- The service_role key bypasses RLS by default in Supabase
-- Our backend uses this for inserting utterances on behalf of users

-- Verify everything worked
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
