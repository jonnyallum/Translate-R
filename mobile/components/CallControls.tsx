// mobile/components/CallControls.tsx
// Bottom bar with call control buttons: mute, camera toggle, hang up
// Warm, friendly design with clear touch targets

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}

export function CallControls({
  isMuted,
  isCameraOn,
  onToggleMute,
  onToggleCamera,
  onHangUp,
}: CallControlsProps) {
  return (
    <View style={styles.container}>
      {/* Mute button */}
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonActive]}
        onPress={onToggleMute}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        <Text style={[styles.buttonLabel, isMuted && styles.labelActive]}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Text>
      </TouchableOpacity>

      {/* Camera button */}
      <TouchableOpacity
        style={[styles.button, !isCameraOn && styles.buttonActive]}
        onPress={onToggleCamera}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>{isCameraOn ? '📹' : '📷'}</Text>
        <Text style={[styles.buttonLabel, !isCameraOn && styles.labelActive]}>
          {isCameraOn ? 'Camera' : 'Camera off'}
        </Text>
      </TouchableOpacity>

      {/* Hang up button */}
      <TouchableOpacity
        style={[styles.button, styles.hangUpButton]}
        onPress={onHangUp}
        activeOpacity={0.7}
      >
        <Text style={styles.hangUpIcon}>📞</Text>
        <Text style={styles.hangUpLabel}>End</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 20,
    backgroundColor: 'rgba(255, 248, 240, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonActive: {
    backgroundColor: '#E8E8E8',
  },
  buttonIcon: {
    fontSize: 22,
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  labelActive: {
    color: '#333',
  },
  hangUpButton: {
    backgroundColor: '#FF4444',
    width: 64,
    height: 64,
  },
  hangUpIcon: {
    fontSize: 22,
    transform: [{ rotate: '135deg' }],
  },
  hangUpLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
});
