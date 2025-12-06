import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PairingBanner } from '../../components/recipe/PairingBanner';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { ServiceProvider } from '../../services/ServiceProvider';
import { GeminiService } from '../../services/GeminiService';
import { CoupleUser, Recipe, Preference } from '../../interfaces/database';

interface HomeScreenProps {
  onOpenCamera: () => void;
  onOpenUrl: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenCamera, onOpenUrl }) => {
  const [members, setMembers] = useState<CoupleUser[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [membersData, recipesData, prefsData] = await Promise.all([
        ServiceProvider.coupleService.getCoupleMembers(),
        ServiceProvider.coupleService.getRecipes(),
        ServiceProvider.coupleService.getPreferences(),
      ]);
      setMembers(membersData);
      setRecipes(recipesData);
      setPreferences(prefsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadAiSuggestion = useCallback(async () => {
    if (members.length < 2 || loadingAi) return;

    setLoadingAi(true);
    try {
      const usersWithPrefs = members.map((m) =>
        GeminiService.formatPreferencesForAI(m.id, m.name, preferences)
      );
      const suggestions = await ServiceProvider.geminiService.suggestRecipes(usersWithPrefs);
      if (suggestions.length > 0) {
        setAiSuggestion(suggestions[0]);
      }
    } catch (error) {
      console.error('Error loading AI suggestion:', error);
    } finally {
      setLoadingAi(false);
    }
  }, [members, preferences, loadingAi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (members.length >= 2 && preferences.length > 0 && !aiSuggestion) {
      loadAiSuggestion();
    }
  }, [members, preferences, aiSuggestion, loadAiSuggestion]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setAiSuggestion(null);
    loadData();
  }, [loadData]);

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ふたりごはん</Text>
            <Text style={styles.subtitle}>AIがふたりの食卓をサポート</Text>
          </View>
          <LinearGradient
            colors={['#FB923C', '#F472B6']}
            style={styles.headerIcon}
          >
            <Text style={styles.headerIconText}>✨</Text>
          </LinearGradient>
        </View>

        {/* Pairing Banner */}
        {members.length > 0 && <PairingBanner members={members} />}

        {/* AI Suggestion */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={styles.sectionTitle}>AIおすすめ</Text>
          </View>

          <LinearGradient
            colors={['#FB923C', '#F472B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            {loadingAi ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator color="white" />
                <Text style={styles.aiLoadingText}>AIが考え中...</Text>
              </View>
            ) : aiSuggestion ? (
              <>
                <View style={styles.aiHeader}>
                  <View>
                    <Text style={styles.aiLabel}>ふたりの好みに</Text>
                    <Text style={styles.aiScore}>{aiSuggestion.matchScore}%マッチ</Text>
                  </View>
                  <Text style={styles.aiEmoji}>{aiSuggestion.emoji}</Text>
                </View>

                {members.length >= 2 && (
                  <View style={styles.memberScores}>
                    {members.slice(0, 2).map((m, i) => (
                      <View key={m.id} style={styles.memberScoreBadge}>
                        <Text style={styles.memberScoreText}>
                          {m.emoji} {m.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.aiDishName}>{aiSuggestion.name}</Text>
                <Text style={styles.aiMeta}>
                  ⏱ {aiSuggestion.cookTime}分 ・ {aiSuggestion.reason}
                </Text>

                <View style={styles.aiButtons}>
                  <TouchableOpacity style={styles.aiPrimaryButton}>
                    <Text style={styles.aiPrimaryButtonText}>これ作る！</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.aiSecondaryButton}
                    onPress={loadAiSuggestion}
                  >
                    <Text style={styles.aiSecondaryButtonText}>他の候補</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.aiEmpty}>
                <Text style={styles.aiEmptyText}>
                  好みを登録するとAIがおすすめを提案します
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Saved Recipes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>保存したレシピ</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>すべて見る</Text>
            </TouchableOpacity>
          </View>

          {recipes.length > 0 ? (
            recipes.slice(0, 5).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📝</Text>
              <Text style={styles.emptyStateText}>
                まだレシピがありません
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={onOpenCamera}>
            <Text style={styles.quickActionIcon}>📸</Text>
            <Text style={styles.quickActionText}>写真で記録</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={onOpenUrl}>
            <Text style={styles.quickActionIcon}>🔗</Text>
            <Text style={styles.quickActionText}>URLで保存</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sparkle: {
    fontSize: 14,
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  seeAllButton: {
    fontSize: 13,
    color: '#FB923C',
  },
  aiCard: {
    borderRadius: 16,
    padding: 20,
  },
  aiLoading: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  aiLoadingText: {
    color: 'white',
    fontSize: 14,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  aiScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  aiEmoji: {
    fontSize: 40,
  },
  memberScores: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  memberScoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberScoreText: {
    color: 'white',
    fontSize: 13,
  },
  aiDishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  aiMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aiPrimaryButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiPrimaryButtonText: {
    color: '#FB923C',
    fontWeight: '600',
    fontSize: 15,
  },
  aiSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  aiSecondaryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 15,
  },
  aiEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  aiEmptyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});
