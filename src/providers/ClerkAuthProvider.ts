import { useAuth, useUser } from '@clerk/clerk-expo';
import { AuthProvider, User } from '../interfaces/auth';

export class ClerkAuthProvider implements AuthProvider {
  private authCallbacks: ((user: User | null) => void)[] = [];

  async signIn(_email: string, _password: string): Promise<User> {
    throw new Error('Sign-in should be handled through Clerk components');
  }

  async signUp(_email: string, _password: string, _name?: string): Promise<User> {
    throw new Error('Sign-up should be handled through Clerk components');
  }

  async signOut(): Promise<void> {
    throw new Error('Sign-out should be handled through useAuth hook');
  }

  getCurrentUser(): User | null {
    const { ServiceProvider } = require('../services/ServiceProvider');
    return ServiceProvider.getCurrentUser();
  }

  async updateUser(_updates: Partial<User>): Promise<User> {
    throw new Error('Update user should be handled through Clerk user object');
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authCallbacks.push(callback);
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) {
        this.authCallbacks.splice(index, 1);
      }
    };
  }

  async getToken(): Promise<string | null> {
    throw new Error('Get token should be handled through useAuth hook');
  }

  static mapClerkUser(clerkUser: any): User {
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: clerkUser.fullName || clerkUser.firstName || '',
      avatar: clerkUser.profileImageUrl || undefined,
      createdAt: clerkUser.createdAt?.toISOString(),
    };
  }
}

export const useClerkAuth = () => {
  const { isLoaded, userId, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const user = clerkUser ? ClerkAuthProvider.mapClerkUser(clerkUser) : null;

  return {
    user,
    isLoading: !isLoaded,
    isAuthenticated: !!userId,
    getToken: async (options?: { template?: string }) => {
      try {
        if (!userId) {
          throw new Error('User not authenticated');
        }
        return await getToken(options);
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    },
  };
};
