import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PairingBanner } from '../../components/recipe/PairingBanner';
import { ServiceProvider } from '../../services/ServiceProvider';
import { CoupleUser, Preference } from '../../interfaces/database';

export const PreferenceScreen: React.FC = () => {
  const [members, setMembers] = useState<CoupleUser[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingType, setAddingType] = useState<{
    userId: string;
    type: 'like' | 'dislike' | 'allergy';
  } | null>(null);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [membersData, prefsData] = await Promise.all([
        ServiceProvider.coupleService.getCoupleMembers(),
        ServiceProvider.coupleService.getPreferences(),
      ]);
      setMembers(membersData);
      setPreferences(prefsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAddPreference = async () => {
    if (!addingType || !newItem.trim()) return;

    setSaving(true);
    try {
      await ServiceProvider.coupleService.addPreference(
        addingType.type,
        newItem.trim(),
        addingType.type === 'allergy' ? 'high' : undefined
      );
      setNewItem('');
      setAddingType(null);
      loadData();
    } catch (error) {
      Alert.alert('エラー', '追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreference = async (id: string, item: string) => {
    Alert.alert('削除確認', `「${item}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await ServiceProvider.coupleService.deletePreference(id);
            loadData();
          } catch (error) {
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  };

  const getMemberPreferences = (userId: string) => {
    const userPrefs = preferences.filter((p) => p.userId === userId);
    return {
      likes: userPrefs.filter((p) => p.type === 'like'),
      dislikes: userPrefs.filter((p) => p.type === 'dislike'),
      allergies: userPrefs.filter((p) => p.type === 'allergy'),
    };
  };

  const getCommonLikes = () => {
    if (members.length < 2) return [];
    const prefs1 = preferences.filter((p) => p.userId === members[0].id && p.type === 'like');
    const prefs2 = preferences.filter((p) => p.userId === members[1].id && p.type === 'like');
    const items1 = prefs1.map((p) => p.item);
    const items2 = prefs2.map((p) => p.item);
    return items1.filter((item) => items2.includes(item));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>ふたりの好み</Text>
        <Text style={styles.subtitle}>
          AIがふたりの情報を元に提案・警告します
        </Text>

        {members.length > 0 && <PairingBanner members={members} />}

        {/* Member preferences */}
        {members.map((member) => {
          const prefs = getMemberPreferences(member.id);
          const currentUser = ServiceProvider.getCurrentUser();
          const isMe = member.clerkId === currentUser?.id;

          return (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberEmoji}>{member.emoji}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {isMe && (
                      <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>あなた</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberCount}>
                    {prefs.likes.length + prefs.dislikes.length + prefs.allergies.length}項目登録
                  </Text>
                </View>
              </View>

              {/* Likes */}
              <View style={styles.prefSection}>
                <View style={styles.prefHeader}>
                  <Text style={styles.prefLabel}>😋 好き</Text>
                  {isMe && (
                    <TouchableOpacity
                      onPress={() => setAddingType({ userId: member.id, type: 'like' })}
                    >
                      <Text style={styles.addButton}>+ 追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {addingType?.userId === member.id && addingType?.type === 'like' && (
                  <View style={styles.addForm}>
                    <TextInput
                      style={styles.addInput}
                      placeholder="食材名を入力"
                      value={newItem}
                      onChangeText={setNewItem}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleAddPreference}
                      disabled={saving}
                    >
                      <Text style={styles.saveButtonText}>
                        {saving ? '...' : '保存'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setAddingType(null);
                        setNewItem('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.tagsContainer}>
                  {prefs.likes.map((pref) => (
                    <TouchableOpacity
                      key={pref.id}
                      style={styles.likeTag}
                      onLongPress={() => isMe && handleDeletePreference(pref.id, pref.item)}
                    >
                      <Text style={styles.likeTagText}>{pref.item}</Text>
                    </TouchableOpacity>
                  ))}
                  {prefs.likes.length === 0 && (
                    <Text style={styles.emptyText}>まだ登録なし</Text>
                  )}
                </View>
              </View>

              {/* Dislikes */}
              <View style={styles.prefSection}>
                <View style={styles.prefHeader}>
                  <Text style={styles.prefLabel}>😣 苦手</Text>
                  {isMe && (
                    <TouchableOpacity
                      onPress={() => setAddingType({ userId: member.id, type: 'dislike' })}
                    >
                      <Text style={styles.addButton}>+ 追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {addingType?.userId === member.id && addingType?.type === 'dislike' && (
                  <View style={styles.addForm}>
                    <TextInput
                      style={styles.addInput}
                      placeholder="食材名を入力"
                      value={newItem}
                      onChangeText={setNewItem}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleAddPreference}
                      disabled={saving}
                    >
                      <Text style={styles.saveButtonText}>
                        {saving ? '...' : '保存'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setAddingType(null);
                        setNewItem('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.tagsContainer}>
                  {prefs.dislikes.map((pref) => (
                    <TouchableOpacity
                      key={pref.id}
                      style={styles.dislikeTag}
                      onLongPress={() => isMe && handleDeletePreference(pref.id, pref.item)}
                    >
                      <Text style={styles.dislikeTagText}>{pref.item}</Text>
                    </TouchableOpacity>
                  ))}
                  {prefs.dislikes.length === 0 && (
                    <Text style={styles.emptyText}>まだ登録なし</Text>
                  )}
                </View>
              </View>

              {/* Allergies */}
              <View style={styles.prefSection}>
                <View style={styles.prefHeader}>
                  <Text style={styles.prefLabel}>⚠️ アレルギー</Text>
                  {isMe && (
                    <TouchableOpacity
                      onPress={() => setAddingType({ userId: member.id, type: 'allergy' })}
                    >
                      <Text style={styles.addButton}>+ 追加</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {addingType?.userId === member.id && addingType?.type === 'allergy' && (
                  <View style={styles.addForm}>
                    <TextInput
                      style={styles.addInput}
                      placeholder="アレルギー食材を入力"
                      value={newItem}
                      onChangeText={setNewItem}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleAddPreference}
                      disabled={saving}
                    >
                      <Text style={styles.saveButtonText}>
                        {saving ? '...' : '保存'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setAddingType(null);
                        setNewItem('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.tagsContainer}>
                  {prefs.allergies.map((pref) => (
                    <TouchableOpacity
                      key={pref.id}
                      style={styles.allergyTag}
                      onLongPress={() => isMe && handleDeletePreference(pref.id, pref.item)}
                    >
                      <Text style={styles.allergyTagText}>⚠️ {pref.item}</Text>
                    </TouchableOpacity>
                  ))}
                  {prefs.allergies.length === 0 && (
                    <Text style={styles.emptyText}>なし</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Common likes */}
        {getCommonLikes().length > 0 && (
          <View style={styles.commonSection}>
            <View style={styles.commonHeader}>
              <Text style={styles.commonIcon}>👫</Text>
              <Text style={styles.commonTitle}>ふたりの共通点</Text>
            </View>
            <View style={styles.tagsContainer}>
              {getCommonLikes().map((item, index) => (
                <View key={index} style={styles.commonTag}>
                  <Text style={styles.commonTagText}>🍛 {item}好き</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberEmoji: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  meBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  meBadgeText: {
    fontSize: 11,
    color: '#FB923C',
    fontWeight: '500',
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  prefSection: {
    marginBottom: 12,
  },
  prefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prefLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  addButton: {
    fontSize: 13,
    color: '#FB923C',
  },
  addForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  likeTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  likeTagText: {
    fontSize: 13,
    color: '#FB923C',
  },
  dislikeTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dislikeTagText: {
    fontSize: 13,
    color: '#6B7280',
  },
  allergyTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergyTagText: {
    fontSize: 13,
    color: '#DC2626',
  },
  emptyText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  commonSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
  },
  commonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  commonIcon: {
    fontSize: 16,
  },
  commonTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  commonTag: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  commonTagText: {
    fontSize: 13,
    color: '#FB923C',
  },
});
