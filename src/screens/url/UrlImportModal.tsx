import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceProvider } from '../../services/ServiceProvider';
import { GeminiService } from '../../services/GeminiService';
import { CoupleUser, Preference } from '../../interfaces/database';

interface UrlImportModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UrlImportModal: React.FC<UrlImportModalProps> = ({ visible, onClose }) => {
  const [members, setMembers] = useState<CoupleUser[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const [membersData, prefsData] = await Promise.all([
        ServiceProvider.coupleService.getCoupleMembers(),
        ServiceProvider.coupleService.getPreferences(),
      ]);
      setMembers(membersData);
      setPreferences(prefsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      const usersWithPrefs = members.map((m) =>
        GeminiService.formatPreferencesForAI(m.id, m.name, preferences)
      );
      const parseResult = await ServiceProvider.geminiService.parseRecipeUrl(
        url,
        usersWithPrefs
      );
      setResult(parseResult);
    } catch (error: any) {
      console.error('Error parsing URL:', error);
      if (error?.message === 'WEB_NOT_SUPPORTED') {
        Alert.alert(
          'Webでは利用できません',
          'URL取得機能はセキュリティ制限のため、Webブラウザでは利用できません。\n\niOSまたはAndroidアプリをご利用ください。',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('エラー', 'URLの解析に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const dbUser = await ServiceProvider.coupleService.getOrCreateDbUser();
      if (!dbUser?.coupleId) throw new Error('User not in couple');

      await ServiceProvider.coupleService.createRecipe({
        coupleId: dbUser.coupleId,
        title: result.title,
        emoji: result.emoji,
        description: result.description,
        sourceType: 'url',
        sourceUrl: url,
        steps: result.steps,
        cookTime: result.cookTime,
        servings: result.servings || 2,
        calories: result.calories,
        matchScoreTotal: result.matchScores?.total,
        matchScores: result.matchScores?.users,
        warnings: result.warnings,
        createdBy: dbUser.id,
        ingredients: result.ingredients,
      });

      Alert.alert('保存完了', 'レシピを保存しました！');
      handleClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    setUrl('');
    setResult(null);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>🔗 URLで保存</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI要約</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* URL Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="レシピのURLを貼り付け"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
              onPress={handleFetchUrl}
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.fetchButtonText}>取得</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FB923C" />
              <Text style={styles.loadingText}>🧠 Gemini が解析中...</Text>
              <Text style={styles.loadingSubtext}>ふたりの好みと照合中...</Text>
            </View>
          )}

          {/* Result */}
          {result && !loading && (
            <>
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultMeta}>⏱ {result.cookTime}分</Text>

                {/* Ingredients */}
                <View style={styles.ingredientsBox}>
                  <Text style={styles.ingredientsLabel}>材料（{result.servings || 2}人分）</Text>
                  {result.ingredients?.map((i: any, idx: number) => (
                    <Text key={idx} style={styles.ingredientItem}>
                      • {i.name} {i.amount && `... ${i.amount}`}
                    </Text>
                  ))}
                </View>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <View style={styles.warningBox}>
                    <View style={styles.warningHeader}>
                      <Text style={styles.warningIcon}>⚠️</Text>
                      <Text style={styles.warningTitle}>アレルギー警告</Text>
                    </View>
                    {result.warnings.map((w: any, i: number) => (
                      <Text key={i} style={styles.warningText}>
                        {members.find((m) => m.id === w.userId)?.emoji || '👤'}{' '}
                        {w.userName}: {w.item}（{w.type === 'allergy' ? 'アレルギー' : '苦手'}）
                      </Text>
                    ))}
                  </View>
                )}

                {/* Match scores */}
                <View style={styles.scoresBox}>
                  <Text style={styles.scoresLabel}>好みとの一致度</Text>
                  <View style={styles.scoresBars}>
                    {members.slice(0, 2).map((m) => {
                      // 配列からユーザーIDで検索
                      const userScoreArray = result.matchScores?.users || [];
                      const userScore = userScoreArray.find?.((u: any) => u.userId === m.id);
                      const score = userScore?.score || 50;
                      const isLow = score < 50;
                      return (
                        <View key={m.id} style={styles.scoreItem}>
                          <View style={styles.scoreHeader}>
                            <Text style={styles.scoreName}>{m.emoji} {m.name}</Text>
                            <Text
                              style={[
                                styles.scoreValue,
                                isLow ? styles.scoreValueLow : styles.scoreValueHigh,
                              ]}
                            >
                              {score}%
                            </Text>
                          </View>
                          <View style={styles.scoreBar}>
                            <View
                              style={[
                                styles.scoreBarFill,
                                {
                                  width: `${score}%`,
                                  backgroundColor: isLow ? '#F87171' : '#34D399',
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>保存する</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Info box */}
          {!loading && !result && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>✨ AIが自動で解析</Text>
              <Text style={styles.infoItem}>✓ レシピ名・材料・手順を抽出</Text>
              <Text style={styles.infoItem}>✓ ふたりの好みと照合</Text>
              <Text style={styles.infoItem}>✓ アレルギー食材を警告</Text>
            </View>
          )}
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  aiBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 12,
    color: '#FB923C',
    fontWeight: '500',
  },
  closeButton: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fetchButton: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  fetchButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#FB923C',
    fontWeight: '600',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  resultCard: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  ingredientsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  ingredientsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  ingredientsText: {
    fontSize: 14,
    color: '#374151',
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  warningText: {
    fontSize: 13,
    color: '#DC2626',
  },
  scoresBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
  },
  scoresLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  scoresBars: {
    gap: 12,
  },
  scoreItem: {
    gap: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreName: {
    fontSize: 13,
    color: '#374151',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValueHigh: {
    color: '#059669',
  },
  scoreValueLow: {
    color: '#DC2626',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
});
