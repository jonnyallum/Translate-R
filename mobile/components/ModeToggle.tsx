// mobile/components/ModeToggle.tsx
// Segmented control that toggles between Learning and Natural translation modes.
// Warm, friendly design with smooth animations.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { TranslationMode } from '../types';

interface ModeToggleProps {
  mode: TranslationMode;
  onToggle: (mode: TranslationMode) => void;
}

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const slideAnim = React.useRef(new Animated.Value(mode === 'learning' ? 0 : 1)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: mode === 'learning' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [mode]);

  const segmentWidth = 130;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, segmentWidth + 2],
  });

  return (
    <View style={styles.container}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: segmentWidth,
            transform: [{ translateX }],
          },
        ]}
      />

      {/* Learning button */}
      <TouchableOpacity
        style={[styles.segment, { width: segmentWidth }]}
        onPress={() => onToggle('learning')}
        activeOpacity={0.7}
      >
        <Text style={[styles.icon]}>📖</Text>
        <Text
          style={[
            styles.label,
            mode === 'learning' && styles.labelActive,
          ]}
        >
          Learning
        </Text>
      </TouchableOpacity>

      {/* Natural button */}
      <TouchableOpacity
        style={[styles.segment, { width: segmentWidth }]}
        onPress={() => onToggle('natural')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>💬</Text>
        <Text
          style={[
            styles.label,
            mode === 'natural' && styles.labelActive,
          ]}
        >
          Natural
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 248, 240, 0.9)',
    borderRadius: 14,
    padding: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
    gap: 5,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
});
