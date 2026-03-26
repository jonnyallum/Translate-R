// mobile/app/call/[id].tsx
// The core call screen — WebRTC video + live subtitles + Learning/Natural toggle
//
// Layout (top to bottom):
// 1. Remote video (fills most of the screen)
// 2. Local video (small PiP in top-right corner)
// 3. Subtitle overlay (bottom 40% of screen, over video)
// 4. Mode toggle (centered above subtitles)
// 5. Call controls (bottom bar)

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCall } from '../../hooks/useCall';
import { useUtterances } from '../../hooks/useUtterances';
import { useSpeechToUtterances } from '../../hooks/useSpeechToUtterances';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';
import { SubtitleList } from '../../components/SubtitleList';
import { ModeToggle } from '../../components/ModeToggle';
import { CallControls } from '../../components/CallControls';
import { LanguageCode, LANGUAGE_FLAGS } from '../../types';

export default function CallScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    activeCall,
    utterances,
    partialText,
    mode,
    isMuted,
    isCameraOn,
    isConnected,
    setMode,
  } = useCallStore();

  const {
    toggleMute,
    toggleCamera,
    hangUp,
  } = useCall();

  // Subscribe to real-time utterance updates
  useUtterances(callId);

  // Determine language pairing
  const isParticipantA = activeCall?.participant_a_id === user?.id;
  const myLanguage = isParticipantA
    ? (activeCall?.language_a as LanguageCode)
    : (activeCall?.language_b as LanguageCode);
  const theirLanguage = isParticipantA
    ? (activeCall?.language_b as LanguageCode)
    : (activeCall?.language_a as LanguageCode);

  // Start speech recognition
  const { isListening } = useSpeechToUtterances({
    callId: callId || '',
    sourceLanguage: myLanguage || 'en',
    targetLanguage: theirLanguage || 'th',
    enabled: isConnected && !isMuted,
  });

  // Handle hang up — navigate back
  const handleHangUp = useCallback(async () => {
    await hangUp();
    router.back();
  }, [hangUp, router]);

  // Navigate to full transcript
  const handleViewTranscript = useCallback(() => {
    if (callId) {
      router.push(`/transcript/${callId}`);
    }
  }, [callId, router]);

  if (!callId || !activeCall) {
    return (
      <SafeAreaView style={styles.errorScreen}>
        <Text style={styles.errorText}>Call not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Video area — placeholder for Daily.co video views */}
      <View style={styles.videoArea}>
        {/* Remote video (full screen) */}
        <View style={styles.remoteVideo}>
          {isConnected ? (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderEmoji}>
                {theirLanguage ? LANGUAGE_FLAGS[theirLanguage] : '👤'}
              </Text>
              <Text style={styles.videoPlaceholderText}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </Text>
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.connectingText}>Waiting for other person...</Text>
            </View>
          )}

          {/*
           * In production, replace with:
           * <DailyMediaView
           *   videoTrack={remoteParticipant?.videoTrack}
           *   audioTrack={remoteParticipant?.audioTrack}
           *   style={styles.remoteVideoView}
           * />
           */}
        </View>

        {/* Local video (PiP, top-right) */}
        <View style={styles.localVideo}>
          <View style={styles.localVideoInner}>
            <Text style={styles.localVideoEmoji}>
              {myLanguage ? LANGUAGE_FLAGS[myLanguage] : '🙂'}
            </Text>
            {!isCameraOn && (
              <Text style={styles.cameraOffText}>Camera off</Text>
            )}
          </View>
        </View>

        {/* Connection status bar */}
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotYellow]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Connecting'}
          </Text>
          {isListening && (
            <>
              <Text style={styles.statusSep}>•</Text>
              <Text style={styles.statusText}>Listening</Text>
            </>
          )}
          {isMuted && (
            <>
              <Text style={styles.statusSep}>•</Text>
              <Text style={styles.mutedText}>Muted</Text>
            </>
          )}
        </View>

        {/* Subtitle overlay — bottom portion of the video area */}
        <View style={styles.subtitleOverlay}>
          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            <ModeToggle mode={mode} onToggle={setMode} />
            <TouchableOpacity
              style={styles.transcriptBtn}
              onPress={handleViewTranscript}
              activeOpacity={0.7}
            >
              <Text style={styles.transcriptBtnText}>📜</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle list */}
          <SubtitleList
            utterances={utterances}
            mode={mode}
            partialText={partialText}
            currentUserId={user?.id || ''}
            showOriginal={user?.show_original_text ?? true}
            fontSize={user?.font_size || 'medium'}
          />
        </View>
      </View>

      {/* Call controls (bottom) */}
      <CallControls
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onHangUp={handleHangUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2a2a2a',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  videoPlaceholderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  connectingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  localVideo: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#333',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  localVideoInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localVideoEmoji: {
    fontSize: 32,
  },
  cameraOffText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  // Status bar
  statusBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#4CAF50',
  },
  dotYellow: {
    backgroundColor: '#FFC107',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statusSep: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  mutedText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  // Subtitle overlay
  subtitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  transcriptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 248, 240, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptBtnText: {
    fontSize: 18,
  },
  // Error state
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: '#E8924A',
    fontWeight: '600',
  },
});
