import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Recipe, CoupleUser } from '../../interfaces/database';

interface RecipeDetailModalProps {
  visible: boolean;
  recipe: Recipe | null;
  members?: CoupleUser[];
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  visible,
  recipe,
  members = [],
  onClose,
}) => {
  if (!recipe) return null;

  const handleOpenSource = () => {
    if (recipe.sourceUrl) {
      Linking.openURL(recipe.sourceUrl);
    }
  };

  const getSourceLabel = () => {
    switch (recipe.sourceType) {
      case 'url':
        return recipe.sourceSiteName || 'Webサイト';
      case 'photo':
        return '写真から認識';
      case 'ai':
        return 'AI提案';
      case 'manual':
        return '手動入力';
      default:
        return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{recipe.emoji || '🍽️'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Source */}
          {recipe.sourceType && (
            <TouchableOpacity
              style={styles.sourceTag}
              onPress={recipe.sourceUrl ? handleOpenSource : undefined}
              disabled={!recipe.sourceUrl}
            >
              <Text style={styles.sourceIcon}>
                {recipe.sourceType === 'url' ? '🔗' : recipe.sourceType === 'photo' ? '📸' : '✨'}
              </Text>
              <Text style={styles.sourceText}>{getSourceLabel()}</Text>
              {recipe.sourceUrl && <Text style={styles.sourceArrow}>→</Text>}
            </TouchableOpacity>
          )}

          {/* Meta info */}
          <View style={styles.metaRow}>
            {recipe.cookTime && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱</Text>
                <Text style={styles.metaText}>{recipe.cookTime}分</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={styles.metaText}>{recipe.servings}人分</Text>
              </View>
            )}
            {recipe.calories && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🔥</Text>
                <Text style={styles.metaText}>{recipe.calories}kcal</Text>
              </View>
            )}
          </View>

          {/* Match scores */}
          {recipe.matchScoreTotal && (
            <View style={styles.matchSection}>
              <View style={styles.matchHeader}>
                <Text style={styles.matchLabel}>ふたりのマッチ度</Text>
                <Text style={styles.matchScore}>{recipe.matchScoreTotal}%</Text>
              </View>
              {recipe.matchScores && (
                <View style={styles.matchDetails}>
                  {Object.entries(recipe.matchScores).map(([userId, data]: [string, any]) => {
                    // dataが数値の場合とオブジェクトの場合の両方に対応
                    const score = typeof data === 'number' ? data : data?.score;
                    // membersからユーザー名を取得
                    const member = members.find((m) => m.id === userId);
                    const displayName = member
                      ? `${member.emoji || ''} ${member.name}`
                      : (typeof data === 'object' && data?.name ? data.name : userId);
                    return (
                      <View key={userId} style={styles.matchDetailItem}>
                        <Text style={styles.matchDetailName}>{displayName}</Text>
                        <View style={styles.matchBar}>
                          <View
                            style={[styles.matchBarFill, { width: `${score || 0}%` }]}
                          />
                        </View>
                        <Text style={styles.matchDetailScore}>{score || 0}%</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Warnings */}
          {recipe.warnings && recipe.warnings.length > 0 && (
            <View style={styles.warningSection}>
              <Text style={styles.warningTitle}>⚠️ 注意</Text>
              {recipe.warnings.map((warning: any, idx) => {
                // warningが文字列の場合とオブジェクトの場合の両方に対応
                if (typeof warning === 'string') {
                  return (
                    <Text key={`warning-${idx}`} style={styles.warningText}>
                      • {warning}
                    </Text>
                  );
                }
                return (
                  <Text key={`warning-${idx}`} style={styles.warningText}>
                    • {warning.userName || ''}さん: {warning.item}
                    （{warning.type === 'allergy' ? 'アレルギー' : '苦手'}）
                  </Text>
                );
              })}
            </View>
          )}

          {/* Description */}
          {recipe.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>説明</Text>
              <Text style={styles.description}>{recipe.description}</Text>
            </View>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                材料（{recipe.servings || 2}人分）
              </Text>
              <View style={styles.ingredientsList}>
                {recipe.ingredients.map((ingredient: any, idx) => {
                  // ingredientが文字列の場合とオブジェクトの場合の両方に対応
                  const name = typeof ingredient === 'string' ? ingredient : ingredient?.name;
                  const amount = typeof ingredient === 'object' ? ingredient?.amount : null;
                  return (
                    <View key={ingredient?.id || `ing-${idx}`} style={styles.ingredientRow}>
                      <Text style={styles.ingredientName}>{name || ''}</Text>
                      {amount && (
                        <Text style={styles.ingredientAmount}>{amount}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Steps */}
          {recipe.steps && recipe.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>作り方</Text>
              <View style={styles.stepsList}>
                {recipe.steps.map((step, idx) => (
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

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.tagsRow}>
                {recipe.tags.map((tag, idx) => (
                  <View key={`tag-${idx}-${tag}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cooked count */}
          {recipe.cookedCount > 0 && (
            <View style={styles.cookedInfo}>
              <Text style={styles.cookedText}>
                🍳 {recipe.cookedCount}回作りました
              </Text>
              {recipe.lastCookedAt && (
                <Text style={styles.lastCookedText}>
                  最後: {new Date(recipe.lastCookedAt).toLocaleDateString('ja-JP')}
                </Text>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>🍳</Text>
            <Text style={styles.actionButtonText}>作った！</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>これ作る！</Text>
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
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 4,
  },
  sourceIcon: {
    fontSize: 14,
  },
  sourceText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sourceArrow: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
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
  matchSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  matchScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FB923C',
  },
  matchDetails: {
    gap: 8,
  },
  matchDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchDetailName: {
    fontSize: 13,
    color: '#6B7280',
    width: 60,
  },
  matchBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#FED7AA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    backgroundColor: '#FB923C',
    borderRadius: 4,
  },
  matchDetailScore: {
    fontSize: 13,
    color: '#FB923C',
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  warningSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#DC2626',
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cookedInfo: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cookedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  lastCookedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FB923C',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});
