import React, { useState } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { PreferenceScreen } from '../screens/preference/PreferenceScreen';
import { CameraModal } from '../screens/camera/CameraModal';
import { UrlImportModal } from '../screens/url/UrlImportModal';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: { [key: string]: { active: string; inactive: string } } = {
    home: { active: '🏠', inactive: '🏡' },
    camera: { active: '📸', inactive: '📷' },
    url: { active: '🔗', inactive: '🔗' },
    preference: { active: '❤️', inactive: '🤍' },
  };

  const icon = icons[name];
  return (
    <Text style={{ fontSize: 22 }}>
      {focused ? icon?.active : icon?.inactive}
    </Text>
  );
};

// Placeholder screens for camera and URL tabs
const PlaceholderScreen = () => null;

export const TabNavigator: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={route.name.toLowerCase()} focused={focused} />
          ),
          tabBarActiveTintColor: '#FB923C',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8,
            height: 84,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 4,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          options={{ tabBarLabel: 'ホーム' }}
        >
          {() => (
            <HomeScreen
              onOpenCamera={() => setShowCamera(true)}
              onOpenUrl={() => setShowUrl(true)}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Camera"
          component={PlaceholderScreen}
          options={{ tabBarLabel: '写真記録' }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowCamera(true);
            },
          }}
        />
        <Tab.Screen
          name="Url"
          component={PlaceholderScreen}
          options={{ tabBarLabel: 'URL保存' }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowUrl(true);
            },
          }}
        />
        <Tab.Screen
          name="Preference"
          component={PreferenceScreen}
          options={{ tabBarLabel: '好み' }}
        />
      </Tab.Navigator>

      <CameraModal visible={showCamera} onClose={() => setShowCamera(false)} />
      <UrlImportModal visible={showUrl} onClose={() => setShowUrl(false)} />
    </>
  );
};
