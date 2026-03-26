// mobile/app/transcript/[id].tsx
// Post-call transcript history — view all utterances with mode switching
// Shows original text, literal translation, and natural translation side by side

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { listUtterances } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { ModeToggle } from '../../components/ModeToggle';
import {
  Utterance,
  TranslationMode,
  LANGUAGE_FLAGS,
  LanguageCode,
} from '../../types';

type TranscriptView = 'original' | 'learning' | 'natural' | 'all';

export default function TranscriptScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<TranscriptView>('all');

  useEffect(() => {
    if (!callId) return;

    const fetchUtterances = async () => {
      try {
        const { utterances: data } = await listUtterances(callId);
        setUtterances(data);
      } catch (error) {
        console.error('Failed to load transcript:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUtterances();
  }, [callId]);

  const renderUtterance = ({ item }: { item: Utterance }) => {
    const isCurrentUser = item.speaker_user_id === user?.id;
    const sourceFlag = LANGUAGE_FLAGS[item.source_language as LanguageCode] || '';
    const targetFlag = LANGUAGE_FLAGS[item.target_language as LanguageCode] || '';

    return (
      <View
        style={[
          styles.utteranceCard,
          isCurrentUser ? styles.cardRight : styles.cardLeft,
        ]}
      >
        {/* Speaker header */}
        <View style={styles.utteranceHeader}>
          <Text style={styles.speakerFlag}>{sourceFlag}</Text>
          <Text style={styles.speakerName}>
            {isCurrentUser ? 'You' : 'Them'}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Original text */}
        {(viewMode === 'original' || viewMode === 'all') && (
          <View style={styles.textBlock}>
            <Text style={styles.textLabel}>
              Original ({item.source_language.toUpperCase()})
            </Text>
            <Text style={styles.originalText}>
              {item.source_transcript_clean || item.source_transcript_raw || '...'}
            </Text>
          </View>
        )}

        {/* Literal translation */}
        {(viewMode === 'learning' || viewMode === 'all') && (
          <View style={[styles.textBlock, styles.literalBlock]}>
            <Text style={styles.textLabel}>
              {targetFlag} Literal translation
            </Text>
            <Text style={styles.literalText}>
              {item.literal_translation || '...'}
            </Text>
          </View>
        )}

        {/* Natural translation */}
        {(viewMode === 'natural' || viewMode === 'all') && (
          <View style={[styles.textBlock, styles.naturalBlock]}>
            <Text style={styles.textLabel}>
              {targetFlag} Natural translation
            </Text>
            <Text style={styles.naturalText}>
              {item.natural_translation || '...'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#E8924A" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* View mode selector */}
      <View style={styles.viewModeBar}>
        {(['all', 'original', 'learning', 'natural'] as TranscriptView[]).map(
          (m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.viewModeBtn,
                viewMode === m && styles.viewModeBtnActive,
              ]}
              onPress={() => setViewMode(m)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.viewModeText,
                  viewMode === m && styles.viewModeTextActive,
                ]}
              >
                {m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Utterance list */}
      <FlatList
        data={utterances}
        keyExtractor={(item) => item.id}
        renderItem={renderUtterance}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤫</Text>
            <Text style={styles.emptyText}>
              No utterances recorded for this call.
            </Text>
          </View>
        }
      />

      {/* Stats footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {utterances.length} utterance{utterances.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  viewModeBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e0d8',
  },
  viewModeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e0d8',
  },
  viewModeBtnActive: {
    backgroundColor: '#E8924A',
    borderColor: '#E8924A',
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  viewModeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  utteranceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {
    borderLeftWidth: 3,
    borderLeftColor: '#64B5F6',
  },
  cardRight: {
    borderLeftWidth: 3,
    borderLeftColor: '#E8924A',
  },
  utteranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  speakerFlag: {
    fontSize: 16,
  },
  speakerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#bbb',
  },
  textBlock: {
    marginBottom: 8,
  },
  textLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  originalText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  literalBlock: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    padding: 10,
  },
  literalText: {
    fontSize: 15,
    color: '#2E7D32',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  naturalBlock: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
  },
  naturalText: {
    fontSize: 15,
    color: '#E65100',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(255, 248, 240, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e8e0d8',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
});
