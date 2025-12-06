import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ServiceProvider } from '../../services/ServiceProvider';
import { CoupleUser } from '../../interfaces/database';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ visible, onClose }) => {
  const [members, setMembers] = useState<CoupleUser[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string>('😍');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible]);

  const loadMembers = async () => {
    try {
      const membersData = await ServiceProvider.coupleService.getCoupleMembers();
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      recognizePhoto(result.assets[0].base64!);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('権限が必要です', 'カメラを使用するには権限が必要です');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      recognizePhoto(result.assets[0].base64!);
    }
  };

  const recognizePhoto = async (base64: string) => {
    setRecognizing(true);
    try {
      const result = await ServiceProvider.geminiService.recognizePhoto(base64);
      setRecognized(result);
    } catch (error) {
      console.error('Error recognizing photo:', error);
      Alert.alert('認識エラー', 'AIによる認識に失敗しました');
    } finally {
      setRecognizing(false);
    }
  };

  const handleSave = async (saveAsRecipe: boolean = false) => {
    if (!recognized) return;

    setSaving(true);
    try {
      const dbUser = await ServiceProvider.coupleService.getOrCreateDbUser();
      if (!dbUser?.coupleId) throw new Error('User not in couple');

      if (saveAsRecipe) {
        // レシピとして保存
        await ServiceProvider.coupleService.createRecipe({
          coupleId: dbUser.coupleId,
          title: recognized.dishName,
          emoji: recognized.emoji,
          description: `写真から認識: ${recognized.cookingMethod || ''} ${recognized.category || ''}`.trim(),
          sourceType: 'photo',
          cookTime: recognized.cookTime,
          calories: recognized.calories,
          createdBy: dbUser.id,
          ingredients: recognized.ingredients?.map((name: string) => ({ name, amount: '' })) || [],
        });

        Alert.alert('保存完了', 'レシピとして保存しました！', [
          { text: 'OK', onPress: handleClose },
        ]);
      } else {
        // 画像をアップロード
        let photoUrl: string | undefined;
        if (image) {
          try {
            photoUrl = await ServiceProvider.coupleService.uploadPhoto(image);
          } catch (uploadError) {
            console.error('Photo upload failed:', uploadError);
            // アップロード失敗しても記録は保存する
          }
        }

        // 料理記録として保存
        await ServiceProvider.coupleService.createRecord({
          coupleId: dbUser.coupleId,
          dishName: recognized.dishName,
          emoji: recognized.emoji,
          photoUrl,
          photoRecognition: recognized,
          cookedAt: new Date().toISOString(),
          createdBy: dbUser.id,
        });

        Alert.alert('保存完了', '料理を記録しました！', [
          { text: 'OK', onPress: handleClose },
        ]);
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    setImage(null);
    setRecognized(null);
    setSelectedMember(null);
    setSelectedReaction('😍');
    onClose();
  }, [onClose]);

  const reactions = ['😍', '🙂', '😐', '🙁'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>📸 写真で記録</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI認識</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Image area */}
          <TouchableOpacity
            style={styles.imageArea}
            onPress={!image ? handleTakePhoto : undefined}
            activeOpacity={image ? 1 : 0.8}
          >
            {recognizing ? (
              <View style={styles.recognizing}>
                <ActivityIndicator size="large" color="#FB923C" />
                <Text style={styles.recognizingText}>🧠 Gemini が認識中...</Text>
              </View>
            ) : recognized ? (
              <View style={styles.recognizedContainer}>
                {image && <Image source={{ uri: image }} style={styles.previewImage} />}
                <View style={styles.recognizedOverlay}>
                  <Text style={styles.recognizedEmoji}>{recognized.emoji}</Text>
                  <Text style={styles.recognizedCheck}>✓ 認識完了！</Text>
                </View>
              </View>
            ) : image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>タップして写真を撮影</Text>
              </View>
            )}
          </TouchableOpacity>

          {!image && (
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
                <Text style={styles.imageButtonIcon}>📷</Text>
                <Text style={styles.imageButtonText}>撮影</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
                <Text style={styles.imageButtonIcon}>🖼️</Text>
                <Text style={styles.imageButtonText}>選択</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recognition result */}
          {recognized && (
            <>
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.sparkle}>✨</Text>
                  <Text style={styles.resultLabel}>AI認識結果</Text>
                </View>
                <Text style={styles.dishName}>{recognized.dishName}</Text>
                <Text style={styles.ingredients}>
                  材料: {recognized.ingredients?.join('、')}
                </Text>
                {recognized.calories && (
                  <Text style={styles.calories}>
                    約 {recognized.calories} kcal
                  </Text>
                )}
              </View>

              {/* Member selection */}
              <View style={styles.memberSection}>
                <Text style={styles.sectionLabel}>誰の反応？</Text>
                <View style={styles.memberButtons}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.memberButton,
                        selectedMember === m.id && styles.memberButtonSelected,
                      ]}
                      onPress={() => setSelectedMember(m.id)}
                    >
                      <Text style={styles.memberButtonText}>
                        {m.emoji} {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reaction selection */}
              <View style={styles.reactionSection}>
                <View style={styles.reactionButtons}>
                  {reactions.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.reactionButton,
                        selectedReaction === emoji && styles.reactionButtonSelected,
                      ]}
                      onPress={() => setSelectedReaction(emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save buttons */}
              <View style={styles.saveButtons}>
                <TouchableOpacity
                  style={[styles.recordButton, saving && styles.saveButtonDisabled]}
                  onPress={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FB923C" />
                  ) : (
                    <>
                      <Text style={styles.recordButtonIcon}>📝</Text>
                      <Text style={styles.recordButtonText}>記録する</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={() => handleSave(true)}
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
            </>
          )}
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
    padding: 16,
  },
  imageArea: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FED7AA',
    overflow: 'hidden',
    marginBottom: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recognizing: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  recognizingText: {
    fontSize: 15,
    color: '#FB923C',
    fontWeight: '500',
  },
  recognizedContainer: {
    flex: 1,
    position: 'relative',
  },
  recognizedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    alignItems: 'center',
  },
  recognizedEmoji: {
    fontSize: 48,
  },
  recognizedCheck: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  imageButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  imageButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  sparkle: {
    fontSize: 14,
  },
  resultLabel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  dishName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 13,
    color: '#6B7280',
  },
  calories: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  memberSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  memberButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  memberButton: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  memberButtonSelected: {
    borderColor: '#FB923C',
    backgroundColor: '#FFEDD5',
  },
  memberButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  reactionSection: {
    marginBottom: 24,
  },
  reactionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonSelected: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FB923C',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  saveButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  recordButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  recordButtonIcon: {
    fontSize: 16,
  },
  recordButtonText: {
    color: '#FB923C',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
