import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';
import { AuthWrapper } from './src/components/auth/AuthWrapper';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthWrapper>
        <NavigationContainer>
          <TabNavigator />
          <StatusBar style="dark" backgroundColor="#F9FAFB" />
        </NavigationContainer>
      </AuthWrapper>
    </SafeAreaProvider>
  );
}
