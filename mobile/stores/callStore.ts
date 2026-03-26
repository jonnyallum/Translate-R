// mobile/stores/callStore.ts
import { create } from 'zustand';
import { Call, Utterance, TranslationMode } from '../types';

interface CallState {
  activeCall: Call | null;
  dailyToken: string | null;
  utterances: Utterance[];
  partialText: string | null;  // Current partial STT result (typing indicator)
  mode: TranslationMode;
  isMuted: boolean;
  isCameraOn: boolean;
  isConnected: boolean;
  callStartTime: number | null;

  // Actions
  setActiveCall: (call: Call, token: string) => void;
  clearCall: () => void;
  addUtterance: (utterance: Utterance) => void;
  setPartialText: (text: string | null) => void;
  setMode: (mode: TranslationMode) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setConnected: (connected: boolean) => void;
  setCallStartTime: (time: number) => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  dailyToken: null,
  utterances: [],
  partialText: null,
  mode: 'natural',  // Default to natural mode
  isMuted: false,
  isCameraOn: true,
  isConnected: false,
  callStartTime: null,

  setActiveCall: (call, token) => {
    set({ activeCall: call, dailyToken: token, utterances: [], partialText: null });
  },

  clearCall: () => {
    set({
      activeCall: null,
      dailyToken: null,
      utterances: [],
      partialText: null,
      isConnected: false,
      isMuted: false,
      isCameraOn: true,
      callStartTime: null,
    });
  },

  addUtterance: (utterance) => {
    set((state) => {
      // Avoid duplicates
      if (state.utterances.some((u) => u.id === utterance.id)) {
        return state;
      }
      return {
        utterances: [...state.utterances, utterance].sort(
          (a, b) => a.sequence_number - b.sequence_number
        ),
        partialText: null,  // Clear partial when final arrives
      };
    });
  },

  setPartialText: (text) => set({ partialText: text }),

  setMode: (mode) => set({ mode }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  toggleCamera: () => set((s) => ({ isCameraOn: !s.isCameraOn })),

  setConnected: (connected) => set({ isConnected: connected }),

  setCallStartTime: (time) => set({ callStartTime: time }),
}));
