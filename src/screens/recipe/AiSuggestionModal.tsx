import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceProvider } from '../../services/ServiceProvider';

interface AiSuggestion {
  name: string;
  emoji: string;
  description: string;
  cookTime: number;
  servings?: number;
  ingredients: Array<string | { name: string; amount: string }>;
  steps?: string[];
  matchScore: number;
  reason: string;
  calories?: number;
}

interface AiSuggestionModalProps {
  visible: boolean;
  suggestion: AiSuggestion | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AiSuggestionModal: React.FC<AiSuggestionModalProps> = ({
  visible,
  suggestion,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);

  if (!suggestion) return null;

  const handleSaveRecipe = async () => {
    setSaving(true);
    try {
      const dbUser = await ServiceProvider.coupleService.getOrCreateDbUser();
      if (!dbUser?.coupleId) throw new Error('User not in couple');

      // 材料を正しい形式に変換
      const ingredients = suggestion.ingredients?.map((ing) => {
        if (typeof ing === 'string') {
          return { name: ing, amount: '' };
        }
        return { name: ing.name, amount: ing.amount || '' };
      }) || [];

      await ServiceProvider.coupleService.createRecipe({
        coupleId: dbUser.coupleId,
        title: suggestion.name,
        emoji: suggestion.emoji,
        description: suggestion.description,
        sourceType: 'ai',
        cookTime: suggestion.cookTime,
        servings: suggestion.servings || 2,
        calories: suggestion.calories,
        matchScoreTotal: suggestion.matchScore,
        steps: suggestion.steps,
        createdBy: dbUser.id,
        ingredients,
      });

      Alert.alert('保存完了', 'レシピを保存しました！');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleRecord = async () => {
    setSaving(true);
    try {
      const dbUser = await ServiceProvider.coupleService.getOrCreateDbUser();
      if (!dbUser?.coupleId) throw new Error('User not in couple');

      await ServiceProvider.coupleService.createRecord({
        coupleId: dbUser.coupleId,
        dishName: suggestion.name,
        emoji: suggestion.emoji,
        cookedAt: new Date().toISOString(),
        createdBy: dbUser.id,
      });

      Alert.alert('記録完了', '料理を記録しました！');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving record:', error);
      Alert.alert('エラー', '記録に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{suggestion.emoji}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI提案</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{suggestion.name}</Text>

          {/* Match Score */}
          <View style={styles.matchSection}>
            <Text style={styles.matchLabel}>ふたりのマッチ度</Text>
            <Text style={styles.matchScore}>{suggestion.matchScore}%</Text>
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaText}>{suggestion.cookTime}分</Text>
            </View>
            {suggestion.calories && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🔥</Text>
                <Text style={styles.metaText}>{suggestion.calories}kcal</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>説明</Text>
            <Text style={styles.description}>{suggestion.description}</Text>
          </View>

          {/* Reason */}
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>💡 おすすめの理由</Text>
            <Text style={styles.reasonText}>{suggestion.reason}</Text>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>材料（{suggestion.servings || 2}人分）</Text>
            <View style={styles.ingredientsList}>
              {suggestion.ingredients?.map((ingredient, idx) => {
                const name = typeof ingredient === 'string' ? ingredient : ingredient?.name;
                const amount = typeof ingredient === 'object' ? ingredient?.amount : null;
                return (
                  <View key={`ing-${idx}`} style={styles.ingredientRow}>
                    <Text style={styles.ingredientName}>{name}</Text>
                    {amount && <Text style={styles.ingredientAmount}>{amount}</Text>}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Steps */}
          {suggestion.steps && suggestion.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>作り方</Text>
              <View style={styles.stepsList}>
                {suggestion.steps.map((step, idx) => (
                  <View key={`step-${idx}`} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.recordButton, saving && styles.buttonDisabled]}
            onPress={handleRecord}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FB923C" />
            ) : (
              <>
                <Text style={styles.recordButtonIcon}>📝</Text>
                <Text style={styles.recordButtonText}>作った！</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSaveRecipe}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.saveButtonIcon}>📚</Text>
                <Text style={styles.saveButtonText}>レシピ保存</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  aiBadge: {
    backgroundColor: '#FFF7ED',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  aiBadgeText: {
    fontSize: 13,
    color: '#FB923C',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  matchSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  matchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  matchScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB923C',
  },
  metaRow: {
    flexDirection: 'row',
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
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  reasonBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
  ingredientsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ingredientName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  ingredientAmount: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepsList: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FB923C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 100,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
  },
  recordButtonIcon: {
    fontSize: 16,
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FB923C',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonIcon: {
    fontSize: 16,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
