import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleLogo } from '../../components/GoogleLogo';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
  const googleOAuth = useOAuth({ strategy: 'oauth_google' });

  const onGooglePress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await googleOAuth.startOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert('エラー', 'Googleログインに失敗しました: ' + (err.message || ''));
    }
  }, [googleOAuth]);

  return (
    <LinearGradient
      colors={['#FFF5F0', '#FFF0F5', '#FFFFFF']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>ふたりごはん</Text>
            <Text style={styles.subtitle}>AIがふたりの食卓をサポート</Text>
          </View>

          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#FB923C', '#F472B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logo}>🍳</Text>
            </LinearGradient>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>👫</Text>
              <Text style={styles.featureText}>ふたりの好みを登録</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🤖</Text>
              <Text style={styles.featureText}>AIがレシピを提案</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>⚠️</Text>
              <Text style={styles.featureText}>アレルギーを警告</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onGooglePress} style={styles.googleButton}>
            <View style={styles.googleButtonContent}>
              <View style={{ marginRight: 12 }}>
                <GoogleLogo size={20} />
              </View>
              <Text style={styles.googleButtonText}>Googleで続ける</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.description}>
            パートナーと一緒に料理を楽しみましょう。{'\n'}
            招待コードでペアリングできます。
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FB923C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    fontSize: 60,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
    gap: 4,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 11,
    color: '#6B7280',
  },
  googleButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
