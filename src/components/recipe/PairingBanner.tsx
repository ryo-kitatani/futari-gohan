import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CoupleUser } from '../../interfaces/database';

interface PairingBannerProps {
  members: CoupleUser[];
  onPress?: () => void;
}

export const PairingBanner: React.FC<PairingBannerProps> = ({ members, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.avatars}>
          {members.map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.avatar,
                index > 0 && { marginLeft: -8 },
              ]}
            >
              <Text style={styles.avatarEmoji}>{member.emoji}</Text>
            </View>
          ))}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.names}>
            {members.map((m) => m.name).join(' & ')}
          </Text>
          <Text style={styles.status}>ペアリング済み ✓</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  textContainer: {
    gap: 2,
  },
  names: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  status: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 20,
    color: '#D1D5DB',
  },
});
