// mobile/components/SubtitleList.tsx
// Scrollable list of subtitle utterances overlaid on the video.
//
// Behaviour:
// - Shows the most recent 3-5 utterances at full opacity
// - Older utterances fade out (lower opacity, slightly smaller)
// - Auto-scrolls to bottom when new utterances arrive
// - If user scrolls up, auto-scroll pauses
// - Returning to bottom re-enables auto-scroll
// - Partial STT text shows as a typing indicator at the bottom

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { SubtitleLine, PartialSubtitle } from './SubtitleLine';
import { Utterance, TranslationMode } from '../types';

interface SubtitleListProps {
  utterances: Utterance[];
  mode: TranslationMode;
  partialText: string | null;
  currentUserId: string;
  showOriginal: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const VISIBLE_COUNT = 4;      // Number of fully visible utterances
const FADE_RANGE = 3;         // Number of utterances in the fading zone

export function SubtitleList({
  utterances,
  mode,
  partialText,
  currentUserId,
  showOriginal,
  fontSize,
}: SubtitleListProps) {
  const listRef = useRef<FlatList>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);

  // Auto-scroll to bottom when new utterances arrive (unless user is scrolled up)
  useEffect(() => {
    if (!isUserScrolling && utterances.length > 0) {
      // Small delay to let the layout settle
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [utterances.length, partialText, isUserScrolling]);

  // Detect if user is manually scrolling up
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      contentHeightRef.current = contentSize.height;

      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      // If user is more than 60px from the bottom, they're scrolling up
      if (distanceFromBottom > 60) {
        setIsUserScrolling(true);

        // Reset after 5 seconds of inactivity
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 5000);
      } else {
        setIsUserScrolling(false);
      }
    },
    []
  );

  // Calculate opacity for each utterance based on its position from the end
  const getOpacity = useCallback(
    (index: number): number => {
      const distanceFromEnd = utterances.length - 1 - index;

      // Most recent VISIBLE_COUNT items are fully opaque
      if (distanceFromEnd < VISIBLE_COUNT) {
        return 1;
      }

      // Items in the fade range get progressively transparent
      const fadePosition = distanceFromEnd - VISIBLE_COUNT;
      if (fadePosition < FADE_RANGE) {
        return 1 - (fadePosition / FADE_RANGE) * 0.7; // Fade from 1.0 to 0.3
      }

      // Very old items are dim but still readable when scrolled to
      return 0.3;
    },
    [utterances.length]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Utterance>) => {
      // When user is scrolled up, show everything at full opacity
      const opacity = isUserScrolling ? 1 : getOpacity(index);

      return (
        <SubtitleLine
          utterance={item}
          mode={mode}
          opacity={opacity}
          showOriginal={showOriginal}
          fontSize={fontSize}
          isCurrentUser={item.speaker_user_id === currentUserId}
        />
      );
    },
    [mode, isUserScrolling, getOpacity, showOriginal, fontSize, currentUserId]
  );

  const keyExtractor = useCallback((item: Utterance) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={utterances}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        inverted={false}
        // Performance optimisations
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={10}
        initialNumToRender={5}
        ListFooterComponent={
          partialText ? (
            <PartialSubtitle text={partialText} />
          ) : null
        }
      />

      {/* Scroll-up fade gradient (visual hint that there's more above) */}
      {utterances.length > VISIBLE_COUNT && !isUserScrolling && (
        <View style={styles.topFade} pointerEvents="none" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: 280,
    position: 'relative',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 4,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    // Gradient overlay effect using background + opacity
    backgroundColor: 'transparent',
  },
});
