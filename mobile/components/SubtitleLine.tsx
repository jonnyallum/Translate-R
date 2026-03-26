// mobile/components/SubtitleLine.tsx
// Renders a single subtitle utterance.
// Shows either literal or natural translation based on current mode.
// Supports fading opacity for older utterances and original text display.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Utterance, TranslationMode, FONT_SIZES, LANGUAGE_FLAGS, LanguageCode } from '../types';

interface SubtitleLineProps {
  utterance: Utterance;
  mode: TranslationMode;
  opacity: number;           // 0–1, controlled by parent for fading effect
  showOriginal: boolean;     // Whether to show the original language text below
  fontSize: 'small' | 'medium' | 'large';
  isCurrentUser: boolean;    // True if this utterance is from the local user
}

export function SubtitleLine({
  utterance,
  mode,
  opacity,
  showOriginal,
  fontSize,
  isCurrentUser,
}: SubtitleLineProps) {
  const sizes = FONT_SIZES[fontSize];

  // Pick the right translation based on mode
  const translatedText =
    mode === 'learning'
      ? utterance.literal_translation
      : utterance.natural_translation;

  const originalText = utterance.source_transcript_clean || utterance.source_transcript_raw;
  const sourceFlag = LANGUAGE_FLAGS[utterance.source_language as LanguageCode] || '';

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.containerRight : styles.containerLeft,
        { opacity },
      ]}
    >
      {/* Speaker indicator */}
      <View style={styles.header}>
        <Text style={styles.flag}>{sourceFlag}</Text>
        <Text style={styles.speakerLabel}>
          {isCurrentUser ? 'You' : 'Them'}
        </Text>
        {mode === 'learning' && (
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>literal</Text>
          </View>
        )}
      </View>

      {/* Main translation text */}
      <Text
        style={[
          styles.translationText,
          { fontSize: sizes.subtitle },
          mode === 'learning' && styles.learningText,
        ]}
      >
        {translatedText || '...'}
      </Text>

      {/* Original text (optional, shown below in smaller font) */}
      {showOriginal && originalText && (
        <Text
          style={[
            styles.originalText,
            { fontSize: sizes.original },
          ]}
        >
          {originalText}
        </Text>
      )}
    </View>
  );
}

/**
 * Partial/typing indicator — shows while STT is still processing
 */
export function PartialSubtitle({ text }: { text: string }) {
  return (
    <View style={[styles.container, styles.containerLeft, styles.partialContainer]}>
      <Text style={styles.partialText}>{text}</Text>
      <View style={styles.typingDots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 16,
    maxWidth: '88%',
  },
  containerLeft: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderBottomLeftRadius: 4,
  },
  containerRight: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 243, 224, 0.92)',
    borderBottomRightRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 5,
  },
  flag: {
    fontSize: 13,
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  translationText: {
    color: '#1a1a1a',
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  learningText: {
    fontStyle: 'italic',
    color: '#2E7D32',
  },
  originalText: {
    color: '#999',
    marginTop: 4,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Partial / typing indicator
  partialContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partialText: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
    flex: 1,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ccc',
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
});
