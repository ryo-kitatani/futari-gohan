import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SignedIn, SignedOut, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { useClerkAuth } from '../../providers/ClerkAuthProvider';
import { getConfig } from '../../config/providers';
import { LoginScreen } from '../../screens/auth/LoginScreen';
import { PairingScreen } from '../../screens/auth/PairingScreen';
import { ServiceProvider } from '../../services/ServiceProvider';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthContent: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isLoading } = useClerkAuth();
  const [hasCouple, setHasCouple] = useState<boolean | null>(null);

  const initializeServices = useCallback(async () => {
    try {
      ServiceProvider.setCurrentUser(user);

      const hasUserCouple = await ServiceProvider.coupleService.hasUserJoinedCouple();
      setHasCouple(hasUserCouple);
    } catch (error) {
      console.error('Error initializing services:', error);
      setHasCouple(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      initializeServices();
    }
  }, [user?.id, initializeServices]);

  const handlePairingComplete = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await initializeServices();
  }, [initializeServices]);

  if (isLoading || (user && hasCouple === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <>
      <SignedOut>
        <LoginScreen />
      </SignedOut>

      <SignedIn>
        {hasCouple ? (
          children
        ) : (
          <PairingScreen onPairingComplete={handlePairingComplete} />
        )}
      </SignedIn>
    </>
  );
};

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const config = getConfig();

  if (!config.auth.publishableKey) {
    throw new Error('Clerk configuration is missing');
  }

  return (
    <ClerkProvider publishableKey={config.auth.publishableKey} tokenCache={tokenCache}>
      <AuthContent>{children}</AuthContent>
    </ClerkProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
});
