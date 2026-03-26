// mobile/app/home.tsx
// Home screen — contacts list, search users, start calls, view past call transcripts

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabase';
import { createCall } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCallStore } from '../stores/callStore';
import { Profile, Contact, Call, LANGUAGE_FLAGS, LanguageCode } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { setActiveCall } = useCallStore();

  const [contacts, setContacts] = useState<(Contact & { profile: Profile })[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch contacts and recent calls
  const loadData = async () => {
    if (!user) return;

    // Load contacts with profiles
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('*, profile:profiles!contacts_contact_user_id_fkey(*)')
      .eq('user_id', user.id);

    if (contactsData) {
      setContacts(contactsData as any);
    }

    // Load recent calls
    const { data: callsData } = await supabase
      .from('calls')
      .select('*')
      .or(`participant_a_id.eq.${user.id},participant_b_id.eq.${user.id}`)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(10);

    if (callsData) {
      setRecentCalls(callsData as Call[]);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Search for users to add as contacts
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user?.id)
      .limit(8);

    setSearchResults((data as Profile[]) || []);
    setIsSearching(false);
  };

  // Start a call with a contact
  const handleStartCall = async (contactUserId: string) => {
    try {
      const { call, daily_token } = await createCall(contactUserId);
      setActiveCall(call, daily_token);
      router.push(`/call/${call.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start call');
    }
  };

  // Add a user as a contact and start a call
  const handleAddAndCall = async (profile: Profile) => {
    if (!user) return;

    // Add as contact if not already
    await supabase.from('contacts').upsert({
      user_id: user.id,
      contact_user_id: profile.id,
    });

    setSearchQuery('');
    setSearchResults([]);
    await loadData();
    handleStartCall(profile.id);
  };

  return (
    <View style={styles.screen}>
      {/* User header */}
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.greeting}>
            Hey, {user?.display_name || 'there'}
          </Text>
          <Text style={styles.userLanguage}>
            {LANGUAGE_FLAGS[user?.primary_language as LanguageCode]} Speaking{' '}
            {user?.primary_language?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/pricing')} style={styles.upgradeBtn}>
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor="#bbb"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {/* Search results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionLabel}>Search results</Text>
          {searchResults.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.userRow}
              onPress={() => handleAddAndCall(profile)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile.display_name || profile.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {profile.display_name || profile.email}
                </Text>
                <Text style={styles.userLang}>
                  {LANGUAGE_FLAGS[profile.primary_language as LanguageCode]}{' '}
                  {profile.primary_language?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contacts */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>Your contacts</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyText}>
              Search for someone above to start your first translated video call.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => handleStartCall(item.contact_user_id)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.profile?.display_name || item.profile?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {item.nickname || item.profile?.display_name || item.profile?.email}
              </Text>
              <Text style={styles.userLang}>
                {LANGUAGE_FLAGS[item.profile?.primary_language as LanguageCode]}{' '}
                {item.profile?.primary_language?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          recentCalls.length > 0 ? (
            <View style={styles.recentSection}>
              <Text style={styles.sectionLabel}>Recent calls</Text>
              {recentCalls.map((call) => (
                <TouchableOpacity
                  key={call.id}
                  style={styles.recentRow}
                  onPress={() => router.push(`/transcript/${call.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentDate}>
                    {new Date(call.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.recentLanguages}>
                    {LANGUAGE_FLAGS[call.language_a as LanguageCode]} ↔{' '}
                    {call.language_b ? LANGUAGE_FLAGS[call.language_b as LanguageCode] : '?'}
                  </Text>
                  <Text style={styles.viewTranscript}>View transcript →</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  userLanguage: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e0d8',
  },
  signOutText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  upgradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E8924A',
  },
  upgradeText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e8e0d8',
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8924A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userLang: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  callIcon: {
    fontSize: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 40,
  },
  recentSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e0d8',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    marginHorizontal: 20,
  },
  recentDate: {
    fontSize: 13,
    color: '#888',
    width: 90,
  },
  recentLanguages: {
    fontSize: 15,
    flex: 1,
  },
  viewTranscript: {
    fontSize: 13,
    color: '#E8924A',
    fontWeight: '500',
  },
});
