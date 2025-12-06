import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { ServiceProvider } from '../../services/ServiceProvider';

interface PairingScreenProps {
  onPairingComplete: () => void;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({ onPairingComplete }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateCouple = async () => {
    setLoading(true);
    try {
      const couple = await ServiceProvider.coupleService.createCouple();
      setGeneratedCode(couple.inviteCode);
      Alert.alert(
        'ペアリング準備完了',
        `招待コードをパートナーに共有してください`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error creating couple:', error);
      Alert.alert('エラー', 'ペアリングの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!inviteCode.trim()) return;

    setLoading(true);
    try {
      await ServiceProvider.coupleService.joinCouple(inviteCode);
      Alert.alert('ペアリング成功', 'パートナーとペアリングしました！', [
        { text: 'OK', onPress: onPairingComplete },
      ]);
    } catch (error: any) {
      console.error('Error joining couple:', error);
      Alert.alert('エラー', '招待コードが無効です');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckPartner = async () => {
    setLoading(true);
    try {
      const members = await ServiceProvider.coupleService.getCoupleMembers();
      if (members.length >= 2) {
        Alert.alert('ペアリング完了', 'パートナーが参加しました！', [
          { text: 'OK', onPress: onPairingComplete },
        ]);
      } else {
        Alert.alert('待機中', 'まだパートナーが参加していません');
      }
    } catch (error) {
      Alert.alert('エラー', '確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>👫</Text>
          <Text style={styles.title}>ペアリング</Text>
          <Text style={styles.subtitle}>
            パートナーとペアリングして{'\n'}ふたりで料理を楽しみましょう
          </Text>
        </View>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'create' && styles.activeModeButton]}
            onPress={() => setMode('create')}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'create' && styles.activeModeButtonText,
              ]}
            >
              招待する
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'join' && styles.activeModeButton]}
            onPress={() => setMode('join')}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'join' && styles.activeModeButtonText,
              ]}
            >
              参加する
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'create' ? (
          <View style={styles.form}>
            {!generatedCode ? (
              <>
                <Text style={styles.description}>
                  招待コードを発行して{'\n'}パートナーに共有しましょう
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleCreateCouple}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#FB923C', '#F472B6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>招待コードを発行</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>招待コード</Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                  <TouchableOpacity
                    style={[
                      styles.copyButton,
                      copied && styles.copiedButton,
                    ]}
                    onPress={handleCopyCode}
                  >
                    <Text style={styles.copyButtonText}>
                      {copied ? '✓' : 'コピー'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  このコードをパートナーに共有してください
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, loading && styles.disabledButton]}
                  onPress={handleCheckPartner}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FB923C" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>
                      パートナーの参加を確認
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>招待コード</Text>
            <TextInput
              style={styles.input}
              placeholder="FUTARI-XXXX"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={11}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!inviteCode.trim() || loading) && styles.disabledButton,
              ]}
              onPress={handleJoinCouple}
              disabled={!inviteCode.trim() || loading}
            >
              <LinearGradient
                colors={
                  !inviteCode.trim() || loading
                    ? ['#D1D5DB', '#D1D5DB']
                    : ['#FB923C', '#F472B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>ペアリング</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F0',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FED7AA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeModeButtonText: {
    color: '#FB923C',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: 10,
  },
  copyButton: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copiedButton: {
    backgroundColor: '#10B981',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FB923C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#FB923C',
    fontSize: 16,
    fontWeight: '600',
  },
});
