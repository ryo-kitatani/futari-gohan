import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CookingRecord, CoupleUser, Reaction } from '../../interfaces/database';
import { ServiceProvider } from '../../services/ServiceProvider';

interface CookingRecordDetailModalProps {
  visible: boolean;
  record: CookingRecord | null;
  members?: CoupleUser[];
  onClose: () => void;
}

const REACTION_EMOJIS = ['😍', '😋', '👍', '🔥', '💕'];

export const CookingRecordDetailModal: React.FC<CookingRecordDetailModalProps> = ({
  visible,
  record,
  members = [],
  onClose,
}) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [addingReaction, setAddingReaction] = useState(false);

  useEffect(() => {
    if (visible && record?.id) {
      loadReactions();
    }
  }, [visible, record?.id]);

  const loadReactions = async () => {
    if (!record?.id) return;
    setLoadingReactions(true);
    try {
      const data = await ServiceProvider.coupleService.getReactions(record.id);
      setReactions(data);
    } catch (error) {
      console.error('Error loading reactions:', error);
    } finally {
      setLoadingReactions(false);
    }
  };

  const handleAddReaction = async (emoji: string) => {
    if (!record?.id || addingReaction) return;
    setAddingReaction(true);
    try {
      await ServiceProvider.coupleService.addReaction(record.id, emoji);
      await loadReactions();
    } catch (error) {
      console.error('Error adding reaction:', error);
    } finally {
      setAddingReaction(false);
    }
  };

  if (!record) return null;

  const creator = members.find((m) => m.id === record.createdBy);
  const cookedDate = record.cookedAt
    ? new Date(record.cookedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // リアクションをユーザーごとにグループ化
  const reactionsByUser = reactions.reduce((acc, r) => {
    const member = members.find((m) => m.id === r.userId);
    if (member) {
      acc.push({ ...r, member });
    }
    return acc;
  }, [] as (Reaction & { member: CoupleUser })[]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{record.emoji || '🍽️'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>{record.dishName}</Text>

          {/* Photo */}
          {record.photoUrl && (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: record.photoUrl }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Meta info */}
          <View style={styles.metaRow}>
            {creator && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>{creator.emoji}</Text>
                <Text style={styles.metaText}>{creator.name}さんが作成</Text>
              </View>
            )}
            {cookedDate && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>{cookedDate}</Text>
              </View>
            )}
          </View>

          {/* Reactions Section */}
          <View style={styles.reactionSection}>
            <Text style={styles.sectionTitle}>リアクション</Text>

            {/* Reaction Buttons */}
            <View style={styles.reactionButtons}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => handleAddReaction(emoji)}
                  disabled={addingReaction}
                >
                  <Text style={styles.reactionButtonEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Existing Reactions */}
            {loadingReactions ? (
              <ActivityIndicator size="small" color="#FB923C" style={{ marginTop: 12 }} />
            ) : reactionsByUser.length > 0 ? (
              <View style={styles.reactionsList}>
                {reactionsByUser.map((r) => (
                  <View key={r.id} style={styles.reactionItem}>
                    <Text style={styles.reactionUserEmoji}>{r.member.emoji}</Text>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    {r.comment && (
                      <Text style={styles.reactionComment}>{r.comment}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noReactionsText}>まだリアクションがありません</Text>
            )}
          </View>

          {/* Photo Recognition Info */}
          {record.photoRecognition && (
            <View style={styles.recognitionSection}>
              <Text style={styles.sectionTitle}>📸 写真から認識した情報</Text>

              {record.photoRecognition.category && (
                <View style={styles.recognitionRow}>
                  <Text style={styles.recognitionLabel}>カテゴリ</Text>
                  <Text style={styles.recognitionValue}>{record.photoRecognition.category}</Text>
                </View>
              )}

              {record.photoRecognition.cookingMethod && (
                <View style={styles.recognitionRow}>
                  <Text style={styles.recognitionLabel}>調理法</Text>
                  <Text style={styles.recognitionValue}>{record.photoRecognition.cookingMethod}</Text>
                </View>
              )}

              {record.photoRecognition.calories && (
                <View style={styles.recognitionRow}>
                  <Text style={styles.recognitionLabel}>カロリー</Text>
                  <Text style={styles.recognitionValue}>{record.photoRecognition.calories}kcal</Text>
                </View>
              )}

              {record.photoRecognition.ingredients && record.photoRecognition.ingredients.length > 0 && (
                <View style={styles.ingredientsSection}>
                  <Text style={styles.recognitionLabel}>材料</Text>
                  <View style={styles.ingredientsList}>
                    {record.photoRecognition.ingredients.map((ingredient, idx) => (
                      <View key={`ing-${idx}`} style={styles.ingredientTag}>
                        <Text style={styles.ingredientText}>{ingredient}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Memo */}
          {record.memo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 メモ</Text>
              <Text style={styles.memoText}>{record.memo}</Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  photoContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reactionSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reactionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionButtonEmoji: {
    fontSize: 24,
  },
  reactionsList: {
    marginTop: 16,
    gap: 8,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  reactionUserEmoji: {
    fontSize: 16,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionComment: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  noReactionsText: {
    marginTop: 12,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  recognitionSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recognitionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recognitionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  recognitionValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  ingredientsSection: {
    marginTop: 12,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ingredientTag: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientText: {
    fontSize: 13,
    color: '#374151',
  },
  memoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
