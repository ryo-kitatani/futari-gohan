export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: string;
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, name?: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  updateUser(updates: Partial<User>): Promise<User>;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  signInWithGoogle?(): Promise<User>;
  signInWithApple?(): Promise<User>;
  getToken(): Promise<string | null>;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
