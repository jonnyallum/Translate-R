// mobile/stores/authStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Profile, LanguageCode, TranslationMode } from '../types';

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  isInitialised: boolean;

  // Actions
  initialise: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setLanguage: (language: LanguageCode) => Promise<void>;
  setDefaultMode: (mode: TranslationMode) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialised: false,

  initialise: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({ user: profile, session, isLoading: false, isInitialised: true });
      } else {
        set({ user: null, session: null, isLoading: false, isInitialised: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          set({ user: profile, session });
        } else {
          set({ user: null, session: null });
        }
      });
    } catch (error) {
      console.error('Auth initialisation error:', error);
      set({ isLoading: false, isInitialised: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
      throw error;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      set({ user: profile, session: data.session, isLoading: false });
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) {
      set({ isLoading: false });
      throw error;
    }

    if (data.user) {
      // Wait a moment for the trigger to create the profile
      await new Promise((r) => setTimeout(r, 500));
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      set({ user: profile, session: data.session, isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    set({ user: data as Profile });
  },

  setLanguage: async (language) => {
    await get().updateProfile({ primary_language: language });
  },

  setDefaultMode: async (mode) => {
    await get().updateProfile({ default_mode: mode });
  },
}));
