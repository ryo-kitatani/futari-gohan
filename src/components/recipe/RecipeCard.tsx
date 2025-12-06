import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recipe } from '../../interfaces/database';

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress }) => {
  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'ai':
        return 'AI提案';
      case 'url':
        return 'URL保存';
      case 'photo':
        return '写真記録';
      default:
        return '手動登録';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{recipe.emoji}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.title}
          </Text>
          {recipe.matchScoreTotal && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{recipe.matchScoreTotal}%</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          {recipe.cookTime && (
            <Text style={styles.metaText}>⏱ {recipe.cookTime}分</Text>
          )}
          <Text style={styles.separator}>•</Text>
          <Text style={styles.sourceText}>{getSourceLabel(recipe.sourceType)}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 8,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  matchBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  separator: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  sourceText: {
    fontSize: 12,
    color: '#FB923C',
  },
  chevron: {
    fontSize: 20,
    color: '#D1D5DB',
  },
});
